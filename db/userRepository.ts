import { UserSettings } from '../types';
import { SleepConfig } from '../constants/sleepConfig';
import { getDb } from './database';

const defaultSettings: UserSettings = {
  name: 'Friend',
  sleep_goal_min: SleepConfig.defaultGoalMin,
  target_bedtime: '22:30',
  onboarding_done: false,
  baseline_established: false,
  baseline_avg_duration: null,
  baseline_score: null,
  notifications_enabled: true,
};

function serializeValue(value: string | number | boolean | null): string {
  if (value === null) return 'null';
  return String(value);
}

function deserializeByKey(key: keyof UserSettings, value: string): UserSettings[keyof UserSettings] {
  if (value === 'null') return null as UserSettings[keyof UserSettings];

  if (key === 'sleep_goal_min') return Number(value);
  if (key === 'baseline_avg_duration') return Number(value);
  if (key === 'baseline_score') return Number(value);

  if (
    key === 'onboarding_done' ||
    key === 'baseline_established' ||
    key === 'notifications_enabled'
  ) {
    return (value === 'true') as UserSettings[keyof UserSettings];
  }

  return value as UserSettings[keyof UserSettings];
}

export const userRepository = {
  async getAll(): Promise<UserSettings> {
    const db = await getDb();
    const rows = await db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM user_settings;',
    );

    const merged: UserSettings = { ...defaultSettings };

    for (const row of rows) {
      const key = row.key as keyof UserSettings;
      if (!(key in merged)) continue;
      merged[key] = deserializeByKey(key, row.value) as never;
    }

    return merged;
  },

  async set<K extends keyof UserSettings>(key: K, value: UserSettings[K]): Promise<void> {
    const db = await getDb();
    await db.runAsync(
      `INSERT INTO user_settings (key, value)
       VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
      [key, serializeValue(value)],
    );
  },

  async setMany(values: Partial<UserSettings>): Promise<void> {
    const entries = Object.entries(values) as Array<
      [keyof UserSettings, UserSettings[keyof UserSettings]]
    >;

    const db = await getDb();
    for (const [key, value] of entries) {
      await db.runAsync(
        `INSERT INTO user_settings (key, value)
         VALUES (?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
        [key, serializeValue(value)],
      );
    }
  },

  async clearAll(): Promise<void> {
    const db = await getDb();
    await db.runAsync('DELETE FROM user_settings;');
  },

  defaults: defaultSettings,
};
