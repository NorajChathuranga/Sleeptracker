import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, Pressable, View, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

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

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>How many hours of sleep do you want?</Text>
        <Text style={styles.value}>{display}</Text>

        <View style={styles.counterRow}>
          <Pressable
            style={styles.roundButton}
            onPress={() => setGoalMin((v) => Math.max(SleepConfig.minGoalMin, v - 30))}
          >
            <Text style={styles.roundText}>-</Text>
          </Pressable>
          <View style={styles.midBadge}>
            <Text style={styles.midBadgeText}>{(goalMin / 60).toFixed(1)}h</Text>
          </View>
          <Pressable
            style={styles.roundButton}
            onPress={() => setGoalMin((v) => Math.min(SleepConfig.maxGoalMin, v + 30))}
          >
            <Text style={styles.roundText}>+</Text>
          </Pressable>
        </View>

        <Text style={styles.label}>What should we call you? (optional)</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Your name"
          placeholderTextColor={Colors.textMuted}
          style={styles.input}
        />

        <Pressable
          style={styles.button}
          onPress={() => navigation.navigate('SetupReminder', { goalMin, name })}
        >
          <Text style={styles.buttonText}>Next</Text>
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
    gap: 18,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 26,
    fontWeight: '700',
  },
  value: {
    color: Colors.primaryLight,
    fontSize: 18,
    fontWeight: '600',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  roundButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  roundText: {
    color: Colors.textPrimary,
    fontSize: 28,
    fontWeight: '700',
  },
  midBadge: {
    borderRadius: 999,
    backgroundColor: Colors.moonGlow,
    borderWidth: 1,
    borderColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  midBadgeText: {
    color: Colors.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  input: {
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    color: Colors.textPrimary,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
