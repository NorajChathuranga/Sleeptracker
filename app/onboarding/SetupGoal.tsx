import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, Pressable, View, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/colors';
import { SleepConfig } from '../../constants/sleepConfig';

type Props = {
  navigation: any;
};

export default function SetupGoal({ navigation }: Props): React.JSX.Element {
  const [goalMin, setGoalMin] = useState(8 * 60);
  const [name, setName] = useState('');

  const display = useMemo(() => {
    const h = Math.floor(goalMin / 60);
    const m = goalMin % 60;
    return `${h} hours ${m} minutes`;
  }, [goalMin]);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('SetupReminder', { goalMin, name });
  };

  const adjustGoal = (amount: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setGoalMin((v) => {
      if (amount > 0) return Math.min(SleepConfig.maxGoalMin, v + amount);
      return Math.max(SleepConfig.minGoalMin, v + amount);
    });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView 
        style={styles.container} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.contentWrap}>
          <Text style={styles.title}>How many hours of sleep do you want?</Text>
          <Text style={styles.value}>{display}</Text>

          <View style={styles.counterRow}>
            <Pressable
              style={({ pressed }) => [styles.roundButton, pressed && styles.roundButtonPressed]}
              onPress={() => adjustGoal(-30)}
            >
              <Text style={styles.roundText}>-</Text>
            </Pressable>
            <View style={styles.midBadge}>
              <Text style={styles.midBadgeText}>{(goalMin / 60).toFixed(1)}h</Text>
            </View>
            <Pressable
              style={({ pressed }) => [styles.roundButton, pressed && styles.roundButtonPressed]}
              onPress={() => adjustGoal(30)}
            >
              <Text style={styles.roundText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.inputWrap}>
            <Text style={styles.label}>What should we call you? (optional)</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={Colors.textMuted}
              style={styles.input}
              returnKeyType="done"
            />
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]}
          onPress={handleNext}
        >
          <Text style={styles.buttonText}>Next</Text>
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
  value: {
    color: Colors.primaryLight,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
    marginVertical: 12,
  },
  roundButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },
  roundButtonPressed: {
    backgroundColor: Colors.surfaceAlt,
    transform: [{ scale: 0.95 }],
  },
  roundText: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  midBadge: {
    borderRadius: 16,
    backgroundColor: Colors.moonGlow,
    borderWidth: 1,
    borderColor: 'rgba(123, 104, 238, 0.3)',
    paddingHorizontal: 24,
    paddingVertical: 14,
  },
  midBadgeText: {
    color: Colors.primaryLight,
    fontSize: 20,
    fontWeight: '800',
  },
  inputWrap: {
    gap: 10,
    marginTop: 20,
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 16,
    color: Colors.textPrimary,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
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
