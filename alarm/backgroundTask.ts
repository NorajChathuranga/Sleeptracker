import * as TaskManager from 'expo-task-manager';

import { useSleepStore } from '../store/useSleepStore';
import { isExpoGo } from '../utils/runtimeEnv';

export const WAKE_ALARM_BACKGROUND_TASK = 'sleepwise-wake-alarm-task';

function isWakeAlarmPayload(payload: unknown): boolean {
	if (!payload || typeof payload !== 'object') return false;

	const asRecord = payload as {
		notification?: { request?: { content?: { data?: unknown } } };
		data?: unknown;
	};

	const nestedData = asRecord.notification?.request?.content?.data;
	const directData = asRecord.data;

	const hasWakeAlarmKind = (data: unknown): boolean => {
		if (!data || typeof data !== 'object') return false;
		return (data as { kind?: unknown }).kind === 'sleepwise-wake-alarm';
	};

	return hasWakeAlarmKind(nestedData) || hasWakeAlarmKind(directData);
}

if (!TaskManager.isTaskDefined(WAKE_ALARM_BACKGROUND_TASK)) {
	TaskManager.defineTask(WAKE_ALARM_BACKGROUND_TASK, async ({ data, error }) => {
		if (error) return;
		if (!isWakeAlarmPayload(data)) return;

		await useSleepStore.getState().handleWakeAlarmTriggered();
	});
}

export async function registerWakeAlarmBackgroundTask(): Promise<void> {
	if (isExpoGo()) return;

	const Notifications = await import('expo-notifications').catch(() => null);
	if (!Notifications) return;

	const isRegistered = await TaskManager.isTaskRegisteredAsync(WAKE_ALARM_BACKGROUND_TASK);
	if (isRegistered) return;

	try {
		await Notifications.registerTaskAsync(WAKE_ALARM_BACKGROUND_TASK);
	} catch {
		// Best effort registration; listeners still handle foreground/response flow.
	}
}

