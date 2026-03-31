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
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
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
import type { AlarmSoundMode } from '../../types';

function isValidHHMM(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

function extractFileExtension(value: string): string {
  const clean = value.split('?')[0] ?? value;
  const lastDot = clean.lastIndexOf('.');
  if (lastDot < 0) return '.mp3';
  return clean.slice(lastDot);
}

function getReadableSoundName(name: string | null, uri: string | null): string {
  if (name && name.trim().length > 0) return name;
  if (!uri) return 'No file selected';

  const clean = uri.split('?')[0] ?? uri;
  const parts = clean.split('/').filter(Boolean);
  return parts[parts.length - 1] ?? 'Custom sound';
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
  const [alarmSoundMode, setAlarmSoundMode] = useState<AlarmSoundMode>(settings.alarm_sound_mode);
  const [customAlarmSoundUri, setCustomAlarmSoundUri] = useState<string | null>(
    settings.alarm_custom_sound_uri,
  );
  const [customAlarmSoundName, setCustomAlarmSoundName] = useState<string | null>(
    settings.alarm_custom_sound_name,
  );
  const [isPickingSound, setIsPickingSound] = useState(false);

  useEffect(() => {
    setName(settings.name);
    setGoalMin(settings.sleep_goal_min);
    setBedtime(settings.target_bedtime);
    setNotificationsEnabled(settings.notifications_enabled);
    setAlarmTime(settings.alarm_time);
    setAlarmEnabled(settings.alarm_enabled);
    setAlarmSoundMode(settings.alarm_sound_mode);
    setCustomAlarmSoundUri(settings.alarm_custom_sound_uri);
    setCustomAlarmSoundName(settings.alarm_custom_sound_name);
  }, [settings]);

  const onPickCustomSound = async (): Promise<void> => {
    setIsPickingSound(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets?.length) return;

      const picked = result.assets[0];
      const baseDir = FileSystem.documentDirectory;
      if (!baseDir) {
        Alert.alert('Storage unavailable', 'Unable to access app storage for custom sounds.');
        return;
      }

      const extension = extractFileExtension(picked.name || picked.uri);
      const targetUri = `${baseDir}alarm-custom-tone${extension}`;

      const existing = await FileSystem.getInfoAsync(targetUri);
      if (existing.exists) {
        await FileSystem.deleteAsync(targetUri, { idempotent: true });
      }

      await FileSystem.copyAsync({ from: picked.uri, to: targetUri });

      setAlarmSoundMode('custom');
      setCustomAlarmSoundUri(targetUri);
      setCustomAlarmSoundName(picked.name || null);
    } catch {
      Alert.alert('Could not add sound', 'Please try a different audio file.');
    } finally {
      setIsPickingSound(false);
    }
  };

  const onClearCustomSound = async (): Promise<void> => {
    if (customAlarmSoundUri) {
      try {
        await FileSystem.deleteAsync(customAlarmSoundUri, { idempotent: true });
      } catch {
        // Ignore cleanup errors and continue with settings reset.
      }
    }

    setCustomAlarmSoundUri(null);
    setCustomAlarmSoundName(null);
    setAlarmSoundMode('system');
  };

  const onSave = async (): Promise<void> => {
    if (!isValidHHMM(bedtime) || !isValidHHMM(alarmTime)) {
      Alert.alert('Invalid time', 'Use HH:mm format, for example 22:30.');
      return;
    }

    if (alarmSoundMode === 'custom' && !customAlarmSoundUri) {
      Alert.alert('Custom sound required', 'Pick an audio file for your custom alarm sound.');
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
      alarm_sound_mode: alarmSoundMode,
      alarm_custom_sound_uri: customAlarmSoundUri,
      alarm_custom_sound_name: customAlarmSoundName,
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

            <View style={[styles.soundModeContainer, styles.bottomBorder]}>
              <Text style={styles.label}>Alarm Tone</Text>
              <View style={styles.soundModeRow}>
                <Pressable
                  style={[
                    styles.soundModeButton,
                    alarmSoundMode === 'system' && styles.soundModeButtonActive,
                  ]}
                  onPress={() => setAlarmSoundMode('system')}
                >
                  <Text
                    style={[
                      styles.soundModeText,
                      alarmSoundMode === 'system' && styles.soundModeTextActive,
                    ]}
                  >
                    Phone Default
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.soundModeButton,
                    alarmSoundMode === 'custom' && styles.soundModeButtonActive,
                  ]}
                  onPress={() => setAlarmSoundMode('custom')}
                >
                  <Text
                    style={[
                      styles.soundModeText,
                      alarmSoundMode === 'custom' && styles.soundModeTextActive,
                    ]}
                  >
                    Custom
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.customSoundRow, styles.bottomBorder]}>
              <View style={styles.customSoundMeta}>
                <Text style={styles.customSoundLabel}>Selected</Text>
                <Text style={styles.customSoundName} numberOfLines={1}>
                  {getReadableSoundName(customAlarmSoundName, customAlarmSoundUri)}
                </Text>
              </View>
              <Pressable
                style={[styles.smallActionButton, isPickingSound && styles.disabledButton]}
                onPress={onPickCustomSound}
                disabled={isPickingSound}
              >
                <Text style={styles.smallActionButtonText}>{isPickingSound ? 'Adding...' : 'Choose'}</Text>
              </Pressable>
            </View>

            <View style={[styles.row, styles.bottomBorder]}>
              <Text style={styles.label}>Enable Wake Alarm</Text>
              <Switch
                value={alarmEnabled}
                onValueChange={setAlarmEnabled}
                trackColor={{ false: Colors.border, true: Colors.primary }}
                thumbColor={Colors.textPrimary}
              />
            </View>

            <View style={styles.row}>
              <Text style={styles.label}>Remove Custom Tone</Text>
              <Pressable
                style={[
                  styles.smallActionButton,
                  !customAlarmSoundUri && styles.disabledButton,
                ]}
                onPress={onClearCustomSound}
                disabled={!customAlarmSoundUri}
              >
                <Text style={styles.smallActionButtonText}>Clear</Text>
              </Pressable>
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
  soundModeContainer: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  soundModeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  soundModeButton: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surfaceAlt,
    paddingVertical: 8,
    alignItems: 'center',
  },
  soundModeButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: '#223A54',
  },
  soundModeText: {
    color: Colors.textMuted,
    fontWeight: '600',
  },
  soundModeTextActive: {
    color: Colors.textPrimary,
  },
  customSoundRow: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  customSoundMeta: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  customSoundLabel: {
    color: Colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  customSoundName: {
    color: Colors.textPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
  smallActionButton: {
    borderRadius: 9,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  smallActionButtonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  disabledButton: {
    opacity: 0.5,
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
