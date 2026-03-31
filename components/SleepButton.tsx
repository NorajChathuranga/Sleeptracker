import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { Colors } from '../constants/colors';
import { formatDuration } from '../utils/timeUtils';

type Props = {
  mode: 'sleep' | 'wake';
  onPress: () => void;
  elapsedMinutes?: number;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function SleepButton({ mode, onPress, elapsedMinutes = 0 }: Props): React.JSX.Element {
  const scale = useSharedValue(1);
  const pulse = useSharedValue(1);

  const isSleep = mode === 'sleep';

  useEffect(() => {
    if (!isSleep) { // Active sleeping mode
      pulse.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1, // infinite
        true
      );
    } else {
      pulse.value = withTiming(1, { duration: 500 });
    }
  }, [isSleep, pulse]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value * pulse.value }],
  }));

  const handlePressIn = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    scale.value = withSpring(0.92, { damping: 12, stiffness: 200 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 12, stiffness: 200 });
  };

  const handlePress = () => {
    Haptics.notificationAsync(
      isSleep ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning
    );
    onPress();
  };

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={handlePress}
      style={[styles.container, animatedStyle]}
    >
      <LinearGradient
        colors={isSleep ? ['#5C4FBF', '#7B68EE'] : ['#D4881A', '#F0A050']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
        <View style={styles.iconWrap}>
          <Text style={styles.icon}>{isSleep ? '🌙' : '☀️'}</Text>
        </View>
        <Text style={styles.title}>{isSleep ? "I'm going to sleep" : 'I woke up'}</Text>
        <Text style={styles.subtitle}>
          {isSleep ? 'Tap when you are in bed' : `Sleeping for ${formatDuration(elapsedMinutes)}`}
        </Text>
      </LinearGradient>
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 28,
    overflow: 'hidden',
    shadowColor: Colors.primary,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  gradient: {
    paddingVertical: 30,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 24,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#EDE6FF',
    fontSize: 14,
  },
});
