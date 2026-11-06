import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';
// The one narrator voice the app uses. Anything else is rejected so a caller
// cannot pick arbitrary voices (or inject into the upstream URL).
const ALLOWED_VOICE_IDS = new Set(['0z8S749Xe6jLCD34QXl1']);
const ALLOWED_MODEL_IDS = new Set(['eleven_turbo_v2_5', 'eleven_multilingual_v2', 'eleven_flash_v2_5']);
const MAX_TEXT_LENGTH = 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res, 'device')) return;

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { text, voiceId, modelId, voiceSettings } = req.body ?? {};

  if (typeof text !== 'string' || text.trim().length === 0 || typeof voiceId !== 'string') {
    return res.status(400).json({ error: 'Missing required fields: text, voiceId' });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer` });
  }
  if (!ALLOWED_VOICE_IDS.has(voiceId)) {
    return res.status(400).json({ error: 'Unsupported voiceId' });
  }
  if (modelId !== undefined && !ALLOWED_MODEL_IDS.has(modelId)) {
    return res.status(400).json({ error: 'Unsupported modelId' });
  }

  try {
    const response = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text,
        model_id: modelId || 'eleven_turbo_v2_5',
        voice_settings: voiceSettings || {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      return res.status(response.status).json({ error: `ElevenLabs API error: ${error}` });
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();

    // Set appropriate headers for audio
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours

    // Send the audio data
    return res.send(Buffer.from(audioBuffer));
  } catch (error) {
    console.error('TTS Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
