import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { parseISO } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdviceCard } from '../../components/AdviceCard';
import { ScoreRing } from '../../components/ScoreRing';
import { SleepChart } from '../../components/SleepChart';
import { SleepDebtBadge } from '../../components/SleepDebtBadge';
import { WeeklyStats } from '../../components/WeeklyStats';
import { Colors } from '../../constants/colors';
import { generateAdvice, hasMoodDurationCorrelation } from '../../logic/adviceEngine';
import { calculateSleepDebt } from '../../logic/sleepDebt';
import { useSleepStore } from '../../store/useSleepStore';
import { useUserStore } from '../../store/useUserStore';
import { stdDev } from '../../utils/statsUtils';
import { toAdjustedMinutes } from '../../utils/timeUtils';

function toBedtimeText(adjustedMinutes: number | null): string {
  if (adjustedMinutes === null) return '--';
  const mins = ((adjustedMinutes % (24 * 60)) + 24 * 60) % (24 * 60);
  const hour24 = Math.floor(mins / 60);
  const minute = mins % 60;
  const suffix = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${String(h12).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${suffix}`;
}

export default function Dashboard(): React.JSX.Element {
  const sessions = useSleepStore((state) => state.sessions);
  const last7 = useSleepStore((state) => state.getLast7Days());
  const settings = useUserStore((state) => state.settings);

  const analysis = useMemo(() => {
    const durations = last7.map((session) => session.duration_min ?? 0);
    const avgDurationMin = durations.length
      ? Math.round(durations.reduce((sum, value) => sum + value, 0) / durations.length)
      : 0;

    const scores = last7
      .map((session) => session.health_score)
      .filter((score): score is number => score !== null);
    const avgScore = scores.length
      ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length)
      : 0;

    const bedtimes = last7.map((session) => toAdjustedMinutes(parseISO(session.sleep_start)));
    const consistency = Math.round(stdDev(bedtimes));
    const avgBedtime = bedtimes.length
      ? Math.round(bedtimes.reduce((sum, value) => sum + value, 0) / bedtimes.length)
      : null;

    const debt = calculateSleepDebt(last7, settings.sleep_goal_min);
    const goalHitDays = last7.filter((session) => (session.duration_min ?? 0) >= settings.sleep_goal_min)
      .length;

    const avgSleepHour = avgBedtime ? avgBedtime / 60 : 23;

    const advice = generateAdvice({
      avg_duration_min: avgDurationMin,
      goal_min: settings.sleep_goal_min,
      consistency_std_dev_min: consistency,
      avg_sleep_hour: avgSleepHour,
      sleep_debt_min: debt,
      mood_duration_correlation: hasMoodDurationCorrelation(sessions),
      goal_hit_days: goalHitDays,
    });

    return {
      avgDurationMin,
      avgScore,
      consistency,
      avgBedtime,
      debt,
      advice,
    };
  }, [last7, sessions, settings.sleep_goal_min]);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.headerRow}>
          <Text style={styles.pageTitle}>Dashboard</Text>
        </View>

        <Text style={styles.sectionTitle}>Sleep Health Score</Text>
        <View style={styles.ringWrap}>
          <ScoreRing score={analysis.avgScore} />
        </View>

        <Text style={styles.sectionTitle}>Last 7 Days</Text>
        <View style={styles.chartCard}>
          <SleepChart sessions={last7} />
        </View>

        <WeeklyStats
          avgDurationMin={analysis.avgDurationMin}
          consistencyStdDevMin={analysis.consistency}
          avgBedtimeText={toBedtimeText(analysis.avgBedtime)}
        />

        <SleepDebtBadge debtMin={analysis.debt} />

        <Text style={styles.sectionTitle}>Advice</Text>
        <View style={styles.adviceList}>
          {analysis.advice.map((item) => (
            <AdviceCard key={`${item.type}-${item.title}`} item={item} />
          ))}
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
    gap: 16,
  },
  headerRow: {
    marginBottom: 4,
  },
  pageTitle: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 8,
    marginBottom: 4,
  },
  ringWrap: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 24,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  chartCard: {
    borderRadius: 24,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  adviceList: {
    gap: 12,
  },
});
