import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import type { AudioPlayer } from 'expo-audio';

let activePlayer: AudioPlayer | null = null;
let startPromise: Promise<void> | null = null;

const alarmLoopAsset = require('../assets/alarm-loop.wav');

async function configureAudioMode(): Promise<void> {
  await setAudioModeAsync({
    allowsRecording: false,
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: 'doNotMix',
    shouldRouteThroughEarpiece: false,
  });
}

export async function startAlarmRingingLoop(): Promise<void> {
  if (activePlayer && activePlayer.playing) {
    return;
  }

  if (startPromise) {
    await startPromise;
    return;
  }

  startPromise = (async () => {
    await configureAudioMode();

    if (!activePlayer) {
      activePlayer = createAudioPlayer(alarmLoopAsset);
    }

    activePlayer.loop = true;
    activePlayer.volume = 1;
    activePlayer.play();
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
}
