# SleepWise

SleepWise is a full React Native + Expo sleep tracker app built from your plan.

## Features Included

- Onboarding flow: welcome, sleep goal, bedtime reminder setup
- Manual sleep start and wake logging
- Mood-on-wake + optional note capture
- Sleep score calculation (duration, consistency, timing)
- 7-day dashboard with score ring, chart, debt badge, and advice cards
- Weekly report with consistency chart and week-over-week score delta
- AI weekly insight: Gemini Flash primary with Groq fallback
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

### Optional AI Setup (Free Tier)

Create a `.env` file in the project root:

```bash
EXPO_PUBLIC_GEMINI_API_KEY=your_gemini_key
EXPO_PUBLIC_GROQ_API_KEY=your_groq_key
```

Provider behavior:

- Gemini Flash is used as the primary AI provider for weekly personalized insight.
- Groq is used automatically as fallback if Gemini fails or is rate-limited.
- If no AI key is configured, the app still works with deterministic rule-based insight.

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
- `logic/aiAdvice.ts`: AI insight orchestration (Gemini -> Groq -> rule fallback)
- `db`: SQLite setup + repositories
- `store`: Zustand stores
- `notifications`: scheduling logic
- `types`, `utils`, `constants`: shared foundation

## Validation

- TypeScript check passes with strict mode:

```bash
npm run typecheck
```

## AI Scope (Intentional)

Rule-based logic remains source of truth for:

- Sleep duration and score calculations
- Sleep debt math
- Consistency standard deviation
- Core advice thresholds

AI is used only where language adds value:

- Weekly personalized summary
- Pattern explanation in plain words
- One actionable next step for the next week