// Generate the image for a puzzle-mode prototype puzzle.
//
//   node scripts/generate-puzzle.mjs [puzzleId] [variants]
//
// Reads GEMINI_API_KEY from the environment or .env.local, and writes
// public/puzzles/<id>.png (plus <id>-2.png, -3.png... for extra variants).
// Pick the best one by eye, then save it as public/puzzles/<id>.jpg (1080px)
// and <id>-thumb.jpg (120px, blurred) and delete the PNGs.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');

function loadKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  for (const f of ['.env.local', '.env']) {
    const p = resolve(root, f);
    if (!existsSync(p)) continue;
    // Tolerates export, single/double quotes, trailing comments and CRLF.
    const m = readFileSync(p, 'utf8').match(/^\s*(?:export\s+)?GEMINI_API_KEY\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s#]*))/m);
    // Strip a literal "\n" left behind by some env exports.
    const key = m && (m[1] ?? m[2] ?? m[3] ?? '').replace(/(\\n)+$/, '').trim();
    if (key) return key;
  }
  throw new Error('GEMINI_API_KEY not found in env, .env.local or .env');
}

// Node 22.18+ strips TypeScript types natively, so the app's puzzle data loads directly.
const { PUZZLES, buildPuzzlePrompt } = await import(pathToFileURL(resolve(root, 'src/data/puzzles.ts')).href);
const id = process.argv[2] || PUZZLES[0].id;
const variants = Number(process.argv[3] || 1);
const puzzle = PUZZLES.find((p) => p.id === id);
if (!puzzle) throw new Error(`Unknown puzzle ${id}`);

const key = loadKey();
const prompt = buildPuzzlePrompt(puzzle);
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';
mkdirSync(resolve(root, 'public/puzzles'), { recursive: true });

for (let v = 1; v <= variants; v++) {
  console.log(`Generating ${id} variant ${v}/${variants}...`);
  const res = await fetch(`${url}?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
    }),
  });
  if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
  const json = await res.json();
  const part = json.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
  if (!part) throw new Error(`No image returned: ${JSON.stringify(json).slice(0, 500)}`);
  const png = await sharp(Buffer.from(part.inlineData.data, 'base64'))
    .resize(1200, 1200, { fit: 'cover' })
    .png({ compressionLevel: 9 })
    .toBuffer();
  const out = resolve(root, `public/puzzles/${id}${v > 1 ? `-${v}` : ''}.png`);
  writeFileSync(out, png);
  console.log(`Wrote ${out}`);
}
