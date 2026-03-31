export function calculateSleepDebt(
  sessions: { duration_min: number | null }[],
  goal_min: number,
): number {
  const last7 = sessions.slice(-7);
  let debt = 0;

  for (const session of last7) {
    if (session.duration_min === null) continue;
    const deficit = goal_min - session.duration_min;
    if (deficit > 0) debt += deficit;
  }

  return debt;
}
