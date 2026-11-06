import { apiFetch } from './api';

// Narration is synthesized server-side by /api/tts (Gemini text-to-speech;
// voice and model are configured there). This module only fetches and
// caches the audio. The file keeps its historical name so imports stay put.

// Audio cache to avoid re-generating the same text
const audioCache = new Map<string, string>();

export async function generateSpeech(text: string): Promise<string> {
  // Check cache first
  const cached = audioCache.get(text);
  if (cached) {
    return cached;
  }

  const response = await apiFetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS API error: ${response.status} - ${error}`);
  }

  // Convert response to blob URL for audio playback
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  // Cache the result
  audioCache.set(text, audioUrl);

  return audioUrl;
}

// Clear cache (useful for memory management)
export function clearAudioCache(): void {
  // Revoke all blob URLs to free memory
  audioCache.forEach((url) => URL.revokeObjectURL(url));
  audioCache.clear();
}

// Pre-generate audio for multiple texts (for preloading)
export async function preloadSpeech(texts: string[]): Promise<void> {
  await Promise.all(texts.map((text) => generateSpeech(text)));
}
