import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer, AudioSource } from 'expo-audio';
import { Platform } from 'react-native';

import type { AlarmSoundMode } from '../types';

let activePlayer: AudioPlayer | null = null;
let startPromise: Promise<void> | null = null;
let activeSourceKey: string | null = null;

const alarmLoopAsset = require('../assets/alarm-loop.wav');
const ANDROID_SYSTEM_ALARM_URI = 'content://settings/system/alarm_alert';

interface AlarmRingingOptions {
  mode: AlarmSoundMode;
  customSoundUri?: string | null;
}

interface ResolvedAlarmSource {
  source: AudioSource;
  sourceKey: string;
}

function resolvePreferredSource(options: AlarmRingingOptions): ResolvedAlarmSource {
  if (options.mode === 'custom' && options.customSoundUri) {
    return {
      source: options.customSoundUri,
      sourceKey: `custom:${options.customSoundUri}`,
    };
  }

  if (Platform.OS === 'android') {
    return {
      source: ANDROID_SYSTEM_ALARM_URI,
      sourceKey: `system:${ANDROID_SYSTEM_ALARM_URI}`,
    };
  }

  return {
    source: alarmLoopAsset,
    sourceKey: 'asset:alarm-loop',
  };
}

function resolveFallbackSource(): ResolvedAlarmSource {
  return {
    source: alarmLoopAsset,
    sourceKey: 'asset:alarm-loop',
  };
}

function preparePlayerForSource(resolved: ResolvedAlarmSource): AudioPlayer {
  if (!activePlayer) {
    activePlayer = createAudioPlayer(resolved.source);
    activeSourceKey = resolved.sourceKey;
    return activePlayer;
  }

  if (activeSourceKey !== resolved.sourceKey) {
    activePlayer.replace(resolved.source);
    activeSourceKey = resolved.sourceKey;
  }

  return activePlayer;
}

async function configureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  });
}

export async function startAlarmRingingLoop(
  options: AlarmRingingOptions = { mode: 'system' },
): Promise<void> {
  if (activePlayer && activePlayer.playing) {
    return;
  }

  if (startPromise) {
    await startPromise;
    return;
  }

  startPromise = (async () => {
    await configureAudioMode();

    const preferred = resolvePreferredSource(options);
    const fallback = resolveFallbackSource();

    try {
      const player = preparePlayerForSource(preferred);
      player.loop = true;
      player.volume = 1;
      player.play();
    } catch {
      const player = preparePlayerForSource(fallback);
      player.loop = true;
      player.volume = 1;
      player.play();
    }
  })().finally(() => {
    startPromise = null;
  });

  await startPromise;
}

export async function stopAlarmRingingLoop(): Promise<void> {
  if (startPromise) {
    await startPromise;
  }

  if (!activePlayer) return;

  try {
    activePlayer.pause();
  } catch {
    // Ignore pause errors during teardown.
  }

  try {
    activePlayer.remove();
  } catch {
    // Ignore remove errors during teardown.
  }

  activePlayer = null;
  activeSourceKey = null;
}
