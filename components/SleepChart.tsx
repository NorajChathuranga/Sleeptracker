import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';
import { parseISO } from 'date-fns';

import { Colors } from '../constants/colors';
import { SleepSession } from '../types';
import { formatDateLabel } from '../utils/timeUtils';

type Props = {
  sessions: SleepSession[];
};

function barColor(hours: number): string {
  if (hours >= 7 && hours <= 9) return Colors.healthy;
  if ((hours >= 6 && hours < 7) || (hours > 9 && hours <= 10)) return Colors.okay;
  return Colors.unhealthy;
}

export function SleepChart({ sessions }: Props): React.JSX.Element {
  const data = sessions.map((session) => {
    const hours = (session.duration_min ?? 0) / 60;
    return {
      value: Number(hours.toFixed(1)),
      label: formatDateLabel(parseISO(session.date)),
      frontColor: barColor(hours),
    };
  });

  if (!data.length) {
    return (
      <View style={styles.emptyWrap}>
        <Text style={styles.emptyText}>No sleep sessions yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.chartWrap}>
      <BarChart
        data={data}
        barWidth={24}
        spacing={18}
        roundedTop
        hideRules
        hideYAxisText
        xAxisColor={Colors.border}
        yAxisColor={Colors.border}
        maxValue={12}
        noOfSections={4}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  chartWrap: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  emptyWrap: {
    borderRadius: 16,
    backgroundColor: Colors.surface,
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.textSecondary,
  },
});
