// Record the puzzle-mode voice lines once with Gemini TTS (same model and
// voice as story narration) and save them as static clips:
//
//   node scripts/generate-puzzle-voice.mjs          # only missing clips
//   node scripts/generate-puzzle-voice.mjs --force  # re-record everything
//
// Writes public/puzzles/voice/<key>.wav. Reads GEMINI_API_KEY from the
// environment or .env.local. Runs one request every 7 seconds to stay under
// the 10-per-minute TTS limit; ~34 clips use about a third of the daily quota.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const force = process.argv.includes('--force');

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.replace(/(\\n)+$/, '').trim();
  for (const f of ['.env.local', '.env']) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    const m = readFileSync(p, 'utf8').match(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]*))/m);
    const key = m && (m[1] ?? m[2] ?? m[3] ?? '').replace(/(\\n)+$/, '').trim();
    if (key) return key;
  }
  throw new Error('GEMINI_API_KEY not found in env, .env.local or .env');
}

function pcmToWav(pcm, sampleRate) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22);
  h.writeUInt32LE(sampleRate, 24); h.writeUInt32LE(sampleRate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

const { allVoiceLines } = await import(pathToFileURL(resolve(root, 'src/data/puzzles.ts')).href);
const model = process.env.GEMINI_TTS_MODEL || 'gemini-3.8-flash-tts';
const voice = process.env.GEMINI_TTS_VOICE || 'Kore';
const key = loadKey();
const outDir = resolve(root, 'public/puzzles/voice');
mkdirSync(outDir, { recursive: true });

const todo = allVoiceLines().filter((l) => force || !existsSync(resolve(outDir, `${l.key}.wav`)));
console.log(`${todo.length} clips to record with ${model} / ${voice}`);

for (const [i, line] of todo.entries()) {
  if (i > 0) await new Promise((r) => setTimeout(r, 7000));
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: line.text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } },
        },
      }),
    });
    if (res.ok) {
      const json = await res.json();
      const part = json.candidates?.[0]?.content?.parts?.find((p) => p.inlineData);
      if (!part) throw new Error(`No audio for ${line.key}: ${JSON.stringify(json).slice(0, 300)}`);
      const raw = Buffer.from(part.inlineData.data, 'base64');
      const mime = part.inlineData.mimeType ?? '';
      const rate = Number(/rate=(\d+)/.exec(mime)?.[1] ?? 24000);
      writeFileSync(resolve(outDir, `${line.key}.wav`), mime.includes('wav') ? raw : pcmToWav(raw, rate));
      console.log(`✓ ${line.key}: ${line.text}`);
      break;
    }
    const body = await res.text();
    if (/per day/i.test(body)) throw new Error(`Daily TTS quota used up; rerun after it resets. (${line.key})`);
    if ((res.status === 429 || res.status >= 500) && attempt < 4) {
      console.log(`  ${res.status} on ${line.key}, retrying in ${attempt * 15}s`);
      await new Promise((r) => setTimeout(r, attempt * 15000));
      continue;
    }
    throw new Error(`TTS error ${res.status} on ${line.key}: ${body.slice(0, 300)}`);
  }
}
console.log('Done.');
