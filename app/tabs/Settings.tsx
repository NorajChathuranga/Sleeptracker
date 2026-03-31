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
  const sessions = useSleepStore((state) => state.getLast7Days());

  const [name, setName] = useState(settings.name);
  const [goalMin, setGoalMin] = useState(settings.sleep_goal_min);
  const [bedtime, setBedtime] = useState(settings.target_bedtime);
  const [notificationsEnabled, setNotificationsEnabled] = useState(settings.notifications_enabled);

  useEffect(() => {
    setName(settings.name);
    setGoalMin(settings.sleep_goal_min);
    setBedtime(settings.target_bedtime);
    setNotificationsEnabled(settings.notifications_enabled);
  }, [settings]);

  const onSave = async (): Promise<void> => {
    if (!isValidHHMM(bedtime)) {
      Alert.alert('Invalid bedtime', 'Use HH:mm format, for example 22:30.');
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

    await updateSettings({
      name: name.trim() || 'Friend',
      sleep_goal_min: goalMin,
      target_bedtime: bedtime,
      notifications_enabled: finalNotifications,
    });

    if (finalNotifications) {
      await scheduleAdaptiveBedtimeReminder(
        sessions.map((session) => new Date(session.sleep_start)),
        bedtime,
      );
    } else {
      await cancelAllScheduledNotifications();
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

        <View style={styles.card}>
          <Text style={styles.label}>Name</Text>
          <TextInput
            value={name}
            onChangeText={setName}
            style={styles.input}
            placeholder="Your name"
            placeholderTextColor={Colors.textMuted}
          />

          <Text style={styles.label}>Sleep Goal (minutes)</Text>
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

          <Text style={styles.label}>Target Bedtime (HH:mm)</Text>
          <TextInput
            value={bedtime}
            onChangeText={setBedtime}
            style={styles.input}
            placeholder="22:30"
            placeholderTextColor={Colors.textMuted}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>Notifications</Text>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: Colors.surfaceAlt, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          </View>

          <Pressable style={styles.saveButton} onPress={onSave}>
            <Text style={styles.saveText}>Save Settings</Text>
          </Pressable>
        </View>

        <View style={styles.card}>
          <Pressable style={styles.clearButton} onPress={onClearData}>
            <Text style={styles.clearText}>Clear All Data</Text>
          </Pressable>
          <Text style={styles.version}>App Version 1.0.0</Text>
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
    gap: 14,
  },
  heading: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  card: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 10,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    color: Colors.textPrimary,
    paddingHorizontal: 10,
    paddingVertical: 9,
  },
  goalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  goalButton: {
    borderRadius: 10,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  goalButtonText: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  goalValue: {
    color: Colors.primaryLight,
    fontWeight: '700',
    fontSize: 16,
  },
  switchRow: {
    marginTop: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchText: {
    color: Colors.textSecondary,
  },
  saveButton: {
    marginTop: 8,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    paddingVertical: 12,
  },
  saveText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
  clearButton: {
    borderRadius: 12,
    backgroundColor: '#3A1F25',
    borderWidth: 1,
    borderColor: '#5C2832',
    alignItems: 'center',
    paddingVertical: 12,
  },
  clearText: {
    color: '#FF9AA5',
    fontWeight: '700',
  },
  version: {
    color: Colors.textMuted,
    textAlign: 'center',
    fontSize: 12,
  },
});
