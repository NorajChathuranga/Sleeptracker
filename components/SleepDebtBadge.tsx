import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/colors';
import { formatDuration } from '../utils/timeUtils';

type Props = {
  debtMin: number;
};

export function SleepDebtBadge({ debtMin }: Props): React.JSX.Element {
  return (
    <View style={styles.badge}>
      <Text style={styles.title}>Sleep Debt</Text>
      <Text style={styles.value}>{debtMin > 0 ? formatDuration(debtMin) : 'Debt-free'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    color: Colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  value: {
    color: Colors.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
});
