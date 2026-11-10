// Grow pets: make stage 2 ("Big") and stage 3 ("Grown-up") art by editing each
// pet's stage 1 image with Gemini, so it stays clearly the same creature.
//
//   node scripts/generate-pet-stages.mjs [petId ...] [--stage 2|3] [--force]
//
// Stage 2 is edited from stage 1; stage 3 from stage 2. Writes
// public/pets/stages/<petId>-<stage>.webp (512px). Skips files that exist
// unless --force. Reads GEMINI_API_KEY from the env or .env.local.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');

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

// id -> stage 1 image (path under public/) and what each stage adds.
export const PET_STAGES = {
  bubbles: { src: 'pets/stages/bubbles-1.webp', what: 'floating fish', s2: 'a bigger young fish with longer flowing fins and a few more bubbles around it', s3: 'a grown-up graceful fish with long rainbow-tipped flowing fins, surrounded by a ring of shiny bubbles' },
  fern: { src: 'pets/stages/fern-1.webp', what: 'little forest dragon', s2: 'a bigger young dragon with bigger leafy wings and small horns', s3: 'a grown-up forest dragon with large leafy wings spread, little flowers growing on its back and a proud friendly pose' },
  'friend:treetop-village': { src: 'puzzles/friends/treetop-village.webp', what: 'forest sprite', s2: 'a bit taller with bigger leaf wings and a brighter lantern', s3: 'a grown-up forest sprite with large shimmering leaf wings, a little leafy cape and a glowing lantern staff' },
  'friend:windy-cove': { src: 'puzzles/friends/windy-cove.webp', what: 'sea dragon', s2: 'a bigger young sea dragon with longer fins and a longer tail, still hugging its pearl', s3: 'a grown-up sea dragon with big flowing frilly fins, small horns and a pearl necklace' },
  'friend:space-party': { src: 'puzzles/friends/space-party.webp', what: 'space puff', s2: 'a bigger fluffier space puff with longer glowing antennae', s3: 'a grown-up space puff, extra fluffy, with a ring of tiny orbiting stars around it and glowing antennae' },
  'friend:dino-valley': { src: 'puzzles/friends/dino-valley.webp', what: 'baby dinosaur', s2: 'the little dinosaur now fully out of its egg, standing on its own feet, a bit bigger, with a small piece of eggshell on its head', s3: 'a grown-up friendly dinosaur with a row of rounded back plates and a proud happy pose' },
  'friend:snow-day': { src: 'puzzles/friends/snow-day.webp', what: 'yeti', s2: 'a bigger young yeti with a longer scarf, holding a bigger snowball', s3: 'a grown-up friendly yeti, tall and fluffy, with a cozy knit hat and scarf, holding a little snowman' },
  'friend:cloud-castle': { src: 'puzzles/friends/cloud-castle.webp', what: 'cloud kitten', s2: 'a bigger young kitten with a longer rainbow tail, standing on a bigger cloud', s3: 'a grown-up graceful cloud cat with a long flowing rainbow tail, sitting on a big fluffy cloud with a tiny rainbow arching behind' },
  'friend:bug-garden': { src: 'puzzles/friends/bug-garden.webp', what: 'golden beetle', s2: 'a bigger beetle with little shiny wings peeking out from its shell, on a bigger leaf', s3: 'a grown-up golden beetle with large sparkly wings spread open, hovering just above a leaf' },
  'friend:farm-fair': { src: 'puzzles/friends/farm-fair.webp', what: 'chick', s2: 'a bigger young chick with its first small wing feathers and a little comb, still wearing its daisy crown', s3: 'a grown-up hen with glossy golden feathers and a big daisy flower crown' },
  'friend:toy-shop': { src: 'puzzles/friends/toy-shop.webp', what: 'wind-up penguin', s2: 'a bigger wind-up penguin with a bow tie and a shinier golden wind-up key', s3: 'a grown-up wind-up penguin in a little drum major hat with a big polished golden key' },
  'friend:pirate-ship': { src: 'puzzles/friends/pirate-ship.webp', what: 'baby kraken', s2: 'a bigger young kraken with longer curly tentacles and a slightly bigger captain hat', s3: 'a grown-up friendly kraken in a full captain\'s hat and little captain coat, waving several tentacles' },
  'friend:robot-workshop': { src: 'puzzles/friends/robot-workshop.webp', what: 'robot puppy', s2: 'a bigger robot puppy with more glowing panels and a little antenna', s3: 'a grown-up robot dog with sleek panels, glowing blue lights and small rocket boots' },
  'friend:dragon-mountain': { src: 'puzzles/friends/dragon-mountain.webp', what: 'baby phoenix', s2: 'a bigger young phoenix with longer flame-tipped wings and a taller crest', s3: 'a grown-up phoenix with grand fiery wings spread wide and long glowing tail feathers' },
  'friend:sunny-cove': { src: 'puzzles/friends/sunny-cove.webp', what: 'rainbow crab', s2: 'a bigger crab with a bigger rainbow shell, on the same plain background', s3: 'a grown-up crab with a large sparkly rainbow spiral shell and big friendly claws' },
};

const STYLE = 'Keep it clearly the SAME character: same colors, same face and eyes, same art style, still cute and friendly for ages 3-8. Plain flat soft cream background with nothing else in it, only a soft shadow under it. Full body, centered. No text.';

function prompt(pet, stage) {
  return stage === 2
    ? `Edit this illustration to show the ${pet.what} a little older and bigger: ${pet.s2}. ${STYLE}`
    : `Edit this illustration to show the ${pet.what} fully grown up: ${pet.s3}. ${STYLE}`;
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const si = args.indexOf('--stage');
const stages = si >= 0 ? [Number(args[si + 1])] : [2, 3];
const ids = args.filter((a, i) => !a.startsWith('--') && (si < 0 || i !== si + 1));
const outDir = resolve(root, 'public/pets/stages');
mkdirSync(outDir, { recursive: true });
const fileFor = (id, stage) => resolve(outDir, `${id.replace(':', '-')}-${stage}.webp`);
const key = loadKey();
const url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent';

async function grow(id, stage) {
  const pet = PET_STAGES[id];
  const out = fileFor(id, stage);
  if (!force && existsSync(out)) return;
  const src = stage === 2 ? resolve(root, 'public', pet.src) : fileFor(id, 2);
  const png = await sharp(src).png().toBuffer();
  for (let attempt = 1; attempt <= 3; attempt++) {
    const res = await fetch(`${url}?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ inlineData: { mimeType: 'image/png', data: png.toString('base64') } }, { text: prompt(pet, stage) }] }],
        generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '1:1' } },
      }),
    });
    const json = res.ok ? await res.json() : null;
    const part = json?.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
    if (part) {
      writeFileSync(out, await sharp(Buffer.from(part.inlineData.data, 'base64')).resize(512, 512, { fit: 'cover' }).webp({ quality: 85 }).toBuffer());
      console.log(`Wrote ${out}`);
      return;
    }
    console.warn(`${id} stage ${stage} attempt ${attempt} failed: ${res.status} ${json ? JSON.stringify(json).slice(0, 200) : await res.text()}`);
  }
  throw new Error(`Gave up on ${id} stage ${stage}`);
}

const todo = ids.length ? ids : Object.keys(PET_STAGES);
for (const id of todo) if (!PET_STAGES[id]) throw new Error(`Unknown pet ${id}`);
// Stage 3 builds on stage 2, so finish every stage 2 first; 4 at a time.
for (const stage of stages) {
  for (let i = 0; i < todo.length; i += 4) {
    await Promise.all(todo.slice(i, i + 4).map((id) => grow(id, stage)));
  }
}
