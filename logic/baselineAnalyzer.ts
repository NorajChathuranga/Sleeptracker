import { SleepSession } from '../types';

export function buildBaseline(sessions: SleepSession[]): {
  avg_duration_min: number;
  avg_score: number;
  established: boolean;
} {
  if (sessions.length < 7) {
    return { avg_duration_min: 0, avg_score: 0, established: false };
  }

  const first7 = sessions
    .filter((session) => session.wake_time !== null)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 7);

  if (first7.length < 7) {
    return { avg_duration_min: 0, avg_score: 0, established: false };
  }

  const avg_duration_min = Math.round(
    first7.reduce((sum, session) => sum + (session.duration_min ?? 0), 0) / first7.length,
  );

  const avg_score = Math.round(
    first7.reduce((sum, session) => sum + (session.health_score ?? 0), 0) / first7.length,
  );

  return {
    avg_duration_min,
    avg_score,
    established: true,
  };
}
