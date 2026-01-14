import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';

// Use the same voice as the story narration for consistency
const DEFAULT_VOICE_ID = '0z8S749Xe6jLCD34QXl1';

interface GenerateNameAudioRequest {
  name: string;
  type: 'child' | 'pet';
  id: string; // Child ID or Pet ID for storage path
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  const { name, type, id } = req.body as GenerateNameAudioRequest;

  if (!name || !type || !id) {
    return res.status(400).json({ error: 'Missing required fields: name, type, id' });
  }

  // Validate name is reasonable (prevents abuse)
  if (name.length > 50) {
    return res.status(400).json({ error: 'Name too long (max 50 characters)' });
  }

  try {
    // Generate TTS for the name
    const response = await fetch(`${API_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: name,
        model_id: 'eleven_turbo_v2_5',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.5,
          use_speaker_boost: true,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('ElevenLabs API error:', error);
      return res.status(response.status).json({ error: `ElevenLabs API error: ${error}` });
    }

    // Get the audio data
    const audioBuffer = await response.arrayBuffer();

    // Upload to Vercel Blob
    const storagePath = type === 'child'
      ? `name-audio/children/${id}.mp3`
      : `name-audio/pets/${id}.mp3`;

    const blob = await put(storagePath, Buffer.from(audioBuffer), {
      access: 'public',
      contentType: 'audio/mpeg',
    });

    return res.status(200).json({
      audioUrl: blob.url,
      name,
      type,
      id,
    });
  } catch (error) {
    console.error('Name audio generation error:', error);
    return res.status(500).json({ error: 'Failed to generate name audio' });
  }
}
