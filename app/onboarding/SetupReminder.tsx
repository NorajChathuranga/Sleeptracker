import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  Pressable,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';
import {
  areNotificationsSupported,
  requestNotificationPermission,
  scheduleAdaptiveBedtimeReminder,
} from '../../notifications/notificationManager';
import { useUserStore } from '../../store/useUserStore';

type Props = {
  route: {
    params?: {
      goalMin?: number;
      name?: string;
    };
  };
};

function isValidHHMM(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return false;
  const h = Number(match[1]);
  const m = Number(match[2]);
  return h >= 0 && h <= 23 && m >= 0 && m <= 59;
}

export default function SetupReminder({ route }: Props): React.JSX.Element {
  const params = route.params ?? {};
  const [targetBedtime, setTargetBedtime] = useState('22:30');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const completeOnboarding = useUserStore((state) => state.completeOnboarding);

  const handleFinish = async (): Promise<void> => {
    if (!isValidHHMM(targetBedtime)) {
      Alert.alert('Invalid time', 'Please use HH:mm format, for example 22:30.');
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
          Alert.alert('Permission needed', 'Notifications were not enabled because permission was denied.');
        }
      }
      setNotificationsEnabled(finalNotifications);
    }

    await completeOnboarding({
      name: params.name,
      sleep_goal_min: params.goalMin ?? 8 * 60,
      target_bedtime: targetBedtime,
      notifications_enabled: finalNotifications,
    });

    if (finalNotifications) {
      await scheduleAdaptiveBedtimeReminder([], targetBedtime);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>What time do you want to be in bed by?</Text>

        <TextInput
          value={targetBedtime}
          onChangeText={setTargetBedtime}
          placeholder="22:30"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
          keyboardType="numbers-and-punctuation"
        />

        <View style={styles.switchRow}>
          <Text style={styles.switchLabel}>Enable sleep reminder notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={setNotificationsEnabled}
            trackColor={{ false: Colors.surfaceAlt, true: Colors.primary }}
            thumbColor={Colors.textPrimary}
          />
        </View>

        <Pressable style={styles.button} onPress={handleFinish}>
          <Text style={styles.buttonText}>Finish</Text>
        </Pressable>
      </View>
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
    justifyContent: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 12,
    gap: 12,
  },
  switchLabel: {
    color: Colors.textSecondary,
    flex: 1,
    fontSize: 14,
  },
  button: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
});
