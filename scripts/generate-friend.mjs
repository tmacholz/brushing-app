// Generate the hidden-friend art for puzzles (one collectible creature each).
//
//   node scripts/generate-friend.mjs [puzzleId ...] [--variants N]
//
// With no ids it makes every friend whose image is missing. Writes
// public/puzzles/friends/<id>.webp (512px), plus <id>-2.webp... for extra
// variants. Pick the best by eye, rename it to <id>.webp and delete the rest.
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
const { PUZZLES, buildFriendPrompt } = await import(pathToFileURL(resolve(root, 'src/data/puzzles.ts')).href);

const args = process.argv.slice(2);
const vi = args.indexOf('--variants');
const variants = vi >= 0 ? Number(args[vi + 1]) : 1;
const ids = args.filter((a, i) => !a.startsWith('--') && (vi < 0 || i !== vi + 1));
const outDir = resolve(root, 'public/puzzles/friends');
mkdirSync(outDir, { recursive: true });
const todo = ids.length
  ? ids.map((id) => {
    const p = PUZZLES.find((x) => x.id === id);
    if (!p) throw new Error(`Unknown puzzle ${id}`);
    return p;
  })
  : PUZZLES.filter((p) => !existsSync(resolve(outDir, `${p.id}.webp`)));

const key = loadKey();
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

for (const puzzle of todo) {
  for (let v = 1; v <= variants; v++) {
    console.log(`Generating ${puzzle.id} friend (${puzzle.friend.name}) variant ${v}/${variants}...`);
    const res = await fetch(`${url}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildFriendPrompt(puzzle) }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
      }),
    });
    if (!res.ok) throw new Error(`Gemini error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
    if (!part) throw new Error(`No image returned: ${JSON.stringify(json).slice(0, 500)}`);
    const out = resolve(outDir, `${puzzle.id}${v > 1 ? `-${v}` : ''}.webp`);
    const img = await sharp(Buffer.from(part.inlineData.data, 'base64'))
      .resize(512, 512, { fit: 'cover' })
      .webp({ quality: 85 })
      .toBuffer();
    writeFileSync(out, img);
    console.log(`Wrote ${out}`);
  }
}
