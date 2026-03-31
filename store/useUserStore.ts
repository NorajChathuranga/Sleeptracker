import { create } from 'zustand';

import { UserSettings } from '../types';
import { userRepository } from '../db/userRepository';

interface UserState {
  settings: UserSettings;
  isLoading: boolean;
  loadSettings: () => Promise<void>;
  updateSettings: (values: Partial<UserSettings>) => Promise<void>;
  completeOnboarding: (values: {
    name?: string;
    sleep_goal_min: number;
    target_bedtime: string;
    notifications_enabled: boolean;
  }) => Promise<void>;
  setBaseline: (payload: {
    baseline_established: boolean;
    baseline_avg_duration: number | null;
    baseline_score: number | null;
  }) => Promise<void>;
  resetSettings: () => Promise<void>;
}

export const useUserStore = create<UserState>((set) => ({
  settings: userRepository.defaults,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true });
    const loaded = await userRepository.getAll();
    set({ settings: loaded, isLoading: false });
  },

  updateSettings: async (values) => {
    await userRepository.setMany(values);
    set((state) => ({
      settings: {
        ...state.settings,
        ...values,
      },
    }));
  },

  completeOnboarding: async ({ name, sleep_goal_min, target_bedtime, notifications_enabled }) => {
    const payload: Partial<UserSettings> = {
      onboarding_done: true,
      sleep_goal_min,
      target_bedtime,
      notifications_enabled,
    };

    if (name && name.trim().length > 0) {
      payload.name = name.trim();
    }

    await userRepository.setMany(payload);

    set((state) => ({
      settings: {
        ...state.settings,
        ...payload,
      },
    }));
  },

  setBaseline: async (payload) => {
    await userRepository.setMany(payload);
    set((state) => ({
      settings: {
        ...state.settings,
        ...payload,
      },
    }));
  },

  resetSettings: async () => {
    await userRepository.clearAll();
    set({ settings: userRepository.defaults });
  },
}));
