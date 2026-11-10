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
  bubbles: { src: 'pets/stages/bubbles-1.webp', what: 'floating fish', s2: 'a longer young fish with a slimmer body, long flowing fins like ribbons and a tail twice as long, a little bubble crown floating above', s3: 'a majestic grown-up fish, long and graceful like a koi, with huge flowing rainbow-tipped fins and tail, swimming in a big loop of bubbles' },
  fern: { src: 'pets/stages/fern-1.webp', what: 'little forest dragon', s2: 'a bigger young dragon standing taller, with bigger leafy wings half open, small horns and a longer tail', s3: 'a large grown-up forest dragon with huge leafy wings spread wide, curling horns, flowers growing along its back and a long tail, in a proud pose' },
  'friend:treetop-village': { src: 'puzzles/friends/treetop-village.webp', what: 'forest sprite', s2: 'the same round little sprite creature (NOT a human child) grown taller with longer arms and legs, wings twice as big, the acorn cap now a bigger acorn helmet, holding the lantern up high', s3: 'the same sprite creature (NOT a human, keeping its round soft face and body) fully grown: tall with huge glowing leaf wings, a flowing leaf cloak, a big acorn helmet and a tall staff with the lantern hanging from the top' },
  'friend:windy-cove': { src: 'puzzles/friends/windy-cove.webp', what: 'sea dragon', s2: 'a young sea dragon with a longer neck and long body, fins grown into small wings, standing on its hind legs, the pearl now on a string around its neck', s3: 'a majestic grown-up sea dragon with a long serpent-like neck and body, large flowing fin-wings spread wide, a crest of frills, the pearl glowing on its forehead' },
  'friend:space-party': { src: 'puzzles/friends/space-party.webp', what: 'space puff', s2: 'the puff has sprouted little arms and legs and stands upright, its body taller and egg-shaped, antennae much longer with glowing stars on the tips, a tiny astronaut backpack', s3: 'a tall star-creature standing proudly on long legs with long arms, a long flowing fluffy mane, a glowing cosmic cape full of stars, a little planet with a ring orbiting its head' },
  'friend:dino-valley': { src: 'puzzles/friends/dino-valley.webp', what: 'baby dinosaur', s2: 'the little dinosaur fully hatched, standing on its own legs, a longer tail and neck, small rounded back plates, a piece of eggshell as a hat', s3: 'a big grown-up friendly dinosaur with a long tail and neck, large rounded back plates, sturdy legs and a proud happy pose' },
  'friend:snow-day': { src: 'puzzles/friends/snow-day.webp', what: 'yeti', s2: 'a taller young yeti on longer legs with a longer shaggy coat, the scarf wrapped around its neck, carrying a little sled', s3: 'a huge grown-up yeti, tall and broad with long shaggy fur, a cozy knit hat and long scarf, holding a snowman friend on its shoulder' },
  'friend:cloud-castle': { src: 'puzzles/friends/cloud-castle.webp', what: 'cloud kitten', s2: 'a lanky young cat with longer legs and tail, the rainbow tail twice as long, little cloud puffs at its paws, standing on a cloud', s3: 'a graceful grown-up sky cat with a long elegant body, small feathered cloud wings, a long flowing rainbow tail, sitting tall on a big cloud with a rainbow arching behind' },
  'friend:bug-garden': { src: 'puzzles/friends/bug-garden.webp', what: 'golden beetle', s2: 'a bigger beetle standing up on its back legs, its shell opened to show bright golden wings, longer antennae', s3: 'a grand golden beetle flying high with large shimmering wings spread wide, a long elegant body, long curling antennae, sparkles trailing behind it' },
  'friend:farm-fair': { src: 'puzzles/friends/farm-fair.webp', what: 'chick', s2: 'a gangly young chicken with longer legs and neck, first real wing and tail feathers, a small red comb, the daisy crown slipping to one side', s3: 'a proud grown-up hen, tall with long glossy golden feathers, a big red comb, wings out and a fancy tail, wearing a big daisy flower crown' },
  'friend:toy-shop': { src: 'puzzles/friends/toy-shop.webp', what: 'wind-up penguin', s2: 'a taller, slimmer young wind-up penguin with longer flippers and legs, a red bow tie, a little captain\'s cap and a bigger golden key, marching with one flipper raised', s3: 'a tall grown-up wind-up penguin bandleader in a tall drum major hat and red jacket, holding a baton, with a big polished golden key' },
  'friend:pirate-ship': { src: 'puzzles/friends/pirate-ship.webp', what: 'baby kraken', s2: 'a bigger young kraken with long curling tentacles held out, a slightly bigger sailor hat, holding a little spyglass', s3: 'a grand grown-up kraken in a full captain\'s hat and blue captain\'s coat, long tentacles spread out, one holding a ship\'s wheel' },
  'friend:robot-workshop': { src: 'puzzles/friends/robot-workshop.webp', what: 'robot puppy', s2: 'a chubby, round young robot PUPPY: plump rounded body, short stubby legs, big floppy ears, an oversized head with huge eyes, a little antenna and a few glowing panels. Clearly still a baby-ish puppy, much rounder and younger than a grown dog', s3: 'a sleek grown-up robot dog that still stands on FOUR legs like a dog (not a humanoid), tall and strong, with glowing blue lights, rocket boots firing on its paws and a shiny visor' },
  'friend:dragon-mountain': { src: 'puzzles/friends/dragon-mountain.webp', what: 'baby phoenix', s2: 'a young phoenix with a longer neck and legs, real flame-tipped wings half open, a tall crest and a few long tail feathers', s3: 'a majestic grown-up phoenix in flight, huge fiery wings spread wide, long glowing tail feathers trailing, a crown of flame on its head' },
  'friend:sunny-cove': { src: 'pets/stages/friend-sunny-cove-1.webp', what: 'baby rainbow hermit crab', s2: 'a bigger young hermit crab with longer legs and bigger claws, its rainbow shell now twice as big with a spiral tip, standing up proudly', s3: 'a huge grown-up hermit crab knight: tall on long strong legs, giant claws raised, wearing a giant sparkly rainbow conch shell like armor with a little flag on top, a confident heroic pose' },
};

const KEEP = 'Keep its main colors, eye style and signature item so it is recognizably the same character, and keep the same cute children\'s picture-book art style for ages 3-8. Plain flat soft cream background with nothing else in it, only a soft shadow under it. Full body, centered. No text.';

// Each stage is an evolution, not a touch-up: the body shape and proportions
// change so the stage reads at a glance, even as a small thumbnail.
function prompt(pet, stage) {
  return stage === 2
    ? `Using this character as a reference, draw its next EVOLVED form, like a creature leveling up in a collecting game: clearly older and bigger (a kid, no longer a baby), a noticeably different body shape with longer limbs and a less round head, plus new features: ${pet.s2}. Someone should see at a glance that it has grown up a lot. ${KEEP}`
    : `Using this character as a reference, draw its final, fully EVOLVED grown-up form, like the last evolution of a creature in a collecting game: tall, strong, confident and majestic, with grown-up proportions (small head relative to the body), a heroic pose, and impressive new features: ${pet.s3}. It must look dramatically different from the reference at a glance, while clearly the same character grown up. ${KEEP}`;
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
const MODEL = process.env.PET_IMAGE_MODEL || 'gemini-3-pro-image';
const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

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
