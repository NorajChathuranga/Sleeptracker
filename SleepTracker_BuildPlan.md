# 🌙 SleepWise — React Native Sleep Tracker
## Full Build Plan (GitHub Copilot Ready)

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Database Schema](#4-database-schema)
5. [App Screens & Navigation](#5-app-screens--navigation)
6. [Core Logic & Algorithms](#6-core-logic--algorithms)
7. [State Management](#7-state-management)
8. [Notification System](#8-notification-system)
9. [UI Design System](#9-ui-design-system)
10. [Phase-by-Phase Build Plan](#10-phase-by-phase-build-plan)
11. [GitHub Copilot Prompt Templates](#11-github-copilot-prompt-templates)
12. [Testing Checklist](#12-testing-checklist)

---

## 1. Project Overview

**App Name:** SleepWise  
**Platform:** React Native (Bare workflow / Expo)  
**Target:** Android first, iOS compatible  
**Purpose:** Help users track, analyze, and improve their sleep health using manual logging + smart analysis — no wearable required.

### Core Value Proposition
- User taps sleep/wake → app calculates duration, consistency, and timing
- After 7 days → personalized baseline established
- Daily health score (0–100) with human-readable advice
- Smart notifications based on user's personal sleep pattern (not fixed times)

### MVP Boundaries (What We Build)
✅ Manual sleep/wake logging  
✅ Sleep duration & health score calculation  
✅ 7-day dashboard with charts  
✅ Rule-based smart advice  
✅ Adaptive notifications  
✅ Weekly report screen  
✅ Mood-on-wake tracking  
✅ Sleep debt tracker  

❌ No wearable integration (future)  
❌ No REM/deep sleep (requires hardware)  
❌ No cloud sync (local-first MVP)  

---

## 2. Tech Stack

| Category | Library | Version | Purpose |
|---|---|---|---|
| Framework | React Native | 0.73+ | Core |
| Dev Tool | Expo (managed/bare) | SDK 50+ | Faster setup |
| Navigation | React Navigation | v6 | Screen routing |
| Local DB | expo-sqlite | latest | Persistent storage |
| Charts | react-native-gifted-charts | latest | Sleep graphs |
| Notifications | expo-notifications | latest | Smart reminders |
| State | Zustand | 4.x | Global state |
| Date/Time | date-fns | 3.x | All time calculations |
| Icons | @expo/vector-icons | latest | UI icons |
| Animations | react-native-reanimated | 3.x | Smooth UI |
| Unique IDs | uuid | latest | Record IDs |

### Initialize Project
```bash
npx create-expo-app SleepWise --template blank
cd SleepWise

npx expo install expo-sqlite expo-notifications
npm install @react-navigation/native @react-navigation/bottom-tabs @react-navigation/stack
npm install react-native-screens react-native-safe-area-context
npm install react-native-gifted-charts react-native-linear-gradient
npm install zustand date-fns uuid
npm install react-native-reanimated react-native-gesture-handler
```

---

## 3. Project Structure

```
SleepWise/
│
├── app/                         # Screens
│   ├── index.tsx                # Entry / redirect
│   ├── onboarding/
│   │   ├── Welcome.tsx
│   │   ├── SetupGoal.tsx        # Sleep goal (hours)
│   │   └── SetupReminder.tsx    # Target bedtime
│   └── (tabs)/
│       ├── Home.tsx             # Sleep/wake buttons + today status
│       ├── Dashboard.tsx        # 7-day chart + score
│       ├── Report.tsx           # Weekly report
│       └── Settings.tsx
│
├── components/
│   ├── SleepButton.tsx          # Big sleep/wake CTA button
│   ├── ScoreRing.tsx            # Circular score display
│   ├── SleepChart.tsx           # Bar chart wrapper
│   ├── AdviceCard.tsx           # Advice message card
│   ├── SleepDebtBadge.tsx       # Debt counter pill
│   ├── MoodPicker.tsx           # 5-emoji mood selector
│   └── WeeklyStats.tsx          # Stats summary row
│
├── store/
│   ├── useSleepStore.ts         # Zustand: sleep sessions
│   └── useUserStore.ts          # Zustand: user prefs/settings
│
├── db/
│   ├── database.ts              # SQLite init + migrations
│   ├── sleepRepository.ts       # CRUD for sleep records
│   └── userRepository.ts        # CRUD for user settings
│
├── logic/
│   ├── scoreCalculator.ts       # Health score algorithm
│   ├── adviceEngine.ts          # Rule-based advice generator
│   ├── sleepDebt.ts             # Debt calculation
│   ├── consistencyAnalyzer.ts   # Std deviation on schedule
│   └── baselineAnalyzer.ts      # First 7-day baseline builder
│
├── notifications/
│   └── notificationManager.ts  # Schedule + adaptive logic
│
├── constants/
│   ├── colors.ts                # Design tokens
│   ├── typography.ts            # Font sizes/weights
│   └── sleepConfig.ts           # Health thresholds
│
├── types/
│   └── index.ts                 # TypeScript interfaces
│
└── utils/
    ├── timeUtils.ts             # Duration, format helpers
    └── statsUtils.ts            # Mean, std dev helpers
```

---

## 4. Database Schema

### Tables

#### `sleep_sessions`
```sql
CREATE TABLE IF NOT EXISTS sleep_sessions (
  id              TEXT PRIMARY KEY,          -- UUID
  date            TEXT NOT NULL,             -- "YYYY-MM-DD" (wake date)
  sleep_start     TEXT NOT NULL,             -- ISO 8601 datetime
  wake_time       TEXT,                      -- ISO 8601 datetime (null if still sleeping)
  duration_min    INTEGER,                   -- Calculated on wake
  mood_on_wake    INTEGER,                   -- 1–5 (nullable)
  notes           TEXT,                      -- Optional user note
  auto_detected   INTEGER DEFAULT 0,         -- 0=manual, 1=suggested
  health_score    INTEGER,                   -- Computed score (0–100)
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL
);
```

#### `user_settings`
```sql
CREATE TABLE IF NOT EXISTS user_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
-- Keys: name, sleep_goal_min, target_bedtime, onboarding_done,
--       baseline_established, baseline_avg_duration, baseline_score
```

### ER Diagram
```
user_settings (key-value)
      |
      | (goal/target used in scoring)
      ↓
sleep_sessions ──── one record per sleep
  - id (PK)
  - date
  - sleep_start
  - wake_time
  - duration_min
  - mood_on_wake
  - health_score
```

### TypeScript Interfaces

```typescript
// types/index.ts

export interface SleepSession {
  id: string;
  date: string;                   // "YYYY-MM-DD"
  sleep_start: string;            // ISO datetime
  wake_time: string | null;
  duration_min: number | null;
  mood_on_wake: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
  auto_detected: boolean;
  health_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  name: string;
  sleep_goal_min: number;         // Default: 480 (8 hours)
  target_bedtime: string;         // "HH:mm" e.g. "22:30"
  onboarding_done: boolean;
  baseline_established: boolean;
  baseline_avg_duration: number | null;
  baseline_score: number | null;
}

export interface SleepAnalysis {
  score: number;
  duration_score: number;
  consistency_score: number;
  timing_score: number;
  label: 'Healthy' | 'Okay' | 'Poor' | 'Unhealthy';
  sleep_debt_min: number;
  avg_duration_min: number;
  advice: AdviceItem[];
}

export interface AdviceItem {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
}
```

---

## 5. App Screens & Navigation

### Navigation Structure

```
Root Stack
├── OnboardingStack (shown if onboarding_done = false)
│   ├── Welcome
│   ├── SetupGoal
│   └── SetupReminder
│
└── MainTabs (shown if onboarding_done = true)
    ├── Tab: Home        (🌙 icon)
    ├── Tab: Dashboard   (📊 icon)
    ├── Tab: Report      (📋 icon)
    └── Tab: Settings    (⚙️ icon)
```

### Screen Specifications

---

#### Screen 1: Welcome (Onboarding)
**Purpose:** Introduce the app  
**UI Elements:**
- App logo / moon animation
- Headline: "Sleep better, starting tonight"
- Subtext: "Track your sleep in seconds. Understand your patterns."
- CTA Button: "Get Started →"

---

#### Screen 2: Setup Goal (Onboarding)
**Purpose:** Capture sleep goal  
**UI Elements:**
- Question: "How many hours of sleep do you want?"
- Slider: 5h → 10h (default 8h)
- Display: "7 hours 30 minutes"
- Next button

**Logic:** Save to `user_settings` as `sleep_goal_min`

---

#### Screen 3: Setup Reminder (Onboarding)
**Purpose:** Capture target bedtime  
**UI Elements:**
- Question: "What time do you want to be in bed by?"
- Time picker (iOS-style wheel or custom)
- Toggle: "Enable sleep reminder notifications"
- Finish button → set `onboarding_done = true`

---

#### Screen 4: Home (Main)
**Purpose:** Primary daily interaction  

**States:**

**State A — Awake (No active session)**
```
[Good Evening, Noraj]
[Date: Tuesday, March 31]

[Sleep Debt Badge: "You owe 1h 20m"]

─────────────────────────────
  🌙 Big Sleep Button
  "I'm going to sleep"
─────────────────────────────

[Last night: 7h 12m  ·  Score: 74]
[Quick Stats Row: Avg 6h 48m | Streak: 3]
```

**State B — Sleeping (Active session)**
```
[Currently sleeping... 💤]
[Started: 11:30 PM]
[Duration so far: 6h 42m]

─────────────────────────────
  ☀️ Big Wake Button  
  "I woke up"
─────────────────────────────

[Tip: You need 18 more minutes for your goal]
```

**State C — Just Woke Up (Session ending flow)**
```
Modal appears:
"Good morning! 🌅"
"You slept for 7h 18m"

How do you feel?
[😫] [😕] [😐] [🙂] [😁]

[Add note (optional)...]

[Done]
```

After Done: Score is calculated and saved.

---

#### Screen 5: Dashboard
**Purpose:** 7-day overview + health score  

**Layout:**
```
[SLEEP HEALTH SCORE]
   ◉ 78 / 100
   "Okay — Room to improve"

[LAST 7 DAYS — Bar Chart]
  Each bar = duration, colored:
  Green  = 7–9h
  Yellow = 6–7h or 9–10h
  Red    = < 6h or > 10h

[STATS ROW]
  Avg Duration  | Consistency  | Avg Bedtime
  6h 48m        | ±42min       | 11:48 PM

[SLEEP DEBT]
  "You owe 3h 20m this week"
  Progress bar toward debt-free

[ADVICE CARDS — Scrollable]
  Card 1: ⚠️ "Your schedule varies by 1h 20m..."
  Card 2: 💡 "You slept past 1 AM 4 nights..."
  Card 3: ✅ "You hit your goal 5 out of 7 days"
```

---

#### Screen 6: Weekly Report
**Purpose:** Deeper weekly summary  

**Layout:**
```
[Week of Mar 24 – Mar 30]     [< Prev] [Next >]

[SUMMARY CARD]
  Average Sleep:  6h 52m
  Best Night:     Mar 27 — 8h 10m
  Worst Night:    Mar 25 — 5h 30m
  Goal Hit:       4 / 7 nights ✅

[CONSISTENCY CHART]
  Line chart of sleep start times
  Shows irregularity visually

[SLEEP DEBT STATUS]
  Target: 56h | Got: 48h 4m | Debt: 7h 56m

[MOOD CORRELATION]
  "On nights you slept 7h+, mood avg: 4.2/5"
  "On nights under 6h, mood avg: 2.1/5"

[WEEK-OVER-WEEK]
  Score last week: 61 → This week: 74 📈 +13
```

---

#### Screen 7: Settings
- User name
- Sleep goal (re-adjust)
- Target bedtime (re-adjust)
- Notification toggle + time
- Clear all data (with confirmation)
- App version

---

## 6. Core Logic & Algorithms

### 6.1 Sleep Score Calculator

```typescript
// logic/scoreCalculator.ts

import { differenceInMinutes, getHours, getMinutes } from 'date-fns';

/**
 * Calculates sleep health score (0–100)
 * Weight: Duration 40% | Consistency 35% | Timing 25%
 */
export function calculateSleepScore(params: {
  duration_min: number;
  goal_min: number;
  sleep_start_times: Date[];    // Last 7 sessions
  sleep_start: Date;
}): { total: number; duration: number; consistency: number; timing: number } {

  // --- Duration Score (40%) ---
  const durationScore = calcDurationScore(params.duration_min, params.goal_min);

  // --- Consistency Score (35%) ---
  const consistencyScore = calcConsistencyScore(params.sleep_start_times);

  // --- Timing Score (25%) ---
  const timingScore = calcTimingScore(params.sleep_start);

  const total = Math.round(
    durationScore * 0.40 +
    consistencyScore * 0.35 +
    timingScore * 0.25
  );

  return { total, duration: durationScore, consistency: consistencyScore, timing: timingScore };
}

function calcDurationScore(duration_min: number, goal_min: number): number {
  const hours = duration_min / 60;
  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours < 7) return Math.round(70 + (hours - 6) * 30);
  if (hours > 9 && hours <= 10) return Math.round(100 - (hours - 9) * 30);
  if (hours < 6) return Math.max(0, Math.round(hours * 11.67));   // 0–70 range
  return Math.max(0, Math.round(100 - (hours - 10) * 20));        // Oversleep penalty
}

function calcConsistencyScore(sleepTimes: Date[]): number {
  if (sleepTimes.length < 2) return 80; // Not enough data, neutral
  // Convert each time to minutes from midnight
  const minutesFromMidnight = sleepTimes.map(d => {
    const h = getHours(d);
    const m = getMinutes(d);
    // Handle post-midnight (e.g., 1 AM = 60, not 780)
    return h < 12 ? (h + 24) * 60 + m : h * 60 + m;
  });
  const mean = minutesFromMidnight.reduce((a, b) => a + b, 0) / minutesFromMidnight.length;
  const variance = minutesFromMidnight.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / minutesFromMidnight.length;
  const stdDev = Math.sqrt(variance); // In minutes

  // stdDev of 0–30 min = 100, 30–60 = 70–100, 60–120 = 40–70, >120 = 0–40
  if (stdDev <= 30) return 100;
  if (stdDev <= 60) return Math.round(100 - ((stdDev - 30) / 30) * 30);
  if (stdDev <= 120) return Math.round(70 - ((stdDev - 60) / 60) * 30);
  return Math.max(0, Math.round(40 - ((stdDev - 120) / 60) * 20));
}

function calcTimingScore(sleepStart: Date): number {
  const h = getHours(sleepStart);
  const adjustedHour = h < 12 ? h + 24 : h;  // 1 AM = 25, 11 PM = 23

  // Ideal: sleep between 9 PM (21) and 11 PM (23) → 100
  // After midnight (24+): penalty
  if (adjustedHour >= 21 && adjustedHour <= 23) return 100;
  if (adjustedHour >= 20 && adjustedHour < 21) return 85;   // 8 PM - a bit early
  if (adjustedHour > 23 && adjustedHour <= 24) return 75;   // 11 PM – midnight
  if (adjustedHour > 24 && adjustedHour <= 25) return 55;   // midnight–1 AM
  if (adjustedHour > 25 && adjustedHour <= 26) return 35;   // 1–2 AM
  return 10;                                                  // After 2 AM
}

export function getScoreLabel(score: number): 'Healthy' | 'Okay' | 'Poor' | 'Unhealthy' {
  if (score >= 85) return 'Healthy';
  if (score >= 70) return 'Okay';
  if (score >= 50) return 'Poor';
  return 'Unhealthy';
}
```

---

### 6.2 Advice Engine

```typescript
// logic/adviceEngine.ts

export interface AdviceItem {
  type: 'success' | 'warning' | 'info';
  title: string;
  message: string;
}

export function generateAdvice(params: {
  avg_duration_min: number;
  goal_min: number;
  consistency_std_dev_min: number;
  avg_sleep_hour: number;         // Decimal, adjusted for post-midnight
  sleep_debt_min: number;
  days_analyzed: number;
  mood_duration_correlation: boolean; // Mood drops on short nights?
  goal_hit_days: number;
}): AdviceItem[] {
  const advice: AdviceItem[] = [];
  const avgH = params.avg_duration_min / 60;
  const goalH = params.goal_min / 60;

  // Duration check
  if (avgH < 6) {
    advice.push({
      type: 'warning',
      title: 'Critically low sleep',
      message: `You're averaging only ${avgH.toFixed(1)}h — well below the 7–9h healthy range. Prolonged sleep deprivation affects memory, mood, and immunity.`
    });
  } else if (avgH < goalH - 0.5) {
    advice.push({
      type: 'warning',
      title: 'Below your sleep goal',
      message: `You're getting ${avgH.toFixed(1)}h on average but your goal is ${goalH}h. Try going to bed 30 minutes earlier.`
    });
  } else if (avgH >= 7 && avgH <= 9) {
    advice.push({
      type: 'success',
      title: 'Good sleep duration',
      message: `You're averaging ${avgH.toFixed(1)}h — right in the healthy range. Keep it up!`
    });
  }

  // Consistency check
  if (params.consistency_std_dev_min > 90) {
    advice.push({
      type: 'warning',
      title: 'Irregular sleep schedule',
      message: `Your bedtime varies by over ${Math.round(params.consistency_std_dev_min / 60)}h each night. An inconsistent schedule disrupts your circadian rhythm — try sticking to a ±30 minute window.`
    });
  } else if (params.consistency_std_dev_min > 45) {
    advice.push({
      type: 'info',
      title: 'Slightly inconsistent bedtime',
      message: `Your sleep timing varies by about ${Math.round(params.consistency_std_dev_min)} minutes. A more regular schedule will improve your sleep quality over time.`
    });
  }

  // Timing check (post-midnight sleep)
  if (params.avg_sleep_hour > 25) {  // After 1 AM (adjusted)
    advice.push({
      type: 'warning',
      title: 'Sleeping too late',
      message: `You're going to sleep after 1 AM on average. Late sleep is linked to poor mood and attention the next day. Try shifting your bedtime earlier by 30 minutes each week.`
    });
  }

  // Sleep debt
  if (params.sleep_debt_min > 120) {
    const debtH = Math.floor(params.sleep_debt_min / 60);
    const debtM = params.sleep_debt_min % 60;
    advice.push({
      type: 'warning',
      title: 'Sleep debt building up',
      message: `You owe yourself ${debtH}h ${debtM}m of sleep this week. Accumulated sleep debt takes multiple nights to recover from.`
    });
  }

  // Mood correlation
  if (params.mood_duration_correlation) {
    advice.push({
      type: 'info',
      title: 'Sleep affects your mood',
      message: `Your mood ratings are noticeably lower on nights you slept under 6 hours. More sleep = better days.`
    });
  }

  // Positive streak
  if (params.goal_hit_days >= 5) {
    advice.push({
      type: 'success',
      title: 'Great consistency this week!',
      message: `You hit your sleep goal ${params.goal_hit_days} out of 7 nights. That consistency is exactly what supports healthy sleep patterns.`
    });
  }

  return advice;
}
```

---

### 6.3 Sleep Debt Calculator

```typescript
// logic/sleepDebt.ts

/**
 * Sleep debt = sum of (goal - actual) for each day over last 7 days
 * Negative debt (excess sleep) is ignored for debt calculation
 */
export function calculateSleepDebt(sessions: {
  duration_min: number | null
}[], goal_min: number): number {
  const last7 = sessions.slice(-7);
  let debt = 0;
  for (const s of last7) {
    if (s.duration_min !== null) {
      const deficit = goal_min - s.duration_min;
      if (deficit > 0) debt += deficit;
    }
  }
  return debt; // In minutes
}
```

---

### 6.4 Baseline Analyzer (First 7 Days)

```typescript
// logic/baselineAnalyzer.ts

export function buildBaseline(sessions: SleepSession[]): {
  avg_duration_min: number;
  avg_score: number;
  established: boolean;
} {
  if (sessions.length < 7) return { avg_duration_min: 0, avg_score: 0, established: false };

  const first7 = sessions.slice(0, 7);
  const avg_duration_min = Math.round(
    first7.reduce((s, r) => s + (r.duration_min ?? 0), 0) / 7
  );
  const avg_score = Math.round(
    first7.reduce((s, r) => s + (r.health_score ?? 0), 0) / 7
  );

  return { avg_duration_min, avg_score, established: true };
}
```

---

## 7. State Management

### useSleepStore.ts (Zustand)

```typescript
import { create } from 'zustand';
import { SleepSession } from '../types';

interface SleepState {
  sessions: SleepSession[];
  activeSessions: SleepSession | null;    // Currently sleeping
  isLoading: boolean;

  // Actions
  loadSessions: () => Promise<void>;
  startSleep: () => Promise<void>;
  endSleep: (mood: number | null, notes: string | null) => Promise<void>;
  getLast7Days: () => SleepSession[];
  getTodaySession: () => SleepSession | null;
}

export const useSleepStore = create<SleepState>((set, get) => ({
  sessions: [],
  activeSessions: null,
  isLoading: false,

  loadSessions: async () => {
    // Load from SQLite via sleepRepository
    set({ isLoading: true });
    const sessions = await sleepRepository.getAll();
    const active = sessions.find(s => s.wake_time === null) ?? null;
    set({ sessions, activeSessions: active, isLoading: false });
  },

  startSleep: async () => {
    const session: SleepSession = {
      id: uuid(),
      date: format(new Date(), 'yyyy-MM-dd'),
      sleep_start: new Date().toISOString(),
      wake_time: null,
      duration_min: null,
      mood_on_wake: null,
      notes: null,
      auto_detected: false,
      health_score: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    await sleepRepository.insert(session);
    set(state => ({
      sessions: [...state.sessions, session],
      activeSessions: session,
    }));
  },

  endSleep: async (mood, notes) => {
    const active = get().activeSessions;
    if (!active) return;

    const wakeTime = new Date();
    const duration_min = differenceInMinutes(wakeTime, new Date(active.sleep_start));
    const last7starts = get().getLast7Days().map(s => new Date(s.sleep_start));

    const score = calculateSleepScore({
      duration_min,
      goal_min: userStore.getState().settings.sleep_goal_min,
      sleep_start_times: last7starts,
      sleep_start: new Date(active.sleep_start),
    });

    const updated: SleepSession = {
      ...active,
      wake_time: wakeTime.toISOString(),
      duration_min,
      mood_on_wake: mood,
      notes,
      health_score: score.total,
      updated_at: wakeTime.toISOString(),
    };
    await sleepRepository.update(updated);
    set(state => ({
      sessions: state.sessions.map(s => s.id === active.id ? updated : s),
      activeSessions: null,
    }));
  },

  getLast7Days: () => {
    return get().sessions
      .filter(s => s.wake_time !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-7);
  },

  getTodaySession: () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return get().sessions.find(s => s.date === today) ?? null;
  },
}));
```

---

## 8. Notification System

```typescript
// notifications/notificationManager.ts

import * as Notifications from 'expo-notifications';
import { getHours, getMinutes, subMinutes, format } from 'date-fns';

export async function scheduleAdaptiveBedtimeReminder(
  last7SleepTimes: Date[],
  fallbackBedtime: string // "HH:mm"
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  let targetHour: number;
  let targetMin: number;

  if (last7SleepTimes.length >= 3) {
    // Use personal average sleep start, adjusted to be 30 min earlier as a reminder
    const avgMinutes = last7SleepTimes.reduce((sum, d) => {
      const h = getHours(d);
      return sum + (h < 12 ? (h + 24) * 60 : h * 60) + getMinutes(d);
    }, 0) / last7SleepTimes.length;

    const reminderMin = avgMinutes - 30; // 30 min before avg bedtime
    targetHour = Math.floor(reminderMin / 60) % 24;
    targetMin = Math.round(reminderMin % 60);
  } else {
    // Fallback to user's set target
    [targetHour, targetMin] = fallbackBedtime.split(':').map(Number);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: '🌙 Bedtime soon',
      body: 'Time to wind down. Put the phone down and prepare for sleep.',
    },
    trigger: {
      hour: targetHour,
      minute: targetMin,
      repeats: true,
    },
  });
}

export async function scheduleSleepDebtAlert(debt_min: number): Promise<void> {
  if (debt_min < 60) return; // Only alert if >1h debt

  const debtH = Math.floor(debt_min / 60);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: '😴 Sleep debt reminder',
      body: `You've accumulated ${debtH}h of sleep debt this week. Tonight's a good night to catch up.`,
    },
    trigger: {
      seconds: 10, // Show same day (adjust as needed)
    },
  });
}
```

---

## 9. UI Design System

### Color Tokens (Dark Theme — Sleep App)

```typescript
// constants/colors.ts

export const Colors = {
  background:    '#0D0F14',   // Very dark blue-black
  surface:       '#161A23',   // Cards, modals
  surfaceAlt:    '#1E2330',   // Slightly lighter surface
  border:        '#252A38',

  primary:       '#7B68EE',   // Soft violet — main brand
  primaryLight:  '#9B8FFF',
  accent:        '#F0A050',   // Warm amber — wake/morning

  healthy:       '#4CAF82',   // Green
  okay:          '#F0C040',   // Yellow
  poor:          '#F07850',   // Orange
  unhealthy:     '#E84A5F',   // Red

  textPrimary:   '#F0F2F8',
  textSecondary: '#8890A8',
  textMuted:     '#505870',

  chartBar:      '#7B68EE',
  chartBarLow:   '#E84A5F',
  chartBarHigh:  '#4CAF82',

  moonGlow:      'rgba(123, 104, 238, 0.15)',
};
```

### Typography

```typescript
// constants/typography.ts

export const Typography = {
  // Suggested font pair:
  // Display: 'Nunito' (rounded, friendly, readable)
  // Body:    'Inter' or 'DM Sans'

  displayXL:  { fontSize: 48, fontWeight: '700', letterSpacing: -1 },
  displayLG:  { fontSize: 36, fontWeight: '700', letterSpacing: -0.5 },
  displayMD:  { fontSize: 28, fontWeight: '600' },
  heading:    { fontSize: 20, fontWeight: '600' },
  subheading: { fontSize: 16, fontWeight: '600' },
  body:       { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  caption:    { fontSize: 13, fontWeight: '400' },
  tiny:       { fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },
};
```

### Sleep Button Component Spec

```
SleepButton (State: Awake)
  Shape: Large rounded pill or circle
  Background: Deep violet gradient (#5C4FBF → #7B68EE)
  Icon: 🌙 or moon SVG, glowing ring animation
  Text: "I'm going to sleep"
  Subtext: "Tap when you're in bed"
  On press: Ripple → scale down → color shift

SleepButton (State: Sleeping)
  Background: Amber gradient (#D4881A → #F0A050)
  Icon: ☀️ rising animation  
  Text: "I woke up"
  Subtext: "Sleeping for 6h 42m..."
  Counter: Live elapsed time display
```

---

## 10. Phase-by-Phase Build Plan

### Phase 1 — Foundation (Week 1)
**Goal:** App runs, data saves, core loop works

| Task | File(s) | Notes |
|---|---|---|
| Init Expo project | - | `npx create-expo-app` |
| Install all dependencies | package.json | See Section 2 |
| Set up folder structure | All folders | As per Section 3 |
| Define TypeScript types | types/index.ts | All interfaces |
| Initialize SQLite | db/database.ts | Create tables on app launch |
| Build sleepRepository | db/sleepRepository.ts | insert, update, getAll, getById |
| Build userRepository | db/userRepository.ts | get, set key-value |
| Build Zustand stores | store/ | useSleepStore, useUserStore |
| Build timeUtils | utils/timeUtils.ts | formatDuration, formatTime helpers |

**Milestone:** Can insert and read sleep sessions from DB ✅

---

### Phase 2 — Onboarding (Week 1)
**Goal:** First-time user experience complete

| Task | File(s) |
|---|---|
| Welcome screen UI | app/onboarding/Welcome.tsx |
| Sleep goal setup (slider) | app/onboarding/SetupGoal.tsx |
| Bedtime setup (time picker) | app/onboarding/SetupReminder.tsx |
| Onboarding navigation flow | App.tsx |
| Save settings on finish | userRepository |
| Request notification permissions | notificationManager.ts |

**Milestone:** User can complete onboarding, settings saved ✅

---

### Phase 3 — Core Sleep Loop (Week 2)
**Goal:** Sleep and wake buttons fully working

| Task | File(s) |
|---|---|
| Home screen layout | app/(tabs)/Home.tsx |
| SleepButton component | components/SleepButton.tsx |
| Start sleep logic | useSleepStore.startSleep() |
| Live elapsed timer while sleeping | Home.tsx |
| Wake up flow — MoodPicker modal | components/MoodPicker.tsx |
| End sleep + calculate duration | useSleepStore.endSleep() |
| Score calculation on wake | logic/scoreCalculator.ts |
| Save score to DB | sleepRepository.update() |

**Milestone:** Full sleep session records in DB with scores ✅

---

### Phase 4 — Dashboard & Analysis (Week 2–3)
**Goal:** Data visible, score displayed

| Task | File(s) |
|---|---|
| Score ring component | components/ScoreRing.tsx |
| 7-day sleep bar chart | components/SleepChart.tsx |
| Dashboard screen layout | app/(tabs)/Dashboard.tsx |
| Advice engine | logic/adviceEngine.ts |
| AdviceCard component | components/AdviceCard.tsx |
| Sleep debt logic | logic/sleepDebt.ts |
| SleepDebtBadge component | components/SleepDebtBadge.tsx |
| Stats row (avg, consistency) | components/WeeklyStats.tsx |

**Milestone:** Dashboard shows full analysis with advice ✅

---

### Phase 5 — Notifications (Week 3)
**Goal:** Smart reminders scheduled

| Task | File(s) |
|---|---|
| Schedule adaptive bedtime reminder | notificationManager.ts |
| Sleep debt alert | notificationManager.ts |
| Trigger on settings change | Settings.tsx |
| Re-schedule after each session | useSleepStore.endSleep() |

**Milestone:** Notifications fire at personalized times ✅

---

### Phase 6 — Weekly Report (Week 3)
**Goal:** Weekly summary screen complete

| Task | File(s) |
|---|---|
| Report screen layout | app/(tabs)/Report.tsx |
| Week navigation (prev/next) | Report.tsx |
| Weekly aggregation logic | logic/consistencyAnalyzer.ts |
| Mood vs duration correlation | logic/adviceEngine.ts |
| Week-over-week score delta | Report.tsx |
| Baseline display (after 7 days) | baselineAnalyzer.ts + Report.tsx |

**Milestone:** Full weekly report renders correctly ✅

---

### Phase 7 — Polish (Week 4)
**Goal:** App is presentable and reliable

| Task | Notes |
|---|---|
| Add loading states | Skeleton screens |
| Empty state screens | "No sleep data yet — log tonight!" |
| Error handling (DB failures) | Try/catch with user feedback |
| Animations (SleepButton glow, score counter) | react-native-reanimated |
| Settings screen | Re-adjust goal, bedtime, clear data |
| Baseline announcement screen | After 7th night |
| App icon + splash screen | Expo config |
| Final testing on Android | Real device |

**Milestone:** App ready for demo / submission ✅

---

## 11. GitHub Copilot Prompt Templates

Use these as comments before asking Copilot to generate code:

### Starting a new file
```typescript
// SleepWise App | React Native + Expo + TypeScript
// File: logic/scoreCalculator.ts
// Purpose: Calculate sleep health score (0-100) based on duration (40%), 
//          consistency (35%), and timing (25%)
// Uses date-fns for time calculations
// Types imported from ../types/index.ts
```

### Asking Copilot for a component
```typescript
// Component: SleepButton
// Props: mode ('sleep' | 'wake'), onPress, elapsedMinutes (optional)
// Styles: dark background, violet gradient for sleep, amber for wake
// Behavior: shows live timer when mode='wake', scale animation on press
// Uses react-native-reanimated for animation
// Colors from ../constants/colors.ts
```

### Asking Copilot for a DB function
```typescript
// Function: getSessionsForWeek(weekStartDate: string): Promise<SleepSession[]>
// Uses expo-sqlite
// Returns all sessions where date >= weekStartDate and date <= weekStartDate + 6 days
// Ordered by date ASC
// Maps SQLite rows to SleepSession interface from types/index.ts
```

### Asking Copilot to fix a calculation
```typescript
// Fix: sleep_start can be before midnight (e.g. 11:30 PM) 
// and wake_time after midnight (e.g. 6:30 AM next day)
// Both stored as ISO 8601 strings
// Use differenceInMinutes from date-fns, not manual arithmetic
```

---

## 12. Testing Checklist

### Functional Tests
- [ ] First install: onboarding shows, settings save correctly
- [ ] Sleep button starts session, timestamp is accurate
- [ ] Wake button ends session, duration calculated correctly
- [ ] Mood picker saves to DB
- [ ] Sessions crossing midnight (sleep 11 PM → wake 6 AM) calculated correctly
- [ ] Score calculated on every session end
- [ ] Dashboard shows correct last 7 days
- [ ] Sleep debt is accurate (test with known data)
- [ ] Notifications schedule after onboarding
- [ ] Weekly report shows correct week (prev/next navigation)
- [ ] Clear data wipes everything and resets to onboarding

### Edge Cases
- [ ] What if user forgets to tap wake? (handle stale active session on app open)
- [ ] What if user sleeps >24h? (cap at reasonable max, show warning)
- [ ] What if there are 0 sessions? (empty states on all screens)
- [ ] What if user has only 1–2 sessions? (handle in consistency score)
- [ ] Session logged manually in wrong order? (validate start < end)

### Stale Session Recovery (Important!)
```typescript
// On app launch, check for active session older than 18 hours
// If found, show dialog: "Did you sleep from 11 PM to now?"
// Options: [Yes, log it] [Edit time] [Discard]
```

---

## Quick Reference

| Score Range | Label | Color |
|---|---|---|
| 85–100 | Healthy ✅ | Green #4CAF82 |
| 70–84 | Okay 🙂 | Yellow #F0C040 |
| 50–69 | Poor ⚠️ | Orange #F07850 |
| < 50 | Unhealthy ❌ | Red #E84A5F |

| Duration | Status |
|---|---|
| < 6h | Not enough |
| 6–7h | Below goal |
| 7–9h | Healthy range |
| > 9h | Oversleeping |

| Consistency (Std Dev) | Rating |
|---|---|
| 0–30 min | Excellent |
| 30–60 min | Good |
| 60–90 min | Fair |
| > 90 min | Poor |

---

*Build plan version 1.0 — SleepWise React Native App*
*Designed for GitHub Copilot-assisted development*
