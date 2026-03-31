import { create } from 'zustand';
import { differenceInHours, differenceInMinutes, format } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';

import { SleepConfig } from '../constants/sleepConfig';
import { sleepRepository } from '../db/sleepRepository';
import { buildBaseline } from '../logic/baselineAnalyzer';
import { calculateSleepScore } from '../logic/scoreCalculator';
import {
  cancelWakeAlarm,
  cancelWakeAlarmEscalation,
  scheduleWakeAlarm,
  scheduleWakeAlarmEscalation,
  scheduleWakeAlarmInMinutes,
} from '../alarm/alarmManager';
import { startAlarmRingingLoop, stopAlarmRingingLoop } from '../alarm/ringingManager';
import {
  scheduleAdaptiveBedtimeReminder,
  scheduleSleepDebtAlert,
} from '../notifications/notificationManager';
import { SleepSession } from '../types';
import { calculateSleepDebt } from '../logic/sleepDebt';
import { useUserStore } from './useUserStore';

interface EndSleepPayload {
  mood: 1 | 2 | 3 | 4 | 5 | null;
  notes: string | null;
}

interface WakeSummary {
  sessionId: string;
  durationMin: number;
  wakeTimeIso: string;
}

interface RingingAlarm {
  triggeredAtIso: string;
}

interface SleepState {
  sessions: SleepSession[];
  activeSession: SleepSession | null;
  pendingWakeSummary: WakeSummary | null;
  ringingAlarm: RingingAlarm | null;
  isLoading: boolean;
  isAutoEndingByAlarm: boolean;
  loadSessions: () => Promise<void>;
  startSleep: () => Promise<void>;
  endSleep: (payload: EndSleepPayload) => Promise<SleepSession | null>;
  autoEndSleepFromAlarm: () => Promise<SleepSession | null>;
  handleWakeAlarmTriggered: (options?: { allowAudio?: boolean }) => Promise<void>;
  dismissWakeAlarm: () => Promise<void>;
  snoozeWakeAlarm: (minutes?: number) => Promise<void>;
  clearPendingWakeSummary: () => void;
  getLast7Days: () => SleepSession[];
  getTodaySession: () => SleepSession | null;
  recoverStaleSession: () => Promise<SleepSession | null>;
  discardActiveSession: () => Promise<void>;
  clearAllData: () => Promise<void>;
}

function getCompletedSessions(sessions: SleepSession[]): SleepSession[] {
  return sessions
    .filter((session) => session.wake_time !== null)
    .sort((a, b) => a.date.localeCompare(b.date));
}

export const useSleepStore = create<SleepState>((set, get) => ({
  sessions: [],
  activeSession: null,
  pendingWakeSummary: null,
  ringingAlarm: null,
  isLoading: false,
  isAutoEndingByAlarm: false,

  loadSessions: async () => {
    set({ isLoading: true });
    const sessions = await sleepRepository.getAll();
    const activeSession = sessions.find((session) => session.wake_time === null) ?? null;
    set({ sessions, activeSession, isLoading: false });
  },

  startSleep: async () => {
    if (get().activeSession) return;

    const now = new Date();
    const session: SleepSession = {
      id: uuidv4(),
      date: format(now, 'yyyy-MM-dd'),
      sleep_start: now.toISOString(),
      wake_time: null,
      duration_min: null,
      mood_on_wake: null,
      notes: null,
      auto_detected: false,
      health_score: null,
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
    };

    await sleepRepository.insert(session);

    set((state) => ({
      sessions: [...state.sessions, session],
      activeSession: session,
    }));

    const userSettings = useUserStore.getState().settings;
    if (userSettings.alarm_enabled) {
      await scheduleWakeAlarm(userSettings.alarm_time);
    }
  },

  endSleep: async ({ mood, notes }) => {
    const active = get().activeSession;
    if (!active) return null;

    await cancelWakeAlarm();
    await cancelWakeAlarmEscalation();
    await stopAlarmRingingLoop();

    const now = new Date();
    const rawDuration = differenceInMinutes(now, new Date(active.sleep_start));
    const duration_min = Math.min(Math.max(rawDuration, 0), 24 * 60);

    const completed = getCompletedSessions(get().sessions);
    const last7starts = completed.slice(-7).map((session) => new Date(session.sleep_start));

    const userSettings = useUserStore.getState().settings;
    const score = calculateSleepScore({
      duration_min,
      goal_min: userSettings.sleep_goal_min,
      sleep_start_times: last7starts,
      sleep_start: new Date(active.sleep_start),
    });

    const updated: SleepSession = {
      ...active,
      wake_time: now.toISOString(),
      duration_min,
      mood_on_wake: mood,
      notes,
      health_score: score.total,
      updated_at: now.toISOString(),
    };

    await sleepRepository.update(updated);

    const updatedSessions = get().sessions.map((session) =>
      session.id === updated.id ? updated : session,
    );

    set({ sessions: updatedSessions, activeSession: null });

    const completedUpdated = getCompletedSessions(updatedSessions);
    const baseline = buildBaseline(completedUpdated);
    if (baseline.established) {
      await useUserStore.getState().setBaseline({
        baseline_established: true,
        baseline_avg_duration: baseline.avg_duration_min,
        baseline_score: baseline.avg_score,
      });
    }

    const debt = calculateSleepDebt(completedUpdated, userSettings.sleep_goal_min);
    if (userSettings.notifications_enabled) {
      await scheduleAdaptiveBedtimeReminder(
        completedUpdated.slice(-7).map((session) => new Date(session.sleep_start)),
        userSettings.target_bedtime,
      );
      await scheduleSleepDebtAlert(debt);
    }

    return updated;
  },

  autoEndSleepFromAlarm: async () => {
    const active = get().activeSession;
    if (!active) return null;
    if (get().isAutoEndingByAlarm) return null;

    set({ isAutoEndingByAlarm: true });

    try {
      const updated = await get().endSleep({ mood: null, notes: 'Auto-ended by alarm' });
      if (!updated) return null;

      set({
        pendingWakeSummary: {
          sessionId: updated.id,
          durationMin: updated.duration_min ?? 0,
          wakeTimeIso: updated.wake_time ?? new Date().toISOString(),
        },
      });

      return updated;
    } finally {
      set({ isAutoEndingByAlarm: false });
    }
  },

  handleWakeAlarmTriggered: async ({ allowAudio = true } = {}) => {
    if (!get().ringingAlarm) {
      set({ ringingAlarm: { triggeredAtIso: new Date().toISOString() } });
    }

    await get().autoEndSleepFromAlarm();
    await scheduleWakeAlarmEscalation();

    if (allowAudio) {
      await startAlarmRingingLoop();
    }
  },

  dismissWakeAlarm: async () => {
    await stopAlarmRingingLoop();
    await cancelWakeAlarm();
    await cancelWakeAlarmEscalation();
    set({ ringingAlarm: null, pendingWakeSummary: null });
  },

  snoozeWakeAlarm: async (minutes = 10) => {
    await stopAlarmRingingLoop();
    await cancelWakeAlarmEscalation();
    await scheduleWakeAlarmInMinutes(minutes);
    set({ ringingAlarm: null });
  },

  clearPendingWakeSummary: () => {
    set({ pendingWakeSummary: null });
  },

  getLast7Days: () => getCompletedSessions(get().sessions).slice(-7),

  getTodaySession: () => {
    const today = format(new Date(), 'yyyy-MM-dd');
    return get().sessions.find((session) => session.date === today) ?? null;
  },

  recoverStaleSession: async () => {
    const active = get().activeSession;
    if (!active) return null;

    const startedAt = new Date(active.sleep_start);
    const hoursOpen = differenceInHours(new Date(), startedAt);

    if (hoursOpen < SleepConfig.staleSessionLimitHours) return null;
    return active;
  },

  discardActiveSession: async () => {
    const active = get().activeSession;
    if (!active) return;

    const discarded: SleepSession = {
      ...active,
      wake_time: new Date(active.sleep_start).toISOString(),
      duration_min: 0,
      notes: 'Discarded stale active session',
      updated_at: new Date().toISOString(),
    };

    await sleepRepository.update(discarded);

    set((state) => ({
      sessions: state.sessions.map((session) =>
        session.id === discarded.id ? discarded : session,
      ),
      activeSession: null,
    }));
  },

  clearAllData: async () => {
    await sleepRepository.clearAll();
    await cancelWakeAlarm();
    await cancelWakeAlarmEscalation();
    await stopAlarmRingingLoop();
    set({ sessions: [], activeSession: null, pendingWakeSummary: null, ringingAlarm: null });
  },
}));
