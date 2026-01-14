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

type NarrationSequenceItem =
  | { type: 'audio'; url: string }
  | { type: 'name'; placeholder: 'CHILD' | 'PET' };

/**
 * Parse segment text and split into parts at [CHILD] and [PET] placeholders.
 * Returns an array of { type: 'text', content: string } | { type: 'placeholder', name: 'CHILD' | 'PET' }
 */
function parseTextIntoParts(text: string): Array<{ type: 'text'; content: string } | { type: 'placeholder'; name: 'CHILD' | 'PET' }> {
  const parts: Array<{ type: 'text'; content: string } | { type: 'placeholder'; name: 'CHILD' | 'PET' }> = [];
  const regex = /\[(CHILD|PET)\]/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    // Add text before the placeholder (if any)
    if (match.index > lastIndex) {
      const content = text.slice(lastIndex, match.index);
      if (content.trim()) {
        parts.push({ type: 'text', content });
      }
    }

    // Add the placeholder
    parts.push({ type: 'placeholder', name: match[1] as 'CHILD' | 'PET' });
    lastIndex = regex.lastIndex;
  }

  // Add remaining text after last placeholder (if any)
  if (lastIndex < text.length) {
    const content = text.slice(lastIndex);
    if (content.trim()) {
      parts.push({ type: 'text', content });
    }
  }

  return parts;
}

/**
 * Generate TTS audio for a single text clip
 */
async function generateTtsClip(text: string): Promise<ArrayBuffer> {
  const response = await fetch(`${API_BASE}/text-to-speech/${DEFAULT_VOICE_ID}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY!,
    },
    body: JSON.stringify({
      text,
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
    throw new Error(`ElevenLabs API error: ${error}`);
  }

  return response.arrayBuffer();
}

/**
 * Generate TTS audio clips for a story segment.
 * Splits text at [CHILD] and [PET] placeholders and generates separate clips.
 * Returns a narration sequence that can be played with gapless audio.
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
    // Parse text into parts (text chunks and placeholders)
    const parts = parseTextIntoParts(text);
    console.log(`[AudioGen] Segment ${segmentId}: ${parts.length} parts to process`);

    // Build the narration sequence
    const narrationSequence: NarrationSequenceItem[] = [];
    let clipIndex = 0;

    for (const part of parts) {
      if (part.type === 'placeholder') {
        // Add placeholder marker to sequence
        narrationSequence.push({ type: 'name', placeholder: part.name });
      } else {
        // Generate TTS for this text chunk
        console.log(`[AudioGen] Generating clip ${clipIndex} for: "${part.content.substring(0, 50)}..."`);

        const audioBuffer = await generateTtsClip(part.content);

        // Upload to Vercel Blob
        const storagePath = `story-audio/${storyId}/ch${chapterNumber}/seg${segmentOrder}/clip${clipIndex}.mp3`;
        const blob = await put(storagePath, Buffer.from(audioBuffer), {
          access: 'public',
          contentType: 'audio/mpeg',
          allowOverwrite: true,
        });

        narrationSequence.push({ type: 'audio', url: blob.url });
        clipIndex++;
      }
    }

    console.log(`[AudioGen] Segment ${segmentId}: Generated ${clipIndex} clips, sequence length: ${narrationSequence.length}`);

    return res.status(200).json({
      narrationSequence,
      segmentId,
      clipCount: clipIndex,
    });
  } catch (error) {
    console.error('Segment audio generation error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to generate segment audio'
    });
  }
}
