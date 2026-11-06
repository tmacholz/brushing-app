import { GEMINI_TTS_MODEL, GEMINI_TTS_VOICE, GEMINI_TRANSCRIBE_MODEL, geminiGenerateUrl } from './models.js';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

export interface SpeechResult {
  buffer: Buffer;
  /** MIME type to store/serve the audio as. */
  contentType: string;
  /** File extension without the dot, matching contentType. */
  extension: string;
}

export function isTtsConfigured(): boolean {
  return Boolean(GEMINI_API_KEY);
}

const MAX_ATTEMPTS = 4;

/**
 * Synthesize one clip of narration with Gemini text-to-speech.
 *
 * Gemini returns 16-bit PCM at 24 kHz (mime "audio/L16;codec=pcm;rate=24000"),
 * which browsers cannot play directly, so it is wrapped in a WAV header here.
 * If the API ever returns a container format (WAV/MP3) it is passed through.
 *
 * Retries on 429/5xx with backoff; the free tier allows 3 requests a minute.
 */
export async function synthesizeSpeech(text: string): Promise<SpeechResult> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (attempt > 0) {
      const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000; // 4s, 8s, 16s
      console.log(`[TTS] Retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${MAX_ATTEMPTS})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const response = await fetch(`${geminiGenerateUrl(GEMINI_TTS_MODEL)}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: GEMINI_TTS_VOICE } },
          },
        },
      }),
    });

    if (response.status === 429 || response.status >= 500) {
      lastError = new Error(`Gemini TTS error ${response.status}: ${await response.text()}`);
      continue;
    }

    if (!response.ok) {
      throw new Error(`Gemini TTS error ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const parts: Array<{ inlineData?: { mimeType?: string; data?: string } }> =
      data.candidates?.[0]?.content?.parts ?? [];
    const audioPart = parts.find((p) => p.inlineData?.data);
    if (!audioPart?.inlineData?.data) {
      throw new Error('Gemini TTS returned no audio');
    }

    const raw = Buffer.from(audioPart.inlineData.data, 'base64');
    return toPlayableAudio(raw, audioPart.inlineData.mimeType ?? '');
  }

  throw lastError ?? new Error('Gemini TTS failed');
}

function toPlayableAudio(raw: Buffer, mimeType: string): SpeechResult {
  // Already a container? Pass it through.
  if (raw.length >= 12 && raw.toString('ascii', 0, 4) === 'RIFF' && raw.toString('ascii', 8, 12) === 'WAVE') {
    return { buffer: raw, contentType: 'audio/wav', extension: 'wav' };
  }
  if (mimeType.startsWith('audio/mpeg') || mimeType.startsWith('audio/mp3')) {
    return { buffer: raw, contentType: 'audio/mpeg', extension: 'mp3' };
  }

  const rateMatch = /rate=(\d+)/.exec(mimeType);
  const sampleRate = rateMatch ? parseInt(rateMatch[1], 10) : 24000;
  return { buffer: pcmToWav(raw, sampleRate, 1, 16), contentType: 'audio/wav', extension: 'wav' };
}

function pcmToWav(pcm: Buffer, sampleRate: number, channels: number, bitsPerSample: number): Buffer {
  const blockAlign = (channels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

/**
 * Transcribe a short clip with a cheap Gemini text model (audio input).
 * Used to check that a synthesized name clip says only the name.
 */
export async function transcribeAudio(speech: SpeechResult): Promise<string> {
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  const response = await fetch(`${geminiGenerateUrl(GEMINI_TRANSCRIBE_MODEL)}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{
        parts: [
          { inlineData: { mimeType: speech.contentType, data: speech.buffer.toString('base64') } },
          { text: 'Transcribe this audio exactly, word for word. Reply with the transcript only.' },
        ],
      }],
      generationConfig: { temperature: 0, maxOutputTokens: 64 },
    }),
  });
  if (!response.ok) {
    throw new Error(`Gemini transcription error ${response.status}: ${await response.text()}`);
  }
  const data = await response.json();
  const text: string = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? '').join(' ') ?? '';
  return text.trim();
}

function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[-\u2013\u2014]/g, ' ')
    .replace(/[^a-z0-9'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

function editDistance(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
  }
  return dp[a.length][b.length];
}

function similarWord(a: string, b: string): boolean {
  return a === b || a.startsWith(b) || b.startsWith(a) || editDistance(a, b) <= 2;
}

/**
 * How many words a transcript has beyond what the text should contain.
 * Returns Infinity when the clip clearly starts with an invented word
 * (the first transcribed word matches nothing in the first two expected words).
 */
function extraWords(expectedText: string, transcript: string): number {
  const expected = normalizeWords(expectedText);
  const heard = normalizeWords(transcript);
  if (heard.length === 0 || expected.length === 0) return 0; // unverifiable, accept
  const startsRight = expected.slice(0, 2).some((w) => similarWord(heard[0], w));
  if (!startsRight) return Infinity;
  return Math.max(0, heard.length - expected.length);
}

const VERIFY_ATTEMPTS = 4;

/**
 * Synthesize text and check the result by transcribing it.
 *
 * Gemini TTS sometimes invents a word, most often a name, when a clip is a
 * bare name ("Daisy Sparkle") or a fragment that starts mid-sentence right
 * after a name slot ("Daisy bounced with excitement"). That word then gets
 * spliced into every story. Each take is transcribed with a cheap model and
 * regenerated if it starts with an unexpected word or has more than
 * `maxExtraWords` words beyond the text. After VERIFY_ATTEMPTS the least-bad
 * take is kept so one stubborn fragment cannot block a whole segment.
 */
export async function synthesizeVerified(text: string, maxExtraWords = 0): Promise<SpeechResult> {
  let best: { speech: SpeechResult; extra: number } | null = null;
  for (let attempt = 1; attempt <= VERIFY_ATTEMPTS; attempt++) {
    const speech = await synthesizeSpeech(text);
    let transcript: string;
    try {
      transcript = await transcribeAudio(speech);
    } catch (error) {
      // Verification is best-effort: if transcription itself fails, keep the clip.
      console.warn('[TTS] Could not verify clip, keeping it:', error);
      return speech;
    }
    const extra = extraWords(text, transcript);
    if (extra <= maxExtraWords) {
      return speech;
    }
    console.warn(
      `[TTS] Clip for "${text.slice(0, 40)}..." transcribed as "${transcript.slice(0, 60)}" (attempt ${attempt}/${VERIFY_ATTEMPTS}), regenerating`
    );
    if (!best || extra < best.extra) best = { speech, extra };
  }
  console.warn(`[TTS] Keeping least-bad clip for "${text.slice(0, 40)}..." after ${VERIFY_ATTEMPTS} attempts`);
  return best!.speech;
}

/** Synthesize a bare name (or possessive): no extra words allowed. */
export function synthesizeName(name: string): Promise<SpeechResult> {
  return synthesizeVerified(name, 0);
}

/** Synthesize a narration fragment; allow one extra word for transcription noise. */
export function synthesizeNarration(text: string): Promise<SpeechResult> {
  return synthesizeVerified(text, 1);
}
