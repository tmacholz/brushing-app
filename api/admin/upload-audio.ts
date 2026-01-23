import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';

// Supported audio MIME types
const SUPPORTED_AUDIO_TYPES = [
  'audio/mpeg',      // .mp3
  'audio/mp3',       // .mp3 (alternative)
  'audio/wav',       // .wav
  'audio/wave',      // .wav (alternative)
  'audio/x-wav',     // .wav (alternative)
  'audio/ogg',       // .ogg
  'audio/aac',       // .aac
  'audio/mp4',       // .m4a
  'audio/x-m4a',     // .m4a (alternative)
  'audio/webm',      // .webm
];

// Max file size: 50MB
const MAX_FILE_SIZE = 50 * 1024 * 1024;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '50mb',
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fileName, fileData, fileType, worldId } = req.body;

    if (!fileName || !fileData || !fileType) {
      return res.status(400).json({ error: 'Missing required fields: fileName, fileData, fileType' });
    }

    // Validate file type
    if (!SUPPORTED_AUDIO_TYPES.includes(fileType)) {
      return res.status(400).json({
        error: `Unsupported audio format. Supported formats: MP3, WAV, OGG, AAC, M4A, WebM`,
      });
    }

    // Decode base64 file data
    const buffer = Buffer.from(fileData, 'base64');

    // Validate file size
    if (buffer.length > MAX_FILE_SIZE) {
      return res.status(400).json({
        error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`,
      });
    }

    // Generate storage path
    const timestamp = Date.now();
    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const storagePath = worldId
      ? `world-music/${worldId}-${timestamp}-${safeName}`
      : `uploaded-music/${timestamp}-${safeName}`;

    // Upload to Vercel Blob
    const blob = await put(storagePath, buffer, {
      access: 'public',
      contentType: fileType,
      allowOverwrite: true,
    });

    console.log('Audio upload success:', blob.url);

    return res.status(200).json({
      url: blob.url,
      fileName,
      fileType,
      size: buffer.length,
    });
  } catch (error) {
    console.error('Audio upload error:', error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : 'Failed to upload audio',
    });
  }
}
