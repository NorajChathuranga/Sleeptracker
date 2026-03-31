import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/colors';

type Props = {
  value: 1 | 2 | 3 | 4 | 5 | null;
  onChange: (mood: 1 | 2 | 3 | 4 | 5) => void;
};

const moods: Array<{ value: 1 | 2 | 3 | 4 | 5; emoji: string }> = [
  { value: 1, emoji: '😫' },
  { value: 2, emoji: '😕' },
  { value: 3, emoji: '😐' },
  { value: 4, emoji: '🙂' },
  { value: 5, emoji: '😁' },
];

export function MoodPicker({ value, onChange }: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      {moods.map((mood) => (
        <Pressable
          key={mood.value}
          onPress={() => onChange(mood.value)}
          style={[styles.item, value === mood.value && styles.itemSelected]}
        >
          <Text style={styles.emoji}>{mood.emoji}</Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  item: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  itemSelected: {
    borderColor: Colors.primaryLight,
    backgroundColor: Colors.moonGlow,
  },
  emoji: {
    fontSize: 22,
  },
});
