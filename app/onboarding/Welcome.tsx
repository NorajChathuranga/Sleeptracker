import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { Colors } from '../../constants/colors';

type Props = {
  navigation: any;
};

export default function Welcome({ navigation }: Props): React.JSX.Element {
  const handleStart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('SetupGoal');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.contentWrap}>
          <View style={styles.iconCircle}>
            <Text style={styles.moon}>🌙</Text>
          </View>
          <Text style={styles.title}>Sleep better,{'\n'}starting tonight</Text>
          <Text style={styles.subtitle}>
            Track your sleep in seconds and understand your patterns without wearables.
          </Text>
        </View>

        <Pressable 
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }]} 
          onPress={handleStart}
        >
          <Text style={styles.buttonText}>Get Started</Text>
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
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 60,
    justifyContent: 'space-between',
  },
  contentWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: Colors.primary,
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  moon: {
    fontSize: 48,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 34,
    textAlign: 'center',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 17,
    textAlign: 'center',
    lineHeight: 26,
    paddingHorizontal: 10,
  },
  button: {
    paddingVertical: 16,
    width: '100%',
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
