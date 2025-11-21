import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';

const extra = (Constants.expoConfig?.extra ?? Constants.manifestExtra ?? {}) as {
  apiBaseUrl?: string;
};

const API_BASE_URL = trimTrailingSlash(extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL || '');

let currentSound: Audio.Sound | null = null;

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

  const { sound } = await Audio.Sound.createAsync({ uri: fileUri }, { shouldPlay: true });
  currentSound = sound;
  sound.setOnPlaybackStatusUpdate((status) => {
    if (!status.isLoaded) return;
    if (status.didJustFinish || status.isPlaying === false) {
      sound.unloadAsync();
      FileSystem.deleteAsync(fileUri, { idempotent: true }).catch(() => undefined);
      currentSound = null;
    }
  });
}

export async function stopServerSpeech() {
  if (currentSound) {
    await currentSound.stopAsync().catch(() => undefined);
    await currentSound.unloadAsync().catch(() => undefined);
    currentSound = null;
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
