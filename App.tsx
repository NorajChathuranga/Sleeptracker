import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

import Welcome from './app/onboarding/Welcome';
import SetupGoal from './app/onboarding/SetupGoal';
import SetupReminder from './app/onboarding/SetupReminder';
import Home from './app/tabs/Home';
import Dashboard from './app/tabs/Dashboard';
import Report from './app/tabs/Report';
import Settings from './app/tabs/Settings';
import { Colors } from './constants/colors';
import { useSleepStore } from './store/useSleepStore';
import { useUserStore } from './store/useUserStore';

const RootStack = createNativeStackNavigator();
const OnboardingStack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function OnboardingNavigator(): React.JSX.Element {
  return (
    <OnboardingStack.Navigator
      initialRouteName="Welcome"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.background },
      }}
    >
      <OnboardingStack.Screen name="Welcome" component={Welcome} />
      <OnboardingStack.Screen name="SetupGoal" component={SetupGoal} />
      <OnboardingStack.Screen name="SetupReminder" component={SetupReminder} />
    </OnboardingStack.Navigator>
  );
}

function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
        },
        tabBarActiveTintColor: Colors.primaryLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarIcon: ({ color, size }) => {
          const iconMap: Record<string, keyof typeof Ionicons.glyphMap> = {
            Home: 'moon',
            Dashboard: 'bar-chart',
            Report: 'document-text',
            Settings: 'settings',
          };
          return <Ionicons name={iconMap[route.name] ?? 'ellipse'} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="Home" component={Home} />
      <Tab.Screen name="Dashboard" component={Dashboard} />
      <Tab.Screen name="Report" component={Report} />
      <Tab.Screen name="Settings" component={Settings} />
    </Tab.Navigator>
  );
}

export default function App(): React.JSX.Element {
  const [ready, setReady] = useState(false);

  const loadSettings = useUserStore((state) => state.loadSettings);
  const onboardingDone = useUserStore((state) => state.settings.onboarding_done);
  const loadSessions = useSleepStore((state) => state.loadSessions);

  useEffect(() => {
    const bootstrap = async (): Promise<void> => {
      await loadSettings();
      await loadSessions();
      setReady(true);
    };

    void bootstrap();
  }, [loadSessions, loadSettings]);

  const navTheme = useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: Colors.background,
        card: Colors.surface,
        text: Colors.textPrimary,
        border: Colors.border,
        primary: Colors.primary,
        notification: Colors.accent,
      },
    }),
    [],
  );

  if (!ready) {
    return (
      <View style={styles.loaderWrap}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <StatusBar style="light" />
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!onboardingDone ? (
          <RootStack.Screen name="Onboarding" component={OnboardingNavigator} />
        ) : (
          <RootStack.Screen name="Main" component={MainTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loaderWrap: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
