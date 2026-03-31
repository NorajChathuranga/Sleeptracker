import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/colors';
import { AdviceItem } from '../types';

type Props = {
  item: AdviceItem;
};

function iconForType(type: AdviceItem['type']): string {
  if (type === 'success') return '✅';
  if (type === 'warning') return '⚠️';
  return '💡';
}

export function AdviceCard({ item }: Props): React.JSX.Element {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>
        {iconForType(item.type)} {item.title}
      </Text>
      <Text style={styles.message}>{item.message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 14,
    gap: 6,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  message: {
    color: Colors.textSecondary,
    lineHeight: 20,
  },
});
