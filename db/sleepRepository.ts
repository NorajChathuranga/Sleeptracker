import { SleepSession } from '../types';
import { getDb } from './database';

function mapSession(row: any): SleepSession {
  return {
    id: row.id,
    date: row.date,
    sleep_start: row.sleep_start,
    wake_time: row.wake_time,
    duration_min: row.duration_min,
    mood_on_wake: row.mood_on_wake,
    notes: row.notes,
    auto_detected: Boolean(row.auto_detected),
    health_score: row.health_score,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const sleepRepository = {
  async getAll(): Promise<SleepSession[]> {
    const db = await getDb();
    const rows = await db.getAllAsync<any>(
      'SELECT * FROM sleep_sessions ORDER BY date ASC, created_at ASC;',
    );
    return rows.map(mapSession);
  },

  async getById(id: string): Promise<SleepSession | null> {
    const db = await getDb();
    const row = await db.getFirstAsync<any>(
      'SELECT * FROM sleep_sessions WHERE id = ? LIMIT 1;',
      [id],
    );
    return row ? mapSession(row) : null;
  },

  async insert(session: SleepSession): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO sleep_sessions
        (id, date, sleep_start, wake_time, duration_min, mood_on_wake, notes, auto_detected, health_score, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        session.id,
        session.date,
        session.sleep_start,
        session.wake_time,
        session.duration_min,
        session.mood_on_wake,
        session.notes,
        session.auto_detected ? 1 : 0,
        session.health_score,
        session.created_at,
        session.updated_at,
      ],
    );
  },

  async update(session: SleepSession): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `UPDATE sleep_sessions
       SET date = ?, sleep_start = ?, wake_time = ?, duration_min = ?, mood_on_wake = ?,
           notes = ?, auto_detected = ?, health_score = ?, updated_at = ?
       WHERE id = ?;`,
      [
        session.date,
        session.sleep_start,
        session.wake_time,
        session.duration_min,
        session.mood_on_wake,
        session.notes,
        session.auto_detected ? 1 : 0,
        session.health_score,
        session.updated_at,
        session.id,
      ],
    );
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM sleep_sessions;');
  },
};
