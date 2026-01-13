import type { VercelRequest, VercelResponse } from '@vercel/node';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'API key not configured' });
  }

  const { text, voiceId, modelId, voiceSettings } = req.body;

  if (!text || !voiceId) {
    return res.status(400).json({ error: 'Missing required fields: text, voiceId' });
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
