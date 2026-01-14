import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const API_BASE = 'https://api.elevenlabs.io/v1';

// Use the same voice as story narration
const DEFAULT_VOICE_ID = '0z8S749Xe6jLCD34QXl1';

interface GenerateSegmentAudioRequest {
  segmentId: string;
  text: string;
  storyId: string;
  chapterNumber: number;
  segmentOrder: number;
}

/**
 * Generate TTS audio for a story segment.
 * Before generating, replaces [CHILD] and [PET] placeholders with blank pauses
 * to create natural-sounding splice points.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!ELEVENLABS_API_KEY) {
    return res.status(500).json({ error: 'ELEVENLABS_API_KEY not configured' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(500).json({ error: 'BLOB_READ_WRITE_TOKEN not configured' });
  }

  const { segmentId, text, storyId, chapterNumber, segmentOrder } = req.body as GenerateSegmentAudioRequest;

  if (!segmentId || !text || !storyId) {
    return res.status(400).json({ error: 'Missing required fields: segmentId, text, storyId' });
  }

  try {
    // Replace placeholders with SSML pauses for natural splice points
    // We use a short pause to create a natural insertion point
    const textForTts = text
      .replace(/\[CHILD\]/g, '<break time="300ms"/>')
      .replace(/\[PET\]/g, '<break time="300ms"/>');

    // Wrap in SSML speak tag
    const ssmlText = `<speak>${textForTts}</speak>`;

    // Generate TTS using ElevenLabs
    const response = await fetch(`${API_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify({
        text: ssmlText,
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

    const audioBuffer = await response.arrayBuffer();

    // Upload to Vercel Blob
    const storagePath = `story-audio/${storyId}/chapter-${chapterNumber}/segment-${segmentOrder}.mp3`;

    const blob = await put(storagePath, Buffer.from(audioBuffer), {
      access: 'public',
      contentType: 'audio/mpeg',
      allowOverwrite: true,
    });

    return res.status(200).json({
      audioUrl: blob.url,
      segmentId,
      storagePath,
    });
  } catch (error) {
    console.error('Segment audio generation error:', error);
    return res.status(500).json({ error: 'Failed to generate segment audio' });
  }
}
