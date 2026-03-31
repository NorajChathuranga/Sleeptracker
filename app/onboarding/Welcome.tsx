import React from 'react';
import { StyleSheet, Text, Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../constants/colors';

type Props = {
  navigation: any;
};

export default function Welcome({ navigation }: Props): React.JSX.Element {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.moon}>🌙</Text>
        <Text style={styles.title}>Sleep better, starting tonight</Text>
        <Text style={styles.subtitle}>
          Track your sleep in seconds and understand your patterns without wearables.
        </Text>

        <Pressable style={styles.button} onPress={() => navigation.navigate('SetupGoal')}>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 12,
  },
  moon: {
    fontSize: 58,
    marginBottom: 8,
  },
  title: {
    color: Colors.textPrimary,
    fontSize: 30,
    textAlign: 'center',
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  buttonText: {
    color: Colors.textPrimary,
    fontWeight: '700',
    fontSize: 16,
  },
});
