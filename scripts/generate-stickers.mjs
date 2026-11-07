// Generate a batch of collectible stickers.
//
//   node scripts/generate-stickers.mjs            generate any missing images
//   node scripts/generate-stickers.mjs --only=ID  (re)generate one sticker
//   node scripts/generate-stickers.mjs --sql      print the INSERT for the batch
//
// Images are written to public/stickers/<id>.png (512px) and ship with the
// app, so the database rows only need the /stickers/<id>.png path. Insert the
// rows after the deploy that carries the images is live, or kids will see
// broken stickers. The INSERT skips names that already exist, so it is safe
// to run twice.
//
// Reads GEMINI_API_KEY from the environment or .env.local.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const root = resolve(import.meta.dirname, '..');

// Same style text the admin generator uses (lib/collectibles.ts), so the new
// batch sits next to the existing stickers without looking different.
const STICKER_STYLE = `Cute collectible sticker design, flat illustration style with bold outlines,
vibrant saturated colors, kawaii aesthetic, slightly glossy appearance,
simple background or transparent, suitable for children ages 4-8,
no text in image, circular or badge-shaped composition,
playful and rewarding feel, like a prize or achievement badge.`;

// world: the worlds.name slug, or null for Universal. No candy or sweets:
// this is a toothbrushing app.
export const STICKERS = [
  // Enchanted Castle (had no stickers)
  { id: 'castle-royal-crown', world: 'enchanted-castle', name: 'Royal Crown', rarity: 'uncommon', icon: 'a golden royal crown set with sparkling gems', colors: 'gold, ruby red, sapphire blue' },
  { id: 'castle-little-dragon', world: 'enchanted-castle', name: 'Little Dragon', rarity: 'rare', icon: 'a friendly baby dragon with tiny wings, smiling', colors: 'mint green, lavender, gold belly' },
  { id: 'castle-tower', world: 'enchanted-castle', name: 'Castle Tower', rarity: 'common', icon: 'a fairytale castle tower with a waving flag on top', colors: 'soft pink stone, blue roof, red flag' },
  { id: 'castle-magic-wand', world: 'enchanted-castle', name: 'Magic Wand', rarity: 'common', icon: 'a magic wand with a star on the tip and swirling sparkles', colors: 'purple, gold star, pink sparkles' },
  { id: 'castle-knight-shield', world: 'enchanted-castle', name: 'Brave Shield', rarity: 'common', icon: "a knight's shield with a heart emblem in the middle", colors: 'silver, royal blue, red heart' },
  { id: 'castle-sleepy-unicorn', world: 'enchanted-castle', name: 'Sleepy Unicorn', rarity: 'uncommon', icon: 'a sleepy unicorn head with closed eyes and a swirly horn', colors: 'white, pastel rainbow mane, gold horn' },

  // Magical Forest (had no stickers)
  { id: 'forest-golden-leaf', world: 'magical-forest', name: 'Golden Leaf', rarity: 'common', icon: 'a golden magical leaf with sparkles', colors: 'gold, emerald green, soft yellow' },
  { id: 'forest-owl', world: 'magical-forest', name: 'Wise Owl', rarity: 'common', icon: 'a friendly owl face with big round eyes', colors: 'brown, cream, golden eyes' },
  { id: 'forest-mushroom-house', world: 'magical-forest', name: 'Mushroom House', rarity: 'uncommon', icon: 'a tiny toadstool mushroom house with a round door and window', colors: 'red cap with white spots, cream stem, soft green grass' },
  { id: 'forest-firefly-jar', world: 'magical-forest', name: 'Firefly Jar', rarity: 'uncommon', icon: 'a glass jar full of glowing friendly fireflies', colors: 'warm yellow glow, teal glass, deep green' },
  { id: 'forest-fairy', world: 'magical-forest', name: 'Forest Fairy', rarity: 'rare', icon: 'a cute tiny fairy with shimmering wings sitting on a flower', colors: 'pink, lavender, silver sparkles' },
  { id: 'forest-acorn', world: 'magical-forest', name: 'Glowing Acorn', rarity: 'common', icon: 'an enchanted acorn with a glowing center', colors: 'brown, amber, golden glow' },

  // Underwater Kingdom (had no stickers)
  { id: 'sea-spiral-shell', world: 'underwater-kingdom', name: 'Spiral Shell', rarity: 'common', icon: 'a beautiful spiral seashell', colors: 'coral pink, cream, peach' },
  { id: 'sea-pearl-clam', world: 'underwater-kingdom', name: 'Pearl Clam', rarity: 'uncommon', icon: 'an open clam shell holding a shimmering pearl', colors: 'white, pink, iridescent' },
  { id: 'sea-clownfish', world: 'underwater-kingdom', name: 'Clownfish', rarity: 'common', icon: 'a cute smiling clownfish', colors: 'orange, white, black stripes' },
  { id: 'sea-octopus', world: 'underwater-kingdom', name: 'Friendly Octopus', rarity: 'uncommon', icon: 'a friendly octopus waving with one tentacle', colors: 'purple, pink, big eyes' },
  { id: 'sea-turtle', world: 'underwater-kingdom', name: 'Sea Turtle', rarity: 'common', icon: 'a happy sea turtle swimming', colors: 'sea green, tan shell, bubbles' },
  { id: 'sea-narwhal', world: 'underwater-kingdom', name: 'Narwhal', rarity: 'rare', icon: 'a smiling narwhal with a sparkling spiral tusk', colors: 'light blue, white belly, silver tusk' },

  // Space Station Omega
  { id: 'space-rocket', world: 'space-station', name: 'Rocket Ship', rarity: 'common', icon: 'a friendly rocket ship blasting off', colors: 'red, silver, orange flames' },
  { id: 'space-astronaut-helmet', world: 'space-station', name: 'Astronaut Helmet', rarity: 'common', icon: 'a shiny astronaut helmet with stars reflected in the visor', colors: 'white, gold visor, deep blue' },
  { id: 'space-robot', world: 'space-station', name: 'Robot Buddy', rarity: 'uncommon', icon: 'a cute round robot with an antenna, waving', colors: 'silver, teal lights, orange' },
  { id: 'space-galaxy', world: 'space-station', name: 'Swirly Galaxy', rarity: 'rare', icon: 'a swirling galaxy full of tiny stars', colors: 'violet, magenta, deep navy, white stars' },

  // Dinosaur Valley
  { id: 'dino-footprint', world: 'dinosaur-valley', name: 'Dino Footprint', rarity: 'common', icon: 'a big dinosaur footprint with three long pointed toes, pressed into sand', colors: 'brown, tan, earth tones' },
  { id: 'dino-egg', world: 'dinosaur-valley', name: 'Hatching Egg', rarity: 'uncommon', icon: 'a spotted dinosaur egg cracking open with a baby dino peeking out', colors: 'cream, green spots, baby green dino' },
  { id: 'dino-trex', world: 'dinosaur-valley', name: 'Happy T-Rex', rarity: 'common', icon: 'a friendly T-Rex face with a big happy smile', colors: 'green, white teeth, happy eyes' },
  { id: 'dino-triceratops', world: 'dinosaur-valley', name: 'Triceratops', rarity: 'uncommon', icon: 'a cute triceratops with three horns', colors: 'orange, yellow frill, cream horns' },
  { id: 'dino-pterodactyl', world: 'dinosaur-valley', name: 'Pterodactyl', rarity: 'rare', icon: 'a cheerful pterodactyl flying with wings spread', colors: 'sky blue, purple wings, sunny sky' },

  // Universal
  { id: 'uni-toothbrush-hero', world: null, name: 'Toothbrush Hero', rarity: 'rare', icon: 'a toothbrush with a smiling face wearing a red superhero cape', colors: 'blue handle, white bristles, red cape' },
  { id: 'uni-cool-tooth', world: null, name: 'Cool Tooth', rarity: 'uncommon', icon: 'a sparkling white tooth wearing sunglasses and giving a thumbs up', colors: 'white, black sunglasses, blue sparkles' },
  { id: 'uni-toothpaste', world: null, name: 'Toothpaste Pal', rarity: 'common', icon: 'a happy toothpaste tube with a swirl of minty paste', colors: 'white tube, mint green and blue stripes' },
  { id: 'uni-sunshine', world: null, name: 'Sunshine', rarity: 'common', icon: 'a smiling sun with rosy cheeks', colors: 'yellow, orange rays, pink cheeks' },
  { id: 'uni-rainbow', world: null, name: 'Rainbow Cloud', rarity: 'common', icon: 'a rainbow arching between two fluffy clouds', colors: 'all rainbow colors, white clouds' },
  { id: 'uni-kitty', world: null, name: 'Kitty', rarity: 'common', icon: 'a happy kitten face', colors: 'orange tabby, pink nose, green eyes' },
  { id: 'uni-puppy', world: null, name: 'Puppy', rarity: 'common', icon: 'a happy puppy face with floppy ears', colors: 'golden brown, white snout, pink tongue' },
  { id: 'uni-bunny', world: null, name: 'Bunny', rarity: 'common', icon: 'a cheerful bunny face with long ears', colors: 'white, soft pink ears, blue eyes' },
  { id: 'uni-high-five', world: null, name: 'High Five', rarity: 'uncommon', icon: 'two hands giving a high five with a star burst', colors: 'blue, yellow burst, white' },
  { id: 'uni-gold-medal', world: null, name: 'Gold Medal', rarity: 'uncommon', icon: 'a shiny gold medal on a ribbon', colors: 'gold, red and blue ribbon' },
  { id: 'uni-lightning', world: null, name: 'Super Bolt', rarity: 'common', icon: 'a lightning bolt with a happy face', colors: 'bright yellow, electric blue outline' },
];

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

function buildPrompt(s) {
  return `${STICKER_STYLE}

Create a collectible sticker featuring: ${s.icon}. Use these colors: ${s.colors}

REQUIREMENTS:
- Circular or badge-shaped design
- Bold clean outlines
- Vibrant kawaii style
- Slightly glossy/shiny appearance
- No text or words
- Plain solid light background (no checkerboard or transparency pattern)
- Should look like a prize/reward sticker`;
}

const sqlStr = (v) => (v == null ? 'NULL' : `'${String(v).replace(/'/g, "''")}'`);

function printSql() {
  const rows = STICKERS.map((s) => {
    const world = s.world ? `(SELECT id::text FROM worlds WHERE name = ${sqlStr(s.world)})` : 'NULL';
    const desc = s.world ? 'A special sticker from this world' : 'A special reward sticker!';
    return `  ('sticker', ${sqlStr(`sticker-${s.id}`)}, ${sqlStr(s.name)}, ${sqlStr(desc)}, ${sqlStr(`/stickers/${s.id}.png`)}, ${sqlStr(s.rarity)}, ${world}, true)`;
  });
  console.log(`INSERT INTO collectibles (type, name, display_name, description, image_url, rarity, world_id, is_published)
VALUES
${rows.join(',\n')}
ON CONFLICT (name) DO NOTHING;`);
}

async function generate(s, key, model) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: buildPrompt(s) }] }],
        generationConfig: { responseModalities: ['TEXT', 'IMAGE'], imageConfig: { aspectRatio: '1:1' } },
      }),
    });
    if (res.status === 429 || res.status >= 500) {
      const wait = 5000 * attempt;
      console.log(`  ${s.id}: ${res.status}, retrying in ${wait / 1000}s`);
      await new Promise((r) => setTimeout(r, wait));
      continue;
    }
    if (!res.ok) throw new Error(`${s.id}: Gemini error ${res.status}: ${await res.text()}`);
    const json = await res.json();
    const part = json.candidates?.[0]?.content?.parts?.find((x) => x.inlineData);
    if (!part) throw new Error(`${s.id}: no image returned: ${JSON.stringify(json).slice(0, 300)}`);
    return sharp(Buffer.from(part.inlineData.data, 'base64'))
      .resize(512, 512, { fit: 'cover' })
      .png({ compressionLevel: 9, palette: true, quality: 90 })
      .toBuffer();
  }
  throw new Error(`${s.id}: gave up after retries`);
}

if (process.argv.includes('--sql')) {
  printSql();
} else {
  const only = process.argv.find((a) => a.startsWith('--only='))?.slice(7);
  const key = loadKey();
  const model = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';
  const dir = resolve(root, 'public/stickers');
  mkdirSync(dir, { recursive: true });
  const todo = STICKERS.filter((s) => (only ? s.id === only : !existsSync(resolve(dir, `${s.id}.png`))));
  if (only && !todo.length) throw new Error(`Unknown sticker ${only}`);
  console.log(`Generating ${todo.length} sticker(s) with ${model}`);
  const queue = [...todo];
  const failures = [];
  await Promise.all(
    Array.from({ length: 3 }, async () => {
      while (queue.length) {
        const s = queue.shift();
        try {
          writeFileSync(resolve(dir, `${s.id}.png`), await generate(s, key, model));
          console.log(`  wrote ${s.id}.png`);
        } catch (e) {
          failures.push(s.id);
          console.error(`  ${e.message}`);
        }
      }
    }),
  );
  if (failures.length) {
    console.error(`Failed: ${failures.join(', ')}`);
    process.exitCode = 1;
  }
}
