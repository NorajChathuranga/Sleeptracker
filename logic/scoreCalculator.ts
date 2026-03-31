import { getHours, getMinutes } from 'date-fns';

import { stdDev } from '../utils/statsUtils';

export function calculateSleepScore(params: {
  duration_min: number;
  goal_min: number;
  sleep_start_times: Date[];
  sleep_start: Date;
}): { total: number; duration: number; consistency: number; timing: number } {
  const durationScore = calcDurationScore(params.duration_min, params.goal_min);
  const consistencyScore = calcConsistencyScore(params.sleep_start_times);
  const timingScore = calcTimingScore(params.sleep_start);

  const total = Math.round(
    durationScore * 0.4 + consistencyScore * 0.35 + timingScore * 0.25,
  );

  return {
    total,
    duration: durationScore,
    consistency: consistencyScore,
    timing: timingScore,
  };
}

function calcDurationScore(durationMin: number, goalMin: number): number {
  const hours = durationMin / 60;
  const goalHours = goalMin / 60;

  if (hours >= 7 && hours <= 9) return 100;
  if (hours >= 6 && hours < 7) return Math.round(70 + (hours - 6) * 30);
  if (hours > 9 && hours <= 10) return Math.round(100 - (hours - 9) * 30);
  if (hours < 6) return Math.max(0, Math.round(hours * 11.67));

  const penalty = Math.max(0, hours - Math.max(10, goalHours + 1));
  return Math.max(0, Math.round(80 - penalty * 20));
}

function calcConsistencyScore(sleepTimes: Date[]): number {
  if (sleepTimes.length < 2) return 80;

  const minutesFromMidnight = sleepTimes.map((d) => {
    const h = getHours(d);
    const m = getMinutes(d);
    return (h < 12 ? h + 24 : h) * 60 + m;
  });

  const spread = stdDev(minutesFromMidnight);

  if (spread <= 30) return 100;
  if (spread <= 60) return Math.round(100 - ((spread - 30) / 30) * 30);
  if (spread <= 120) return Math.round(70 - ((spread - 60) / 60) * 30);
  return Math.max(0, Math.round(40 - ((spread - 120) / 60) * 20));
}

function calcTimingScore(sleepStart: Date): number {
  const h = getHours(sleepStart);
  const adjustedHour = h < 12 ? h + 24 : h;

  if (adjustedHour >= 21 && adjustedHour <= 23) return 100;
  if (adjustedHour >= 20 && adjustedHour < 21) return 85;
  if (adjustedHour > 23 && adjustedHour <= 24) return 75;
  if (adjustedHour > 24 && adjustedHour <= 25) return 55;
  if (adjustedHour > 25 && adjustedHour <= 26) return 35;
  return 10;
}

export function getScoreLabel(score: number): 'Healthy' | 'Okay' | 'Poor' | 'Unhealthy' {
  if (score >= 85) return 'Healthy';
  if (score >= 70) return 'Okay';
  if (score >= 50) return 'Poor';
  return 'Unhealthy';
}
