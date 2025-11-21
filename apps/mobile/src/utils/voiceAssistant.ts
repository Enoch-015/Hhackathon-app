import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';
import Constants from 'expo-constants';

import { speakViaServer, stopServerSpeech } from './serverSpeech';

const VOICE_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  pitch: 1.1,
  rate: 0.95
};

const extra = (Constants.expoConfig?.extra ?? Constants.manifestExtra ?? {}) as {
  apiBaseUrl?: string;
};

const SERVER_SPEECH_ENABLED = Boolean(extra?.apiBaseUrl || process.env.EXPO_PUBLIC_API_BASE_URL);

export async function speak(message: string) {
  if (SERVER_SPEECH_ENABLED) {
    try {
      await speakViaServer(message);
      return;
    } catch (error) {
      console.warn('[voiceAssistant] Server speech failed, falling back to Expo Speech:', error);
    }
  }
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Speech.stop();
  Speech.speak(message, VOICE_OPTIONS);
}

export function stopSpeech() {
  stopServerSpeech().catch(() => undefined);
  Speech.stop();
}
