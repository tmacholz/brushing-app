const API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';

// Child-friendly voices from ElevenLabs
// Using "Rachel" as default - warm, friendly voice good for storytelling
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM'; // Rachel

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

  if (!API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(
    `${API_BASE}/text-to-speech/${opts.voiceId}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: opts.modelId,
        voice_settings: {
          stability: opts.stability,
          similarity_boost: opts.similarityBoost,
          style: opts.style,
          use_speaker_boost: opts.useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  // Convert response to blob URL for audio playback
  const audioBlob = await response.blob();
  const audioUrl = URL.createObjectURL(audioBlob);

  // Cache the result
  audioCache.set(cacheKey, audioUrl);

  return audioUrl;
}

// Streaming version for lower latency
export async function streamSpeech(
  text: string,
  options: TTSOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const opts = { ...defaultOptions, ...options };

  if (!API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  const response = await fetch(
    `${API_BASE}/text-to-speech/${opts.voiceId}/stream`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: opts.modelId,
        voice_settings: {
          stability: opts.stability,
          similarity_boost: opts.similarityBoost,
          style: opts.style,
          use_speaker_boost: opts.useSpeakerBoost,
        },
      }),
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`ElevenLabs API error: ${response.status} - ${error}`);
  }

  return response.body!;
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
