import React, { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { cancelWakeAlarm, requestAlarmPermission, scheduleWakeAlarm } from '../../alarm/alarmManager';
import { Colors } from '../../constants/colors';
import {
  areNotificationsSupported,
  cancelAllScheduledNotifications,
  requestNotificationPermission,
  scheduleAdaptiveBedtimeReminder,
} from '../../notifications/notificationManager';
import { useSleepStore } from '../../store/useSleepStore';
import { useUserStore } from '../../store/useUserStore';

function isValidHHMM(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export default function Settings(): React.JSX.Element {
  const settings = useUserStore((state) => state.settings);
  const updateSettings = useUserStore((state) => state.updateSettings);
  const resetSettings = useUserStore((state) => state.resetSettings);

  const clearAllData = useSleepStore((state) => state.clearAllData);
  const activeSession = useSleepStore((state) => state.activeSession);
  const sessions = useSleepStore((state) => state.getLast7Days());

  const [name, setName] = useState(settings.name);
  const [goalMin, setGoalMin] = useState(settings.sleep_goal_min);
  const [bedtime, setBedtime] = useState(settings.target_bedtime);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notifications_enabled);
  const [alarmTime, setAlarmTime] = useState(settings.alarm_time);
  const [alarmEnabled, setAlarmEnabled] = useState(settings.alarm_enabled);

  useEffect(() => {
    setName(settings.name);
    setGoalMin(settings.sleep_goal_min);
    setBedtime(settings.target_bedtime);
    setNotificationsEnabled(settings.notifications_enabled);
    setAlarmTime(settings.alarm_time);
    setAlarmEnabled(settings.alarm_enabled);
  }, [settings]);

  const onSave = async (): Promise<void> => {
    if (!isValidHHMM(bedtime) || !isValidHHMM(alarmTime)) {
      Alert.alert('Invalid time', 'Use HH:mm format, for example 22:30.');
      return;
    }

    let finalNotifications = notificationsEnabled;
    if (notificationsEnabled) {
      if (!areNotificationsSupported()) {
        finalNotifications = false;
        Alert.alert(
          'Notifications unavailable in Expo Go',
          'Use a development build to enable reminder notifications.',
        );
      } else {
        const granted = await requestNotificationPermission();
        finalNotifications = granted;
        if (!granted) {
          Alert.alert('Permission denied', 'Notifications stay disabled until permission is granted.');
        }
      }
    }

    let finalAlarmEnabled = alarmEnabled;
    if (alarmEnabled) {
      const granted = await requestAlarmPermission();
      finalAlarmEnabled = granted;
      if (!granted) {
        Alert.alert('Permission denied', 'Wake alarm is disabled until notification permission is granted.');
      }
    }

    await updateSettings({
      name: name.trim() || 'Friend',
      sleep_goal_min: goalMin,
      target_bedtime: bedtime,
      notifications_enabled: finalNotifications,
      alarm_time: alarmTime,
      alarm_enabled: finalAlarmEnabled,
    });

    if (finalNotifications) {
      await scheduleAdaptiveBedtimeReminder(
        sessions.map((session) => new Date(session.sleep_start)),
        bedtime,
      );
    } else {
      await cancelAllScheduledNotifications();
    }

    if (activeSession) {
      if (finalAlarmEnabled) {
        await scheduleWakeAlarm(alarmTime);
      } else {
        await cancelWakeAlarm();
      }
    }

    Alert.alert('Saved', 'Settings updated successfully.');
  };

  const onClearData = (): void => {
    Alert.alert('Clear all data?', 'This will remove all sleep sessions and reset onboarding.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: async () => {
          await clearAllData();
          await resetSettings();
          await cancelAllScheduledNotifications();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Text style={styles.heading}>Settings</Text>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>PROFILE</Text>
          <View style={styles.cardGroup}>
            <View style={styles.row}>
              <Text style={styles.label}>Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                style={styles.input}
                placeholder="Your name"
                placeholderTextColor={Colors.textMuted}
                returnKeyType="done"
              />
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionHeader}>SLEEP GOALS</Text>
          <View style={styles.cardGroup}>
            <View style={[styles.row, styles.bottomBorder]}>
              <Text style={styles.label}>Sleep Goal</Text>
              <View style={styles.goalRow}>
                <Pressable
                  style={styles.goalButton}
                  onPress={() => setGoalMin((v) => Math.max(300, v - 30))}
                >
                  <Text style={styles.goalButtonText}>-30m</Text>
                </Pressable>
                <Text style={styles.goalValue}>{goalMin} min</Text>
                <Pressable
                  style={styles.goalButton}
                  onPress={() => setGoalMin((v) => Math.min(600, v + 30))}
                >
                  <Text style={styles.goalButtonText}>+30m</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.row, styles.bottomBorder]}>
              <Text style={styles.label}>Bedtime</Text>
              <TextInput
                value={bedtime}
                onChangeText={setBedtime}
                style={styles.input}
                placeholder="22:30"
                placeholderTextColor={Colors.textMuted}
                keyboardType="numbers-and-punctuation"
                returnKeyType="done"
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Notifications</Text>
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textPrimary}
              />
            </View>
          </View>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.saveButton, pressed && { opacity: 0.85 }]} 
          onPress={onSave}
        >
          <Text style={styles.saveText}>Save Settings</Text>
        </Pressable>

        <View style={styles.dangerSection}>
          <Text style={styles.sectionHeader}>DANGER ZONE</Text>
          <Pressable 
            style={({ pressed }) => [styles.clearButton, pressed && { opacity: 0.85 }]} 
            onPress={onClearData}
          >
            <Text style={styles.clearText}>Clear All Data</Text>
          </Pressable>
        </View>

          <View style={styles.section}>
            <Text style={styles.sectionHeader}>WAKE ALARM</Text>
            <View style={styles.cardGroup}>
              <View style={[styles.row, styles.bottomBorder]}>
                <Text style={styles.label}>Alarm Time</Text>
                <TextInput
                  value={alarmTime}
                  onChangeText={setAlarmTime}
                  style={styles.input}
                  placeholder="06:30"
                  placeholderTextColor={Colors.textMuted}
                  keyboardType="numbers-and-punctuation"
                  returnKeyType="done"
                />
              </View>

              <View style={styles.row}>
                <Text style={styles.label}>Enable Wake Alarm</Text>
                <Switch
                  value={alarmEnabled}
                  onValueChange={setAlarmEnabled}
                  trackColor={{ false: Colors.border, true: Colors.primary }}
                  thumbColor={Colors.textPrimary}
                />
              </View>
            </View>
          </View>

        <Text style={styles.version}>App Version 1.0.0</Text>
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
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '800',
    marginBottom: 20,
    letterSpacing: 0.3,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
    marginLeft: 12,
    letterSpacing: 1,
  },
  cardGroup: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  bottomBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  label: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 80,
    paddingVertical: 4,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  goalButton: {
    borderRadius: 8,
    backgroundColor: Colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  goalButtonText: {
    color: Colors.primaryLight,
    fontWeight: '700',
  },
  goalValue: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 16,
    minWidth: 56,
    textAlign: 'center',
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
  },
  saveText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 17,
  },
  dangerSection: {
    marginTop: 10,
    marginBottom: 20,
  },
  clearButton: {
    backgroundColor: '#3A1F25',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#5C2832',
    paddingVertical: 16,
    alignItems: 'center',
  },
  clearText: {
    color: '#FF9AA5',
    fontWeight: '700',
    fontSize: 16,
  },
  version: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
    marginTop: 20,
  },
});
