import React, { useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/colors';
import { useUserStore } from '../store/useUserStore';
import { useSleepStore } from '../store/useSleepStore';
import { formatClockFromIso, formatDuration } from '../utils/timeUtils';

export function AlarmRingingOverlay(): React.JSX.Element {
  const ringingAlarm = useSleepStore((state) => state.ringingAlarm);
  const pendingWakeSummary = useSleepStore((state) => state.pendingWakeSummary);
  const dismissWakeAlarm = useSleepStore((state) => state.dismissWakeAlarm);
  const snoozeWakeAlarm = useSleepStore((state) => state.snoozeWakeAlarm);
  const alarmSoundMode = useUserStore((state) => state.settings.alarm_sound_mode);
  const customAlarmSoundUri = useUserStore((state) => state.settings.alarm_custom_sound_uri);

  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!ringingAlarm) return;

    void useSleepStore.getState().handleWakeAlarmTriggered({ allowAudio: true });
  }, [alarmSoundMode, customAlarmSoundUri, ringingAlarm?.triggeredAtIso]);

  const onDismiss = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await dismissWakeAlarm();
    } finally {
      setIsSubmitting(false);
    }
  };

  const onSnooze = async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await snoozeWakeAlarm(10);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={Boolean(ringingAlarm)} transparent animationType="fade" statusBarTranslucent>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.badge}>ALARM</Text>
          <Text style={styles.title}>Wake up</Text>
          <Text style={styles.subtitle}>Your alarm is actively ringing.</Text>

          {pendingWakeSummary ? (
            <View style={styles.summaryBox}>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Slept</Text>
                <Text style={styles.value}>{formatDuration(pendingWakeSummary.durationMin)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.label}>Ended at</Text>
                <Text style={styles.value}>{formatClockFromIso(pendingWakeSummary.wakeTimeIso)}</Text>
              </View>
            </View>
          ) : null}

          <View style={styles.actions}>
            <Pressable
              style={[styles.actionBtn, styles.snoozeBtn, isSubmitting && styles.disabled]}
              onPress={onSnooze}
              disabled={isSubmitting}
            >
              <Text style={styles.snoozeText}>Snooze 10 min</Text>
            </Pressable>

            <Pressable
              style={[styles.actionBtn, styles.dismissBtn, isSubmitting && styles.disabled]}
              onPress={onDismiss}
              disabled={isSubmitting}
            >
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 22,
  },
  card: {
    width: '100%',
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#7A2130',
    backgroundColor: '#2A0E14',
    padding: 20,
    gap: 12,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    backgroundColor: '#E84A5F',
    color: '#21090D',
    fontWeight: '900',
    letterSpacing: 1,
    fontSize: 11,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 34,
    fontWeight: '900',
  },
  subtitle: {
    color: '#F4C8CE',
    fontSize: 15,
  },
  summaryBox: {
    marginTop: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#6F2432',
    backgroundColor: '#331019',
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  label: {
    color: '#E3B7BF',
    fontSize: 14,
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  actions: {
    marginTop: 6,
    gap: 10,
  },
  actionBtn: {
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
  },
  snoozeBtn: {
    borderWidth: 1,
    borderColor: '#B86774',
    backgroundColor: '#452029',
  },
  dismissBtn: {
    backgroundColor: '#E84A5F',
  },
  snoozeText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  dismissText: {
    color: '#21090D',
    fontWeight: '900',
    fontSize: 16,
  },
  disabled: {
    opacity: 0.6,
  },
});
