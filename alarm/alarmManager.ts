import type {
	Notification,
	NotificationResponse,
	Subscription,
} from 'expo-notifications';

type NotificationsModule = typeof import('expo-notifications');

const ALARM_CHANNEL_ID = 'sleepwise-wake-alarm';
const WAKE_ALARM_KIND = 'sleepwise-wake-alarm';

let notificationsModulePromise: Promise<NotificationsModule | null> | null = null;
let lastScheduledAlarmId: string | null = null;

function parseHHMM(value: string): { hour: number; minute: number } {
	const parts = value.split(':');
	const hour = Number(parts[0]);
	const minute = Number(parts[1]);

	if (!Number.isFinite(hour) || hour < 0 || hour > 23) {
		return { hour: 6, minute: 30 };
	}
	if (!Number.isFinite(minute) || minute < 0 || minute > 59) {
		return { hour: 6, minute: 30 };
	}

	return { hour, minute };
}

function computeNextAlarmDate(hhmm: string): Date {
	const { hour, minute } = parseHHMM(hhmm);
	const now = new Date();
	const next = new Date(now);
	next.setHours(hour, minute, 0, 0);

	if (next.getTime() <= now.getTime()) {
		next.setDate(next.getDate() + 1);
	}

	return next;
}

function isWakeAlarmData(data: unknown): boolean {
	if (!data || typeof data !== 'object') return false;
	const record = data as { kind?: unknown };
	return record.kind === WAKE_ALARM_KIND;
}

async function getNotificationsModule(): Promise<NotificationsModule | null> {
	if (!notificationsModulePromise) {
		notificationsModulePromise = import('expo-notifications').catch(() => null);
	}
	return notificationsModulePromise;
}

async function ensureAlarmChannel(Notifications: NotificationsModule): Promise<void> {
	await Notifications.setNotificationChannelAsync(ALARM_CHANNEL_ID, {
		name: 'Sleep Alarm',
		importance: Notifications.AndroidImportance.MAX,
		lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
		vibrationPattern: [0, 250, 250, 250, 250],
		sound: 'default',
		enableLights: true,
		enableVibrate: true,
	});
}

export async function requestAlarmPermission(): Promise<boolean> {
	const Notifications = await getNotificationsModule();
	if (!Notifications) return false;

	const existing = await Notifications.getPermissionsAsync();
	if (existing.granted) return true;

	const requested = await Notifications.requestPermissionsAsync();
	return requested.granted;
}

export async function cancelWakeAlarm(): Promise<void> {
	const Notifications = await getNotificationsModule();
	if (!Notifications) return;

	const scheduled = await Notifications.getAllScheduledNotificationsAsync();
	const alarmIds = scheduled
		.filter((req) => isWakeAlarmData(req.content.data))
		.map((req) => req.identifier);

	if (lastScheduledAlarmId) {
		alarmIds.push(lastScheduledAlarmId);
	}

	const uniqueIds = [...new Set(alarmIds)];
	await Promise.all(uniqueIds.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
	lastScheduledAlarmId = null;
}

export async function scheduleWakeAlarm(alarmTimeHHMM: string): Promise<Date | null> {
	const Notifications = await getNotificationsModule();
	if (!Notifications) return null;

	const granted = await requestAlarmPermission();
	if (!granted) return null;

	await cancelWakeAlarm();
	await ensureAlarmChannel(Notifications);

	const nextAlarm = computeNextAlarmDate(alarmTimeHHMM);
	const identifier = await Notifications.scheduleNotificationAsync({
		content: {
			title: 'Wake up',
			body: 'Your sleep alarm is ringing.',
			sound: 'default',
			priority: Notifications.AndroidNotificationPriority.MAX,
			data: {
				kind: WAKE_ALARM_KIND,
				alarmTime: alarmTimeHHMM,
			},
		},
		trigger: {
			type: Notifications.SchedulableTriggerInputTypes.DATE,
			date: nextAlarm,
			channelId: ALARM_CHANNEL_ID,
		},
	});

	lastScheduledAlarmId = identifier;
	return nextAlarm;
}

function shouldHandleWakeAlarmNotification(notification: Notification): boolean {
	return isWakeAlarmData(notification.request.content.data);
}

function shouldHandleWakeAlarmResponse(response: NotificationResponse): boolean {
	return isWakeAlarmData(response.notification.request.content.data);
}

export async function initializeWakeAlarmListeners(
	onAlarmTriggered: () => Promise<void> | void,
): Promise<() => void> {
	const Notifications = await getNotificationsModule();
	if (!Notifications) return () => undefined;

	const receivedSub: Subscription = Notifications.addNotificationReceivedListener((notification) => {
		if (!shouldHandleWakeAlarmNotification(notification)) return;
		void onAlarmTriggered();
	});

	const responseSub: Subscription = Notifications.addNotificationResponseReceivedListener((response) => {
		if (!shouldHandleWakeAlarmResponse(response)) return;
		void onAlarmTriggered();
	});

	return () => {
		receivedSub.remove();
		responseSub.remove();
	};
}

