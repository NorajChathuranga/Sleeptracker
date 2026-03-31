import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { LineChart } from 'react-native-gifted-charts';
import { format, parseISO } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import { buildWeeklySummary, getWeekSessions } from '../../logic/consistencyAnalyzer';
import { SleepSession } from '../../types';
import { useSleepStore } from '../../store/useSleepStore';
import { useUserStore } from '../../store/useUserStore';
import { formatDuration, toAdjustedMinutes } from '../../utils/timeUtils';

function toClockFromAdjusted(adjustedMinutes: number | null): string {
  if (adjustedMinutes === null) return '--';
  const normalized = ((adjustedMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
}

function avgScore(sessions: SleepSession[]): number {
  const scores = sessions
    .map((session) => session.health_score)
    .filter((score): score is number => score !== null);
  if (!scores.length) return 0;
  return Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length);
}

export default function Report(): React.JSX.Element {
  const [weekOffset, setWeekOffset] = useState(0);
  const sessions = useSleepStore((state) => state.sessions);
  const goalMin = useUserStore((state) => state.settings.sleep_goal_min);

  const summary = useMemo(
    () => buildWeeklySummary(sessions, goalMin, weekOffset),
    [goalMin, sessions, weekOffset],
  );

  const weekSessions = useMemo(
    () => getWeekSessions(sessions, weekOffset).sort((a, b) => a.date.localeCompare(b.date)),
    [sessions, weekOffset],
  );

  const previousWeek = useMemo(() => getWeekSessions(sessions, weekOffset - 1), [sessions, weekOffset]);
  const wowDelta = avgScore(weekSessions) - avgScore(previousWeek);

  const lineData = weekSessions.map((session) => ({
    value: Number((toAdjustedMinutes(parseISO(session.sleep_start)) / 60).toFixed(2)),
    label: format(parseISO(session.date), 'EEE'),
  }));

  const targetWeekMin = goalMin * 7;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.navRow}>
          <Pressable style={styles.navBtn} onPress={() => setWeekOffset((v) => v - 1)}>
            <Text style={styles.navText}>{'< Prev'}</Text>
          </Pressable>
          <Text style={styles.weekLabel}>Week of {summary.weekLabel}</Text>
          <Pressable
            style={styles.navBtn}
            onPress={() => setWeekOffset((v) => Math.min(0, v + 1))}
            disabled={weekOffset === 0}
          >
            <Text style={[styles.navText, weekOffset === 0 && styles.disabled]}>Next {'>'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <Text style={styles.item}>Average sleep: {formatDuration(summary.avgDurationMin)}</Text>
          <Text style={styles.item}>
            Best night:{' '}
            {summary.bestNight
              ? `${summary.bestNight.date} - ${formatDuration(summary.bestNight.duration_min ?? 0)}`
              : '--'}
          </Text>
          <Text style={styles.item}>
            Worst night:{' '}
            {summary.worstNight
              ? `${summary.worstNight.date} - ${formatDuration(summary.worstNight.duration_min ?? 0)}`
              : '--'}
          </Text>
          <Text style={styles.item}>Goal hit: {summary.goalHitDays} / 7 nights</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consistency Chart</Text>
          {lineData.length ? (
            <LineChart
              data={lineData}
              color={Colors.primary}
              thickness={3}
              startFillColor={Colors.moonGlow}
              endFillColor="transparent"
              startOpacity={0.3}
              endOpacity={0}
              areaChart
              hideRules
              yAxisColor={Colors.border}
              xAxisColor={Colors.border}
            />
          ) : (
            <Text style={styles.item}>No sessions for this week yet.</Text>
          )}
          <Text style={styles.item}>Avg bedtime: {toClockFromAdjusted(summary.avgBedtimeMinutes)}</Text>
          <Text style={styles.item}>Variation: +/-{summary.consistencyStdDevMin}m</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sleep Debt Status</Text>
          <Text style={styles.item}>Target: {formatDuration(targetWeekMin)}</Text>
          <Text style={styles.item}>Got: {formatDuration(summary.totalSleepMin)}</Text>
          <Text style={styles.item}>Debt: {formatDuration(summary.sleepDebtMin)}</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Mood Correlation</Text>
          <Text style={styles.item}>
            Nights 7h+: {summary.moodAvgLongSleep ? `${summary.moodAvgLongSleep}/5` : 'not enough data'}
          </Text>
          <Text style={styles.item}>
            Nights under 6h:{' '}
            {summary.moodAvgShortSleep ? `${summary.moodAvgShortSleep}/5` : 'not enough data'}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Week-over-Week</Text>
          <Text style={styles.item}>Score delta: {wowDelta >= 0 ? `+${wowDelta}` : wowDelta}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  weekLabel: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  navBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  navText: {
    color: Colors.primaryLight,
    fontWeight: '600',
  },
  disabled: {
    opacity: 0.35,
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 4,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  item: {
    color: Colors.textSecondary,
  },
});
