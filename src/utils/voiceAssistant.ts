import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

const VOICE_OPTIONS: Speech.SpeechOptions = {
  language: 'en-US',
  pitch: 1.1,
  rate: 0.95
};

export async function speak(message: string) {
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  Speech.stop();
  Speech.speak(message, VOICE_OPTIONS);
}

export function stopSpeech() {
  Speech.stop();
}
