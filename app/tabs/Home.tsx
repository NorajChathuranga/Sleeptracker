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
        <Text style={styles.greet}>Good {format(new Date(), 'aaaa')}, {settings.name}</Text>
        <Text style={styles.date}>{format(new Date(), 'EEEE, MMMM d')}</Text>

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
            <Text style={styles.panelTitle}>Currently sleeping</Text>
            <Text style={styles.panelBody}>Started: {formatClockFromIso(activeSession.sleep_start)}</Text>
            <Text style={styles.panelBody}>Duration so far: {formatDuration(elapsed)}</Text>
            <Text style={styles.tip}>You need {formatDuration(remainingForGoal)} more for your goal.</Text>
          </View>
        ) : (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Last Night</Text>
            <Text style={styles.panelBody}>
              {lastNight
                ? `${formatDuration(lastNight.duration_min ?? 0)} · Score ${lastNight.health_score ?? '--'}`
                : 'No session recorded yet.'}
            </Text>
            <Text style={styles.panelBody}>Avg (7d): {formatDuration(avgLast7)} · Streak: {streak}</Text>
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
    padding: 16,
    gap: 14,
  },
  greet: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  date: {
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  mainButtonWrap: {
    marginTop: 8,
  },
  panel: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 4,
  },
  panelTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  panelBody: {
    color: Colors.textSecondary,
  },
  tip: {
    color: Colors.primaryLight,
    marginTop: 6,
    fontWeight: '600',
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
