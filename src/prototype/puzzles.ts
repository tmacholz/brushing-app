// Puzzle definitions for the puzzle-mode prototype.
// Each puzzle is ONE generated image laid out as a 3x3 grid of vignettes.
// Pieces are shown by cropping that image, so style and seams always match.

export interface PuzzlePiece {
  name: string;        // what the kid "finds" when the piece snaps in
  subject: string;     // prompt text for this cell
  emoji: string;       // placeholder art until the image is generated
}

export interface Puzzle {
  id: string;
  title: string;
  image: string;       // path under /public
  variants?: string[]; // alternate generations to compare in the prototype
  scene: string;       // the shared world AND the single moment it captures
  layout: string[];    // scene-specific composition rules
  pieces: PuzzlePiece[]; // row-major, 9 entries
}

const v = (id: string, n: number) =>
  Array.from({ length: n }, (_, i) => `/puzzles/${id}${i ? `-${i + 1}` : ''}.png`);

export const PUZZLES: Puzzle[] = [
  {
    id: 'windy-cove',
    title: 'Windy Cove',
    image: '/puzzles/windy-cove.png',
    variants: v('windy-cove', 3),
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
    id: 'treetop-village',
    title: 'Treetop Village',
    image: '/puzzles/treetop-village.png',
    variants: v('treetop-village', 3),
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
    id: 'sunny-cove',
    title: 'Sunny Cove (calm, for comparison)',
    image: '/puzzles/sunny-cove.png',
    variants: v('sunny-cove', 3),
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
