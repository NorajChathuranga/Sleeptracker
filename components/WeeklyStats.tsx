import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Colors } from '../constants/colors';
import { formatDuration } from '../utils/timeUtils';

type Props = {
  avgDurationMin: number;
  consistencyStdDevMin: number;
  avgBedtimeText: string;
};

export function WeeklyStats({
  avgDurationMin,
  consistencyStdDevMin,
  avgBedtimeText,
}: Props): React.JSX.Element {
  return (
    <View style={styles.row}>
      <View style={styles.cell}>
        <Text style={styles.k}>Avg Duration</Text>
        <Text style={styles.v}>{formatDuration(avgDurationMin)}</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.k}>Consistency</Text>
        <Text style={styles.v}>+/-{consistencyStdDevMin}m</Text>
      </View>
      <View style={styles.cell}>
        <Text style={styles.k}>Avg Bedtime</Text>
        <Text style={styles.v}>{avgBedtimeText}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    borderRadius: 16,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cell: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    gap: 4,
  },
  k: {
    color: Colors.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  v: {
    color: Colors.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
});
