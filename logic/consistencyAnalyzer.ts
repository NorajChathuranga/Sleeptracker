import { format, parseISO, startOfWeek } from 'date-fns';

import { SleepSession, WeeklySummary } from '../types';
import { calculateSleepDebt } from './sleepDebt';
import { stdDev } from '../utils/statsUtils';
import { toAdjustedMinutes } from '../utils/timeUtils';

export function getWeekSessions(sessions: SleepSession[], weekOffset = 0): SleepSession[] {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  weekStart.setDate(weekStart.getDate() + weekOffset * 7);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return sessions.filter((session) => {
    const d = parseISO(session.date);
    return d >= weekStart && d <= weekEnd;
  });
}

export function buildWeeklySummary(
  sessions: SleepSession[],
  goalMin: number,
  weekOffset = 0,
): WeeklySummary {
  const weekSessions = getWeekSessions(
    sessions.filter((session) => session.wake_time !== null),
    weekOffset,
  );

  const ordered = [...weekSessions].sort((a, b) => a.date.localeCompare(b.date));
  const durations = ordered.map((session) => session.duration_min ?? 0);
  const totalSleepMin = durations.reduce((sum, value) => sum + value, 0);
  const avgDurationMin = ordered.length ? Math.round(totalSleepMin / ordered.length) : 0;
  const goalHitDays = ordered.filter((session) => (session.duration_min ?? 0) >= goalMin).length;

  const bedtimeMinutes = ordered.map((session) => toAdjustedMinutes(parseISO(session.sleep_start)));
  const consistencyStdDevMin = Math.round(stdDev(bedtimeMinutes));
  const avgBedtimeMinutes = bedtimeMinutes.length
    ? Math.round(bedtimeMinutes.reduce((sum, value) => sum + value, 0) / bedtimeMinutes.length)
    : null;

  const bestNight =
    ordered.length > 0
      ? ordered.reduce((best, current) =>
          (current.duration_min ?? 0) > (best.duration_min ?? 0) ? current : best,
        )
      : null;

  const worstNight =
    ordered.length > 0
      ? ordered.reduce((worst, current) =>
          (current.duration_min ?? Infinity) < (worst.duration_min ?? Infinity) ? current : worst,
        )
      : null;

  const moodLong = ordered
    .filter((session) => (session.duration_min ?? 0) >= 420 && session.mood_on_wake !== null)
    .map((session) => session.mood_on_wake as number);
  const moodShort = ordered
    .filter((session) => (session.duration_min ?? 0) < 360 && session.mood_on_wake !== null)
    .map((session) => session.mood_on_wake as number);

  const moodAvgLongSleep = moodLong.length
    ? Number((moodLong.reduce((sum, value) => sum + value, 0) / moodLong.length).toFixed(1))
    : null;
  const moodAvgShortSleep = moodShort.length
    ? Number((moodShort.reduce((sum, value) => sum + value, 0) / moodShort.length).toFixed(1))
    : null;

  const label = ordered.length
    ? `${format(parseISO(ordered[0].date), 'MMM d')} - ${format(parseISO(ordered[ordered.length - 1].date), 'MMM d')}`
    : format(new Date(), 'MMM d');

  return {
    weekLabel: label,
    avgDurationMin,
    bestNight,
    worstNight,
    goalHitDays,
    consistencyStdDevMin,
    avgBedtimeMinutes,
    totalSleepMin,
    sleepDebtMin: calculateSleepDebt(ordered, goalMin),
    moodAvgLongSleep,
    moodAvgShortSleep,
  };
}
