import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { differenceInMinutes, format } from 'date-fns';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import { MoodPicker } from '../../components/MoodPicker';
import { SleepButton } from '../../components/SleepButton';
import { SleepDebtBadge } from '../../components/SleepDebtBadge';
import { calculateSleepDebt } from '../../logic/sleepDebt';
import { useSleepStore } from '../../store/useSleepStore';
import { useUserStore } from '../../store/useUserStore';
import { formatClockFromIso, formatDuration } from '../../utils/timeUtils';

function calcGoalStreak(durations: Array<number | null>, goalMin: number): number {
  let streak = 0;
  for (let i = durations.length - 1; i >= 0; i -= 1) {
    const d = durations[i] ?? 0;
    if (d >= goalMin) {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}

export default function Home(): React.JSX.Element {
  const {
    sessions,
    activeSession,
    startSleep,
    endSleep,
    getLast7Days,
    recoverStaleSession,
    discardActiveSession,
  } = useSleepStore((state) => state);
  const settings = useUserStore((state) => state.settings);

  const [elapsed, setElapsed] = useState(0);
  const [wakeModalVisible, setWakeModalVisible] = useState(false);
  const [mood, setMood] = useState<1 | 2 | 3 | 4 | 5 | null>(null);
  const [notes, setNotes] = useState('');

  const completed = useMemo(
    () => sessions.filter((session) => session.wake_time !== null),
    [sessions],
  );
  const last7 = useMemo(() => getLast7Days(), [getLast7Days, sessions]);

  const debtMin = useMemo(
    () => calculateSleepDebt(last7, settings.sleep_goal_min),
    [last7, settings.sleep_goal_min],
  );

  const lastNight = completed.length ? completed[completed.length - 1] : null;
  const avgLast7 = last7.length
    ? Math.round(
        last7.reduce((sum, session) => sum + (session.duration_min ?? 0), 0) / last7.length,
      )
    : 0;

  const streak = calcGoalStreak(
    completed.map((session) => session.duration_min),
    settings.sleep_goal_min,
  );

  useEffect(() => {
    if (!activeSession) {
      setElapsed(0);
      return;
    }

    const update = (): void => {
      const minutes = differenceInMinutes(new Date(), new Date(activeSession.sleep_start));
      setElapsed(Math.max(0, minutes));
    };

    update();
    const timer = setInterval(update, 1000);

    return () => clearInterval(timer);
  }, [activeSession]);

  useEffect(() => {
    const checkStale = async (): Promise<void> => {
      const stale = await recoverStaleSession();
      if (!stale) return;

      Alert.alert(
        'Stale active session found',
        `Did you sleep from ${formatClockFromIso(stale.sleep_start)} until now?`,
        [
          {
            text: 'Yes, log it',
            onPress: async () => {
              await endSleep({ mood: null, notes: 'Recovered stale session' });
            },
          },
          {
            text: 'Discard',
            style: 'destructive',
            onPress: async () => {
              await discardActiveSession();
            },
          },
          { text: 'Keep open', style: 'cancel' },
        ],
      );
    };

    void checkStale();
  }, [discardActiveSession, endSleep, recoverStaleSession]);

  const handlePrimaryAction = async (): Promise<void> => {
    if (!activeSession) {
      await startSleep();
      return;
    }

    setWakeModalVisible(true);
  };

  const submitWake = async (): Promise<void> => {
    const updated = await endSleep({ mood, notes: notes.trim() || null });
    setWakeModalVisible(false);
    setMood(null);
    setNotes('');

    if (updated) {
      Alert.alert('Good morning', `You slept for ${formatDuration(updated.duration_min ?? 0)}.`);
    }
  };

  const remainingForGoal = Math.max(0, settings.sleep_goal_min - elapsed);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.greet}>Good {format(new Date(), 'aaaa')}, {settings.name}</Text>
          <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>
        </View>

        <SleepDebtBadge debtMin={debtMin} />

        <View style={styles.mainButtonWrap}>
          <SleepButton
            mode={activeSession ? 'wake' : 'sleep'}
            elapsedMinutes={elapsed}
            onPress={handlePrimaryAction}
          />
        </View>

        {activeSession ? (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <Text style={styles.panelTitle}>Currently sleeping</Text>
              <View style={styles.activeDot} />
            </View>
            <View style={styles.panelContent}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Started at</Text>
                <Text style={styles.statValue}>{formatClockFromIso(activeSession.sleep_start)}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>{formatDuration(elapsed)}</Text>
              </View>
            </View>
            <View style={styles.tipWrap}>
              <Text style={styles.tip}>You need {formatDuration(remainingForGoal)} more for your goal.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Last Night</Text>
            <View style={styles.panelContent}>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Duration</Text>
                <Text style={styles.statValue}>
                  {lastNight ? formatDuration(lastNight.duration_min ?? 0) : '--'}
                </Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Health Score</Text>
                <Text style={styles.statValue}>
                  {lastNight?.health_score ? `${lastNight.health_score}/100` : '--'}
                </Text>
              </View>
            </View>
            <View style={styles.footerWrap}>
              <Text style={styles.footerText}>Avg (7d): {formatDuration(avgLast7)}  •  Streak: {streak}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      <Modal visible={wakeModalVisible} transparent animationType="slide" onRequestClose={() => setWakeModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Good morning</Text>
            <Text style={styles.modalSubtitle}>How do you feel?</Text>
            <MoodPicker value={mood} onChange={setMood} />

            <TextInput
              value={notes}
              onChangeText={setNotes}
              placeholder="Add a note (optional)"
              placeholderTextColor={Colors.textMuted}
              style={styles.noteInput}
              multiline
            />

            <Pressable style={styles.doneBtn} onPress={submitWake}>
              <Text style={styles.doneBtnText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  header: {
    marginBottom: 4,
  },
  greet: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  date: {
    color: Colors.textSecondary,
    fontSize: 16,
    marginTop: 4,
    fontWeight: '500',
  },
  mainButtonWrap: {
    marginVertical: 12,
  },
  panel: {
    borderRadius: 20,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 5,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  activeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.accent,
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  panelContent: {
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  statLabel: {
    color: Colors.textSecondary,
    fontSize: 15,
  },
  statValue: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
  },
  tipWrap: {
    marginTop: 16,
    backgroundColor: Colors.moonGlow,
    padding: 12,
    borderRadius: 12,
  },
  tip: {
    color: Colors.primaryLight,
    textAlign: 'center',
    fontWeight: '600',
    fontSize: 14,
  },
  footerWrap: {
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    alignItems: 'center',
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '500',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
  },
  modalSubtitle: {
    color: Colors.textSecondary,
  },
  noteInput: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    color: Colors.textPrimary,
    minHeight: 80,
    padding: 10,
    textAlignVertical: 'top',
    backgroundColor: Colors.surfaceAlt,
  },
  doneBtn: {
    marginTop: 6,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 12,
  },
  doneBtnText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
});
