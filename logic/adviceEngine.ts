import { AdviceItem, SleepSession } from '../types';

export function generateAdvice(params: {
  avg_duration_min: number;
  goal_min: number;
  consistency_std_dev_min: number;
  avg_sleep_hour: number;
  sleep_debt_min: number;
  mood_duration_correlation: boolean;
  goal_hit_days: number;
}): AdviceItem[] {
  const advice: AdviceItem[] = [];
  const avgH = params.avg_duration_min / 60;
  const goalH = params.goal_min / 60;

  if (avgH < 6) {
    advice.push({
      type: 'warning',
      title: 'Critically low sleep',
      message:
        "You're averaging less than 6h. Sleep deprivation affects memory, mood, and immune function.",
    });
  } else if (avgH < goalH - 0.5) {
    advice.push({
      type: 'warning',
      title: 'Below your sleep goal',
      message: `You're averaging ${avgH.toFixed(1)}h but your goal is ${goalH.toFixed(1)}h. Try sleeping 30m earlier.`,
    });
  } else if (avgH >= 7 && avgH <= 9) {
    advice.push({
      type: 'success',
      title: 'Good sleep duration',
      message: `You're in the healthy range at ${avgH.toFixed(1)}h on average. Keep it up.`,
    });
  }

  if (params.consistency_std_dev_min > 90) {
    advice.push({
      type: 'warning',
      title: 'Irregular sleep schedule',
      message:
        'Your bedtime varies a lot. Aim for a consistent sleep window within +/- 30 minutes.',
    });
  } else if (params.consistency_std_dev_min > 45) {
    advice.push({
      type: 'info',
      title: 'Slight bedtime inconsistency',
      message: 'A steadier bedtime can improve next-day energy and sleep quality.',
    });
  }

  if (params.avg_sleep_hour > 25) {
    advice.push({
      type: 'warning',
      title: 'Sleeping too late',
      message: 'Your average bedtime is after 1 AM. Shift earlier by about 30 minutes each week.',
    });
  }

  if (params.sleep_debt_min > 120) {
    const debtH = Math.floor(params.sleep_debt_min / 60);
    const debtM = params.sleep_debt_min % 60;
    advice.push({
      type: 'warning',
      title: 'Sleep debt building up',
      message: `Current debt is ${debtH}h ${debtM}m. Recover over several nights instead of one long sleep.`,
    });
  }

  if (params.mood_duration_correlation) {
    advice.push({
      type: 'info',
      title: 'Sleep affects your mood',
      message: 'Your mood appears lower after shorter sleep nights. Protect your sleep window.',
    });
  }

  if (params.goal_hit_days >= 5) {
    advice.push({
      type: 'success',
      title: 'Great consistency this week',
      message: `You hit your sleep goal ${params.goal_hit_days}/7 nights. Excellent pattern.`,
    });
  }

  if (!advice.length) {
    advice.push({
      type: 'info',
      title: 'Keep logging daily',
      message: 'More nights give better insight and more personalized recommendations.',
    });
  }

  return advice;
}

export function hasMoodDurationCorrelation(sessions: SleepSession[]): boolean {
  const withMood = sessions.filter(
    (session) => session.duration_min !== null && session.mood_on_wake !== null,
  );

  const shortSleep = withMood.filter((session) => (session.duration_min ?? 0) < 360);
  const longerSleep = withMood.filter((session) => (session.duration_min ?? 0) >= 420);

  if (!shortSleep.length || !longerSleep.length) return false;

  const shortAvg =
    shortSleep.reduce((sum, session) => sum + (session.mood_on_wake ?? 0), 0) / shortSleep.length;
  const longAvg =
    longerSleep.reduce((sum, session) => sum + (session.mood_on_wake ?? 0), 0) / longerSleep.length;

  return longAvg - shortAvg >= 0.8;
}
