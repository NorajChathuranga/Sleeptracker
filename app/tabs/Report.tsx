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
        <View style={styles.headerContainer}>
          <Text style={styles.heading}>Weekly Report</Text>
        </View>

        <View style={styles.navRow}>
          <Pressable 
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }]} 
            onPress={() => setWeekOffset((v) => v - 1)}
          >
            <Text style={styles.navText}>{'< Previous'}</Text>
          </Pressable>
          <View style={styles.weekBadge}>
            <Text style={styles.weekLabel}>{summary.weekLabel}</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.navBtn, pressed && { opacity: 0.6 }, weekOffset === 0 && styles.navBtnDisabled]}
            onPress={() => setWeekOffset((v) => Math.min(0, v + 1))}
            disabled={weekOffset === 0}
          >
            <Text style={[styles.navText, weekOffset === 0 && styles.disabled]}>{'Next >'}</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Summary</Text>
          <View style={styles.statList}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Average sleep</Text>
              <Text style={styles.statValue}>{formatDuration(summary.avgDurationMin)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Best night</Text>
              <Text style={styles.statValue}>
                {summary.bestNight
                  ? `${summary.bestNight.date} (${formatDuration(summary.bestNight.duration_min ?? 0)})`
                  : '--'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Worst night</Text>
              <Text style={styles.statValue}>
                {summary.worstNight
                  ? `${summary.worstNight.date} (${formatDuration(summary.worstNight.duration_min ?? 0)})`
                  : '--'}
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Target hit</Text>
              <Text style={styles.statValue}>{summary.goalHitDays} / 7 days</Text>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>Consistency Chart</Text>
          <View style={styles.chartContainer}>
            {lineData.length ? (
              <LineChart
                data={lineData}
                color={Colors.primary}
                thickness={4}
                startFillColor={Colors.primary}
                endFillColor={Colors.background}
                startOpacity={0.4}
                endOpacity={0.05}
                areaChart
                hideRules
                yAxisColor={Colors.border}
                xAxisColor={Colors.border}
                yAxisTextStyle={{ color: Colors.textMuted, fontSize: 11 }}
                xAxisLabelTextStyle={{ color: Colors.textMuted, fontSize: 11 }}
                spacing={45}
                initialSpacing={15}
                yAxisLabelSuffix="h"
              />
            ) : (
              <View style={styles.emptyChart}>
                <Text style={styles.emptyChartText}>No records this week</Text>
              </View>
            )}
          </View>
          <View style={styles.statList}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Avg bedtime</Text>
              <Text style={styles.statValue}>{toClockFromAdjusted(summary.avgBedtimeMinutes)}</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>Variation</Text>
              <Text style={styles.statValue}>±{summary.consistencyStdDevMin}m</Text>
            </View>
          </View>
        </View>

        <View style={styles.cardRow}>
          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardTitleSmall}>Sleep Debt</Text>
            <Text style={styles.highlightValue}>{formatDuration(summary.sleepDebtMin)}</Text>
            <Text style={styles.subLabel}>Target: {formatDuration(targetWeekMin)}</Text>
          </View>

          <View style={[styles.card, styles.halfCard]}>
            <Text style={styles.cardTitleSmall}>Delta</Text>
            <Text style={[
              styles.highlightValue, 
              wowDelta > 0 ? { color: '#4ADE80' } : wowDelta < 0 ? { color: '#F87171' } : {}
            ]}>
              {wowDelta > 0 ? `+${wowDelta}%` : wowDelta < 0 ? `${wowDelta}%` : '--'}
            </Text>
            <Text style={styles.subLabel}>Vs last week</Text>
          </View>
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
    padding: 20,
    paddingBottom: 40,
    gap: 16,
  },
  headerContainer: {
    marginBottom: 4,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 8,
  },
  weekBadge: {
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  weekLabel: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  navBtn: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  navBtnDisabled: {
    opacity: 1,
  },
  navText: {
    color: Colors.primaryLight,
    fontWeight: '700',
    fontSize: 15,
  },
  disabled: {
    color: Colors.textMuted,
  },
  card: {
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 3,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 16,
  },
  halfCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  cardTitle: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 16,
    letterSpacing: 0.3,
  },
  cardTitleSmall: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  chartContainer: {
    height: 180,
    marginBottom: 20,
    marginLeft: -10,
    justifyContent: 'center',
  },
  emptyChart: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
    borderRadius: 16,
    marginLeft: 10,
  },
  emptyChartText: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  statList: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 15,
    fontWeight: '500',
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
  },
  highlightValue: {
    color: Colors.primaryLight,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 4,
  },
  subLabel: {
    color: Colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
  },
});
