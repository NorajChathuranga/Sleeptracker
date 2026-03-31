import * as Notifications from 'expo-notifications';
import { getHours, getMinutes } from 'date-fns';

import { parseBedtimeToHM } from '../utils/timeUtils';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
  }),
});

export async function requestNotificationPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function scheduleAdaptiveBedtimeReminder(
  last7SleepTimes: Date[],
  fallbackBedtime: string,
): Promise<void> {
  await Notifications.cancelAllScheduledNotificationsAsync();

  let targetHour = 22;
  let targetMinute = 0;

  if (last7SleepTimes.length >= 3) {
    const avgMinutes =
      last7SleepTimes.reduce((sum, date) => {
        const h = getHours(date);
        const m = getMinutes(date);
        return sum + (h < 12 ? h + 24 : h) * 60 + m;
      }, 0) / last7SleepTimes.length;

    const reminderMin = Math.round(avgMinutes - 30);
    targetHour = ((Math.floor(reminderMin / 60) % 24) + 24) % 24;
    targetMinute = ((reminderMin % 60) + 60) % 60;
  } else {
    const fallback = parseBedtimeToHM(fallbackBedtime);
    targetHour = fallback.hour;
    targetMinute = fallback.minute;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Bedtime soon',
      body: 'Start winding down now so falling asleep feels easier.',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: targetHour,
      minute: targetMinute,
    },
  });
}

export async function scheduleSleepDebtAlert(debt_min: number): Promise<void> {
  if (debt_min < 60) return;

  const debtH = Math.floor(debt_min / 60);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sleep debt reminder',
      body: `You are carrying about ${debtH}h of sleep debt this week. Consider an earlier bedtime tonight.`,
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
    },
  });
}
