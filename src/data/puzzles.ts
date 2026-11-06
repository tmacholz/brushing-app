// Built-in puzzles for puzzle mode ("ways to play").
// Each puzzle is ONE generated image laid out as a 3x3 grid of vignettes.
// Pieces are shown by cropping that image, so style and seams always match.
// Images were made with scripts/generate-puzzle.mjs (best of 3 picked by hand);
// an admin generator and a puzzles table will replace this file later.

export interface PuzzlePiece {
  name: string;        // what the kid "finds" when the piece snaps in
  subject: string;     // prompt text for this cell
  emoji: string;       // shown in name chips and as fallback art
}

export interface Puzzle {
  id: string;
  title: string;
  image: string;       // path under /public
  thumb: string;       // tiny blurred preview for the puzzle chooser
  scene: string;       // the shared world AND the single moment it captures
  layout: string[];    // scene-specific composition rules
  pieces: PuzzlePiece[]; // row-major, 9 entries
  retired?: boolean;   // no longer offered; kept so kids mid-puzzle can finish it
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'treetop-village',
    title: 'Treetop Village',
    image: '/puzzles/treetop-village.jpg',
    thumb: '/puzzles/treetop-village-thumb.jpg',
    scene:
      'a cozy woodland village on a steep hillside on festival morning, with a winding dirt path that zigzags from the top-left down to the bottom-right and everyone hurrying to the party.',
    layout: [
      'No horizontal bands: the hillside, the zigzag path and a stream create strong diagonal lines through the whole picture.',
      'Mix near and far: some subjects are big and close to the viewer, others smaller and further back up the hill.',
      'A zipline, a rope bridge, the path and the stream connect neighbouring cells.',
    ],
    pieces: [
      { name: 'Hoot the Owl', subject: 'an owl mail carrier swooping down with a bag of party invitations flying out behind it', emoji: '🦉' },
      { name: 'The Treehouse', subject: 'a round treehouse with glowing lanterns and bunting, a door flung open', emoji: '🏡' },
      { name: 'Zippy the Squirrel', subject: 'a squirrel whizzing down a zipline between two trees, tail streaming', emoji: '🐿️' },
      { name: 'Fern the Fox', subject: 'a fox skipping across a wobbly rope bridge carrying a cake', emoji: '🦊' },
      { name: 'Bun Cart', subject: 'two bunnies rolling down the path in a wooden cart full of flowers, wheels kicking up dust', emoji: '🐰' },
      { name: 'Splash Falls', subject: 'a little waterfall where a frog is cannonballing into the pool', emoji: '🐸' },
      { name: 'Mushroom House', subject: 'a red mushroom cottage with a curling smoke chimney and a mouse waving from the window', emoji: '🍄' },
      { name: 'Hedgy\'s Picnic', subject: 'a hedgehog spreading a checkered picnic blanket that billows in the breeze', emoji: '🦔' },
      { name: 'Duckling Parade', subject: 'a mother duck leading four ducklings across stepping stones in the stream', emoji: '🦆' },
    ],
  },
  {
    id: 'windy-cove',
    title: 'Windy Cove',
    image: '/puzzles/windy-cove.jpg',
    thumb: '/puzzles/windy-cove-thumb.jpg',
    scene:
      'a seaside cove on a gusty, sparkling afternoon, at the exact moment a whale leaps out of the sea and everyone turns to cheer. Wind, spray and movement everywhere.',
    layout: [
      'Sky in the upper part, one sea surface across the middle, underwater below. The sea surface is a single continuous line, but it can swell and curve with big waves rather than being ruler-straight.',
      'The center whale breaches right through the sea surface: half in the air, half underwater, with a huge arcing splash.',
      'The kite string runs from the kite down to the puffin in the sailboat. The lighthouse beam sweeps toward the whale. The sun\'s rays slant diagonally across the sky.',
    ],
    pieces: [
      { name: 'Kiki the Kite', subject: 'a red kite swooping in a loop, its string trailing down toward the sailboat below', emoji: '🪁' },
      { name: 'Pip the Balloon', subject: 'a rainbow hot air balloon tipping in the wind, a little bear in the basket waving and holding on to its hat', emoji: '🎈' },
      { name: 'Sunny', subject: 'a smiling sun bursting out from behind a cloud, three seagulls tumbling past in the gust', emoji: '☀️' },
      { name: 'Captain Puff', subject: 'a little red sailboat heeled over by the wind, spray at the bow, the puffin captain gripping the wheel with one wing and the kite string with the other', emoji: '⛵' },
      { name: 'Wally the Whale', subject: 'a happy blue whale leaping mid-breach, water streaming off it', emoji: '🐳' },
      { name: 'Lulu the Lighthouse', subject: 'a striped lighthouse on a rocky islet, its beam swinging toward the whale, a crab jumping and cheering on the rocks', emoji: '🗼' },
      { name: 'Shelly the Turtle', subject: 'a sea turtle diving downward at an angle, trailing bubbles, following a trail of glowing shells', emoji: '🐢' },
      { name: 'Ollie the Octopus', subject: 'an octopus bursting out of a treasure chest, tentacles flinging pearls and shells in every direction', emoji: '🐙' },
      { name: 'Sami the Seahorse', subject: 'a seahorse racing upward through a coral arch while tiny fish swirl around it in a spiral', emoji: '🐠' },
    ],
  },
  {
    id: 'space-party',
    title: 'Space Party',
    image: '/puzzles/space-party.jpg',
    thumb: '/puzzles/space-party-thumb.jpg',
    scene:
      'outer space on the night of a big birthday party at a friendly space station, at the exact moment a rocket blasts off with the cake and everyone zooms in to celebrate. Stars, swirls and streamers everywhere.',
    layout: [
      'Deep blue-purple space with colourful planets and nebula swirls; no ground and no horizon.',
      'A long glowing streamer of party lights loops through the whole picture from the top-left to the bottom-right, tying the friends together.',
      'The center rocket blasts upward on a curly exhaust trail that drifts into the cells below it.',
    ],
    pieces: [
      { name: 'Comet Pup', subject: 'a puppy in a space helmet riding a comet like a surfboard, ears flapping', emoji: '☄️' },
      { name: 'Ringo the Planet', subject: 'a smiling ringed planet with a cat skating around its rings', emoji: '🪐' },
      { name: 'Luna Bunny', subject: 'a bunny in a spacesuit bouncing high off a crescent moon', emoji: '🌙' },
      { name: 'Zippy UFO', subject: 'a little green alien waving from a spinning flying saucer, its beam lifting party balloons', emoji: '🛸' },
      { name: 'Party Rocket', subject: 'a red-and-white rocket blasting off with a giant birthday cake strapped on top', emoji: '🚀' },
      { name: 'DJ Bolt', subject: 'a round robot DJ on a space station deck, headphones on, music notes flying', emoji: '🤖' },
      { name: 'Astro Max', subject: 'an astronaut kid floating upside down holding a bunch of star-shaped balloons', emoji: '🧑‍🚀' },
      { name: 'Hammy the Miner', subject: 'a hamster in a tiny helmet riding a cart across a bumpy asteroid full of sparkly gems', emoji: '🐹' },
      { name: 'Twinkle the Star Whale', subject: 'a glowing space whale swimming through the stars, blowing a fountain of sparkles', emoji: '🐋' },
    ],
  },
  {
    id: 'dino-valley',
    title: 'Dino Valley',
    image: '/puzzles/dino-valley.jpg',
    thumb: '/puzzles/dino-valley-thumb.jpg',
    scene:
      'a sunny prehistoric valley on splash day, at the exact moment a baby T-rex cannonballs into the lagoon and all the dinosaurs rush in to play. Spray, leaves and excitement everywhere.',
    layout: [
      'A river winds in an S-curve from a waterfall at the top-right down through the middle to a big lagoon at the bottom.',
      'Tall palm-like ferns and a distant gentle smoking mountain in the upper part; no harsh lava.',
      'Mix near and far: some dinosaurs big and close, others smaller up the valley.',
    ],
    pieces: [
      { name: 'Pip the Pterodactyl', subject: 'a pterodactyl swooping down carrying a picnic basket in its feet', emoji: '🦅' },
      { name: 'Longneck Lou', subject: 'a tall brachiosaurus stretching to munch leaves from a giant fern tree', emoji: '🦕' },
      { name: 'Rumble Falls', subject: 'a waterfall tumbling off a cliff with a rainbow in its spray', emoji: '🌈' },
      { name: 'Trixie Triceratops', subject: 'a triceratops pushing a wooden cart piled with fruit along the riverbank', emoji: '🍉' },
      { name: 'Splash the T-rex', subject: 'a baby T-rex mid-cannonball into the river, arms tucked, huge splash', emoji: '🦖' },
      { name: 'Steggy Slide', subject: 'a stegosaurus whooshing down a muddy riverbank slide on its belly', emoji: '🦎' },
      { name: 'The Nest', subject: 'a nest of eggs hatching, three baby dinosaurs popping out and cheering', emoji: '🥚' },
      { name: 'Anky the Drummer', subject: 'an ankylosaurus drumming on logs with its tail club', emoji: '🥁' },
      { name: 'Lagoon Turtle', subject: 'a giant prehistoric turtle in the lagoon giving tiny dinosaurs a ride on its shell', emoji: '🐢' },
    ],
  },
  {
    id: 'snow-day',
    title: 'Snow Day',
    image: '/puzzles/snow-day.jpg',
    thumb: '/puzzles/snow-day-thumb.jpg',
    scene:
      'a snowy arctic hillside on the first snow day, at the exact moment a big snowball fight breaks out and everyone dives into the fun. Flying snow, scarves and cheeks pink with cold.',
    layout: [
      'A long sledding track zigzags down the hill from the top-left to the bottom-right, with an icy blue bay along the bottom.',
      'Soft falling snowflakes everywhere and a pale aurora glowing in the sky.',
      'Snowballs fly across cell edges between the friends.',
    ],
    pieces: [
      { name: 'Aurora Owl', subject: 'a snowy owl gliding under a green and pink aurora', emoji: '🦉' },
      { name: 'Igloo House', subject: 'a cozy igloo with a glowing round window and smoke curling from a tiny chimney', emoji: '🏠' },
      { name: 'Flurry the Fox', subject: 'an arctic fox leaping to catch a flying snowball', emoji: '🦊' },
      { name: 'Penguin Sled Team', subject: 'three penguins zooming down the hill on one sled, scarves streaming', emoji: '🐧' },
      { name: 'Bjorn the Polar Bear', subject: 'a polar bear cub throwing a snowball with a big grin', emoji: '🐻‍❄️' },
      { name: 'Frosty Friend', subject: 'a snowman with a carrot nose waving a stick arm as a snowball whizzes by', emoji: '⛄' },
      { name: 'Wally the Walrus', subject: 'a walrus building a wobbly snow fort and ducking behind it', emoji: '🦭' },
      { name: 'Seal Skaters', subject: 'two seals spinning on an icy pond like figure skaters', emoji: '⛸️' },
      { name: 'Nori the Narwhal', subject: 'a narwhal popping out of the icy bay with a snowball balanced on its horn', emoji: '🦄' },
    ],
  },
  {
    // Retired: too close to Windy Cove. Still loads for anyone already on it.
    id: 'sunny-cove',
    retired: true,
    title: 'Sunny Cove',
    image: '/puzzles/sunny-cove.jpg',
    thumb: '/puzzles/sunny-cove-thumb.jpg',
    scene:
      'a calm sunny seaside cove seen as a cross-section, with three bands from top to bottom: open sky, the sea surface, and the underwater world.',
    layout: [
      'The top row is ONLY open sky with soft clouds. No water, no waves, no horizon, no land anywhere in the top third.',
      'There is exactly ONE waterline: a single straight horizontal sea surface across the full width at about 55% of the image height. The middle-row subjects sit on it.',
      'Everything below the waterline, including the whole bottom row, is underwater.',
    ],
    pieces: [
      { name: 'Kiki the Kite', subject: 'a red diamond kite with a long bow-tie tail, flying high', emoji: '🪁' },
      { name: 'Pip the Balloon', subject: 'a rainbow hot air balloon with a happy face drifting through fluffy clouds', emoji: '🎈' },
      { name: 'Sunny', subject: 'a smiling sun with three seagulls flying past', emoji: '☀️' },
      { name: 'Captain Puff', subject: 'a little red sailboat with a puffin captain at the wheel', emoji: '⛵' },
      { name: 'Wally the Whale', subject: 'a sleepy blue whale spouting a fountain of water', emoji: '🐳' },
      { name: 'Lulu the Lighthouse', subject: 'a friendly striped lighthouse on a tiny rocky island, with a crab waving from the rocks', emoji: '🗼' },
      { name: 'Shelly the Turtle', subject: 'a sea turtle swimming past swaying kelp', emoji: '🐢' },
      { name: 'Ollie the Octopus', subject: 'an octopus peeking out of an open treasure chest full of shells', emoji: '🐙' },
      { name: 'Sami the Seahorse', subject: 'a seahorse curled around pink coral with tiny fish', emoji: '🐠' },
    ],
  },
];

export const PIECES_PER_PUZZLE = 9;

// Four 30-second brushing stages, in the order dentists teach them. Each one
// scrubs the foam off one quarter of the day's piece.
export const BRUSH_STAGES = [
  { label: 'top left' },
  { label: 'top right' },
  { label: 'bottom left' },
  { label: 'bottom right' },
];

export function getPuzzleById(id: string | null | undefined): Puzzle | undefined {
  return PUZZLES.find((p) => p.id === id);
}

// Background music while brushing in puzzle mode: an existing ElevenLabs
// track reused from story mode: "The Mystery of the Stinky Sea Serpent", the
// loudest and busiest of the six (about 117 BPM). It fades in over ~1.5s and
// out over the last ~2s, so playback skips those edges (see useBackgroundMusic).
export const PUZZLE_MUSIC_URL: string | null =
  'https://lg4pns09v4lekjo7.public.blob.vercel-storage.com/story-music/1bf5d747-d50e-4578-a7a3-64a0fe0d76be.mp3';

// ---------- Voice lines ----------
// Pre-recorded once with Gemini TTS (scripts/generate-puzzle-voice.mjs) and
// served as static files, so brushing never spends the daily TTS quota.
// If a clip is missing the app falls back to the device's own speech voice.

export interface VoiceLine { key: string; text: string }

export const stageVoice = (stage: number): VoiceLine => ({
  key: `stage-${stage}`,
  text: stage === 0
    ? `Let's start with your ${BRUSH_STAGES[0].label} teeth!`
    : `Now brush your ${BRUSH_STAGES[stage].label} teeth!`,
});

export const foundVoice = (puzzle: Puzzle, index: number): VoiceLine => ({
  key: `${puzzle.id}-${index}`,
  text: `You found ${puzzle.pieces[index].name}!`,
});

export const finishedVoice = (puzzle: Puzzle): VoiceLine => ({
  key: `${puzzle.id}-done`,
  text: `You finished ${puzzle.title}! Amazing brushing!`,
});

export const voiceClipUrl = (key: string) => `/puzzles/voice/${key}.wav`;

export function allVoiceLines(): VoiceLine[] {
  return [
    ...BRUSH_STAGES.map((_, i) => stageVoice(i)),
    ...PUZZLES.flatMap((p) => [...p.pieces.map((_, i) => foundVoice(p, i)), finishedVoice(p)]),
  ];
}

const POSITIONS = [
  'top-left', 'top-center', 'top-right',
  'middle-left', 'center', 'middle-right',
  'bottom-left', 'bottom-center', 'bottom-right',
];

// The prompt that makes one image work as nine pieces.
// The trick: each cell owns one subject (so a piece reads alone), but the
// scene is one dramatic moment with things crossing cell edges (so the whole
// reads as a picture, not a grid of characters on a backdrop).
export function buildPuzzlePrompt(p: Puzzle): string {
  const cells = p.pieces
    .map((piece, i) => `- ${POSITIONS[i]} cell: ${piece.subject}`)
    .join('\n');
  const layout = p.layout.map((l) => `- ${l}`).join('\n');
  return `Create a single square children's picture-book illustration of ${p.scene}

The image is secretly a 3x3 jigsaw puzzle: imagine it divided into nine equal square cells. Each cell has ONE hero subject, whose face and body stay fully inside that cell so the cell still reads as a little picture on its own:
${cells}

Make it feel like one lively, dynamic scene, NOT a tidy grid of characters on a backdrop:
- Capture one exciting moment. Every subject is mid-action, with motion lines, wind, splashes or flying bits.
- Do not line subjects up in neat rows at the same height or the same size. Vary scale and depth: some big and close, some small and far.
- Use a sweeping diagonal or curving composition, with a dynamic, slightly low camera angle.
- Let secondary things (strings, beams, paths, splashes, tails, flying objects) cross cell edges to tie neighbours together, and let subjects react to each other.
${layout}

Shared lighting, palette and continuous background across every cell edge. Do NOT draw grid lines, borders, frames, panels, gutters, seams or jigsaw outlines. No text or letters.

Style: bright, warm, soft rounded shapes, gentle gradients, friendly expressive faces, suitable for ages 3-8.`;
}
