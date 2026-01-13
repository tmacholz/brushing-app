// Custom child-friendly voice from ElevenLabs
const DEFAULT_VOICE_ID = '0z8S749Xe6jLCD34QXl1';

export interface TTSOptions {
  voiceId?: string;
  modelId?: string;
  stability?: number;
  similarityBoost?: number;
  style?: number;
  useSpeakerBoost?: boolean;
}

const defaultOptions: TTSOptions = {
  voiceId: DEFAULT_VOICE_ID,
  modelId: 'eleven_turbo_v2_5', // Fast, low-latency model
  stability: 0.5,
  similarityBoost: 0.75,
  style: 0.5,
  useSpeakerBoost: true,
};

// Audio cache to avoid re-generating the same text
const audioCache = new Map<string, string>();

function getCacheKey(text: string, voiceId: string): string {
  return `${voiceId}:${text}`;
}

export async function generateSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<string> {
  const opts = { ...defaultOptions, ...options };
  const cacheKey = getCacheKey(text, opts.voiceId!);

  // Check cache first
  const cached = audioCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  // Call our serverless function instead of ElevenLabs directly
  const response = await fetch('/api/tts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      voiceId: opts.voiceId,
      modelId: opts.modelId,
      voiceSettings: {
        stability: opts.stability,
        similarity_boost: opts.similarityBoost,
        style: opts.style,
        use_speaker_boost: opts.useSpeakerBoost,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`TTS API error: ${response.status} - ${error}`);
  }

  // Convert response to blob URL for audio playback
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  // Cache the result
  audioCache.set(cacheKey, audioUrl);

  return audioUrl;
}

// Clear cache (useful for memory management)
export function clearAudioCache(): void {
  // Revoke all blob URLs to free memory
  audioCache.forEach((url) => URL.revokeObjectURL(url));
  audioCache.clear();
}

// Pre-generate audio for multiple texts (for preloading)
export async function preloadSpeech(
  texts: string[],
  options: TTSOptions = {}
): Promise<void> {
  await Promise.all(texts.map((text) => generateSpeech(text, options)));
}
