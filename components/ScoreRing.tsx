import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { Colors } from '../constants/colors';
import { getScoreLabel } from '../logic/scoreCalculator';

type Props = {
  score: number;
};

const SIZE = 180;
const STROKE = 16;
const RADIUS = (SIZE - STROKE) / 2;
const CIRC = 2 * Math.PI * RADIUS;

function colorForScore(score: number): string {
  if (score >= 85) return Colors.healthy;
  if (score >= 70) return Colors.okay;
  if (score >= 50) return Colors.poor;
  return Colors.unhealthy;
}

export function ScoreRing({ score }: Props): React.JSX.Element {
  const clamped = Math.min(100, Math.max(0, score));
  const progress = CIRC - (CIRC * clamped) / 100;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE}>
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={Colors.surfaceAlt}
          strokeWidth={STROKE}
          fill="none"
        />
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          stroke={colorForScore(clamped)}
          strokeWidth={STROKE}
          fill="none"
          strokeDasharray={CIRC}
          strokeDashoffset={progress}
          strokeLinecap="round"
          rotation="-90"
          originX={SIZE / 2}
          originY={SIZE / 2}
        />
      </Svg>
      <View style={styles.center}>
        <Text style={styles.score}>{clamped}</Text>
        <Text style={styles.label}>{getScoreLabel(clamped)}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  score: {
    color: Colors.textPrimary,
    fontSize: 40,
    fontWeight: '700',
  },
  label: {
    color: Colors.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
});
