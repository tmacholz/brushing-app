import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth } from '../lib/auth.js';
import { synthesizeSpeech, isTtsConfigured } from '../lib/tts.js';

// Live fallback narration for segments that have no pre-generated clips.
// The voice and model are fixed server-side (see lib/models.ts), so the
// client only sends text.
const MAX_TEXT_LENGTH = 1000;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!requireAuth(req, res, 'device')) return;

  if (!isTtsConfigured()) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { text } = req.body ?? {};

  if (typeof text !== 'string' || text.trim().length === 0) {
    return res.status(400).json({ error: 'Missing required field: text' });
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return res.status(400).json({ error: `Text must be ${MAX_TEXT_LENGTH} characters or fewer` });
  }

  try {
    const speech = await synthesizeSpeech(text);

    res.setHeader('Content-Type', speech.contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 24 hours
    return res.send(speech.buffer);
  } catch (error) {
    console.error('TTS Error:', error);
    return res.status(500).json({ error: 'Failed to generate speech' });
  }
}
