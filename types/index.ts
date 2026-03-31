export interface SleepSession {
  id: string;
  date: string;
  sleep_start: string;
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
  sleep_goal_min: number;
  target_bedtime: string;
  alarm_time: string;
  alarm_enabled: boolean;
  onboarding_done: boolean;
  baseline_established: boolean;
  baseline_avg_duration: number | null;
  baseline_score: number | null;
  notifications_enabled: boolean;
}

export interface AdviceItem {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
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

export interface WeeklySummary {
  weekLabel: string;
  avgDurationMin: number;
  bestNight: SleepSession | null;
  worstNight: SleepSession | null;
  goalHitDays: number;
  consistencyStdDevMin: number;
  avgBedtimeMinutes: number | null;
  totalSleepMin: number;
  sleepDebtMin: number;
  moodAvgLongSleep: number | null;
  moodAvgShortSleep: number | null;
}
