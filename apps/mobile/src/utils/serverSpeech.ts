import * as FileSystem from 'expo-file-system';
import { useAudioPlayer, AudioSource } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? Constants.manifestExtra ?? {}) as {
  apiBaseUrl?: string;
};

const API_BASE_URL = trimTrailingSlash(extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || '');

let currentPlayer: ReturnType<typeof useAudioPlayer> | null = null;
let currentFileUri: string | null = null;

export async function speakViaServer(text: string) {
  if (!API_BASE_URL) {
    throw new Error('API base URL is not configured. Set EXPO_PUBLIC_API_BASE_URL.');
  }

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  await stopServerSpeech();

  const response = await fetch(`${API_BASE_URL}/api/tts/speak`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to fetch server speech');
  }

  const payload = (await response.json()) as { audio_content: string; audio_mime: string };
  const extension = mimeToExtension(payload.audio_mime);
  const fileUri = `${FileSystem.cacheDirectory}tts-${Date.now()}.${extension}`;

  await FileSystem.writeAsStringAsync(fileUri, payload.audio_content, {
    encoding: FileSystem.EncodingType.Base64
  });

  currentFileUri = fileUri;

  // Use expo-audio instead of expo-av
  const { createAudioPlayer } = await import('expo-audio');
  const player = createAudioPlayer(fileUri);
  
  currentPlayer = player;
  
  player.play();

  // Clean up after playback finishes
  const checkPlayback = setInterval(() => {
    if (player.playing === false && player.currentTime > 0) {
      clearInterval(checkPlayback);
      cleanup();
    }
  }, 100);
}

export async function stopServerSpeech() {
  if (currentPlayer) {
    currentPlayer.pause();
    cleanup();
  }
}

async function cleanup() {
  currentPlayer = null;
  if (currentFileUri) {
    await FileSystem.deleteAsync(currentFileUri, { idempotent: true }).catch(() => undefined);
    currentFileUri = null;
  }
}

function trimTrailingSlash(value: string): string {
  if (!value) return value;
  return value.endsWith('/') ? value.slice(0, -1) : value;
}

function mimeToExtension(mime: string) {
  if (mime.includes('ogg')) return 'ogg';
  if (mime.includes('wav')) return 'wav';
  return 'mp3';
}