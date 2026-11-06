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
  scene: string;       // shared setting that ties the cells together
  pieces: PuzzlePiece[]; // row-major, 9 entries
}

export const PUZZLES: Puzzle[] = [
  {
    id: 'sunny-cove',
    title: 'Sunny Cove',
    image: '/puzzles/sunny-cove.png',
    variants: ['/puzzles/sunny-cove.png', '/puzzles/sunny-cove-2.png', '/puzzles/sunny-cove-3.png'],
    scene:
      'a sunny seaside cove seen as a cross-section, with three bands from top to bottom: open sky, the sea surface, and the underwater world.',
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
export function buildPuzzlePrompt(p: Puzzle): string {
  const cells = p.pieces
    .map((piece, i) => `- ${POSITIONS[i]} cell: ${piece.subject}`)
    .join('\n');
  return `Create a single square children's picture-book illustration of ${p.scene}

The image is secretly a 3x3 jigsaw puzzle. Divide it mentally into nine equal square cells. Each cell must contain exactly ONE clear, centered subject that reads as a complete little picture on its own, with breathing room around it so it is never cut off at a cell edge:
${cells}

Layout rules (important):
- The top row is ONLY open sky with soft clouds. No water, no waves, no horizon, no land anywhere in the top third.
- There is exactly ONE waterline in the whole image: a single straight, continuous horizontal sea surface running across the full width, at about 55% of the image height (inside the middle row). The middle-row subjects sit on or float at this one waterline.
- Everything below the waterline, including the whole bottom row, is underwater, getting slightly deeper blue toward the bottom.
- Never repeat the horizon or waterline per row or per cell.

The nine cells must flow together as one seamless scene: shared lighting, palette and continuous background across every cell edge. Do NOT draw grid lines, borders, frames, panels, gutters or seams. No text or letters.

Style: bright, warm, soft rounded shapes, gentle gradients, friendly faces, suitable for ages 3-8.`;
}
