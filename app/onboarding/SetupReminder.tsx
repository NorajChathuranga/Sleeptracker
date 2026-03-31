import React, { useState } from 'react';
import {
  Alert,
  StyleSheet,
  Switch,
  Text,
  Pressable,
  TextInput,
  View,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

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

  const toggleSwitch = (val: boolean) => {
    Haptics.selectionAsync();
    setNotificationsEnabled(val);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.contentWrap}>
          <Text style={styles.title}>What time do you want to be in bed by?</Text>
          <Text style={styles.subtitle}>We'll use this to remind you to wind down.</Text>

          <TextInput
            value={targetBedtime}
            onChangeText={setTargetBedtime}
            placeholder="22:30"
            placeholderTextColor={Colors.textMuted}
            style={styles.input}
            keyboardType="numbers-and-punctuation"
            returnKeyType="done"
          />

          <View style={styles.switchRow}>
            <View style={styles.switchTextWrap}>
              <Text style={styles.switchTitle}>Reminders</Text>
              <Text style={styles.switchLabel}>Get a gentle notification 30 mins before bed</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={toggleSwitch}
              trackColor={{ false: Colors.surfaceAlt, true: Colors.primary }}
              thumbColor={Colors.textPrimary}
            />
          </View>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={handleFinish}
        >
          <Text style={styles.buttonText}>Finish</Text>
        </Pressable>
      </KeyboardAvoidingView>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 20,
    justifyContent: 'space-between',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    gap: 20,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    color: Colors.textPrimary,
    fontSize: 24,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    marginHorizontal: 40,
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    padding: 16,
    marginTop: 10,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  switchTextWrap: {
    flex: 1,
    paddingRight: 10,
  },
  switchTitle: {
    color: Colors.textPrimary,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  switchLabel: {
    color: Colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    letterSpacing: 0.5,
  },
});
