# SleepWise

SleepWise is a full React Native + Expo sleep tracker app built from your plan.

## Features Included

- Onboarding flow: welcome, sleep goal, bedtime reminder setup
- Manual sleep start and wake logging
- Mood-on-wake + optional note capture
- Sleep score calculation (duration, consistency, timing)
- 7-day dashboard with score ring, chart, debt badge, and advice cards
- Weekly report with consistency chart and week-over-week score delta
- Settings for name, goal, bedtime, notifications, and clear data
- Local-first persistence with SQLite
- Adaptive bedtime notifications + sleep debt alert
- Wake alarm scheduling with automatic sleep auto-end on ring
- Stale active session recovery prompt

## Stack

- Expo + React Native + TypeScript
- Zustand for global state
- expo-sqlite for database
- expo-notifications for reminders
- react-native-gifted-charts for charting

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start Expo:

```bash
npm start
```

3. Run on device/emulator:

```bash
npm run android
# or
npm run ios
```

## Project Structure

- `app/onboarding`: onboarding screens
- `app/tabs`: Home, Dashboard, Report, Settings screens
- `components`: reusable UI blocks
- `logic`: score, advice, debt, baseline, weekly analysis
- `db`: SQLite setup + repositories
- `store`: Zustand stores
- `notifications`: scheduling logic
- `types`, `utils`, `constants`: shared foundation

## Validation

- TypeScript check passes with strict mode:

```bash
npm run typecheck
```