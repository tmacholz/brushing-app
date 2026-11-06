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
      'a sunny seaside cove seen as a cross-section: sky in the top row, the sea surface and shoreline in the middle row, and the underwater world in the bottom row. One continuous horizon and waterline run across the whole image.',
    pieces: [
      { name: 'Lulu the Lighthouse', subject: 'a friendly striped lighthouse on a rocky point', emoji: '🗼' },
      { name: 'Pip the Balloon', subject: 'a rainbow hot air balloon with a happy face drifting through fluffy clouds', emoji: '🎈' },
      { name: 'Sunny', subject: 'a smiling sun with three seagulls flying past', emoji: '☀️' },
      { name: 'Captain Puff', subject: 'a little red sailboat with a puffin captain at the wheel', emoji: '⛵' },
      { name: 'Wally the Whale', subject: 'a sleepy blue whale spouting a fountain of water', emoji: '🐳' },
      { name: 'Coco Island', subject: 'a tiny sandy island with one palm tree and a crab waving from the beach', emoji: '🏝️' },
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

The nine cells must still flow together as one seamless scene: shared lighting, palette and continuous background across every cell edge. Do NOT draw grid lines, borders, frames, panels or gutters. No text or letters.

Style: bright, warm, soft rounded shapes, gentle gradients, friendly faces, suitable for ages 3-8.`;
}
