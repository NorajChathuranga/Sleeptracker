import { getHours, getMinutes } from 'date-fns';

import { parseBedtimeToHM } from '../utils/timeUtils';
import { isExpoGo } from '../utils/runtimeEnv';

type NotificationsModule = typeof import('expo-notifications');
type ScheduledNotificationRequest = import('expo-notifications').NotificationRequest;

const BEDTIME_REMINDER_KIND = 'sleepwise-bedtime-reminder';
const DEBT_ALERT_KIND = 'sleepwise-debt-alert';
const WAKE_ALARM_KIND = 'sleepwise-wake-alarm';
const WAKE_ALARM_REPEAT_KIND = 'sleepwise-wake-alarm-repeat';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let handlerConfigured = false;

async function getNotificationsModule(): Promise<NotificationsModule | null> {
  if (isExpoGo()) {
    return null;
  }

  if (!notificationsModulePromise) {
    notificationsModulePromise = import('expo-notifications')
      .then((Notifications) => {
        if (!handlerConfigured) {
          Notifications.setNotificationHandler({
            handleNotification: async (notification) => {
              const data = notification.request.content.data as { kind?: unknown } | undefined;
              const isWakeAlarm =
                data?.kind === WAKE_ALARM_KIND || data?.kind === WAKE_ALARM_REPEAT_KIND;

              return {
              shouldShowAlert: true,
              shouldShowBanner: true,
              shouldShowList: true,
              shouldPlaySound: isWakeAlarm,
              shouldSetBadge: false,
              };
            },
          });
          handlerConfigured = true;
        }

        return Notifications;
      })
      .catch(() => null);
  }

  return notificationsModulePromise;
}

export function areNotificationsSupported(): boolean {
  return !isExpoGo();
}

export async function requestNotificationPermission(): Promise<boolean> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return false;

  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

export async function cancelAllScheduledNotifications(): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await Notifications.cancelAllScheduledNotificationsAsync();
}

async function cancelScheduledByKind(kind: string): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const targetIds = scheduled
    .filter((req: ScheduledNotificationRequest) => {
      const data = req.content.data as { kind?: unknown } | undefined;
      return data?.kind === kind;
    })
    .map((req: ScheduledNotificationRequest) => req.identifier);

  await Promise.all(targetIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
}

export async function scheduleAdaptiveBedtimeReminder(
  last7SleepTimes: Date[],
  fallbackBedtime: string,
): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelScheduledByKind(BEDTIME_REMINDER_KIND);

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
      data: { kind: BEDTIME_REMINDER_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: targetHour,
      minute: targetMinute,
    },
  });
}

export async function scheduleSleepDebtAlert(debt_min: number): Promise<void> {
  const Notifications = await getNotificationsModule();
  if (!Notifications) return;

  await cancelScheduledByKind(DEBT_ALERT_KIND);

  if (debt_min < 60) return;

  const debtH = Math.floor(debt_min / 60);
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'Sleep debt reminder',
      body: `You are carrying about ${debtH}h of sleep debt this week. Consider an earlier bedtime tonight.`,
      data: { kind: DEBT_ALERT_KIND },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 10,
      repeats: false,
    },
  });
}
