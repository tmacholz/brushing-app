// Pets that level up. A kid's pets are the starters (Bubbles and Fern) plus
// every hidden friend they have found in puzzle mode. Each pet grows through
// 3 stages, from snacks fed to it after brushing (one snack per brush,
// plus any the bonus wheel gives).
//
// Art: public/pets/stages/<id>-<stage>.webp (made by scripts/generate-pet-stages.mjs).
// A friend's stage 1 is its puzzle friend image.
import { PUZZLES, type Puzzle } from './puzzles';

export type PetStage = 1 | 2 | 3;

export interface RosterPet {
  id: string;                 // 'bubbles', 'fern' or 'friend:<puzzleId>'
  name: string;               // short name, e.g. "Squirt"
  fullName: string;           // e.g. "Squirt the Baby Kraken"
  emoji: string;
  kind: 'starter' | 'friend';
  puzzle?: Puzzle;            // where a friend hides
}

// Snacks fed to this pet needed to reach each stage.
export const STAGE_THRESHOLDS: Record<PetStage, number> = { 1: 0, 2: 14, 3: 42 };
export const MAX_STAGE: PetStage = 3;

// The original pets kids keep. Story mode still uses these (from the pets table).
export const STARTER_PETS: RosterPet[] = [
  { id: 'bubbles', name: 'Bubbles', fullName: 'Bubbles', emoji: '🐠', kind: 'starter' },
  { id: 'fern', name: 'Fern', fullName: 'Fern', emoji: '🐉', kind: 'starter' },
];

export const friendPetId = (puzzleId: string) => `friend:${puzzleId}`;

const friendPet = (p: Puzzle): RosterPet => ({
  id: friendPetId(p.id),
  name: p.friend.name.split(' the ')[0],
  fullName: p.friend.name,
  emoji: p.friend.emoji,
  kind: 'friend',
  puzzle: p,
});

export const FRIEND_PETS: RosterPet[] = PUZZLES.map(friendPet);

export function getRosterPet(id: string | null | undefined): RosterPet | undefined {
  if (!id) return undefined;
  return STARTER_PETS.find((p) => p.id === id) ?? FRIEND_PETS.find((p) => p.id === id);
}

export function petImage(pet: RosterPet, stage: PetStage): string {
  if (pet.kind === 'friend' && stage === 1 && pet.puzzle) return pet.puzzle.friend.image;
  return `/pets/stages/${pet.id.replace(':', '-')}-${stage}.webp`;
}

export function stageFor(brushes: number): PetStage {
  if (brushes >= STAGE_THRESHOLDS[3]) return 3;
  if (brushes >= STAGE_THRESHOLDS[2]) return 2;
  return 1;
}

// Brushes left until the next stage, or null when fully grown.
export function brushesToNextStage(brushes: number): number | null {
  const stage = stageFor(brushes);
  if (stage === MAX_STAGE) return null;
  return STAGE_THRESHOLDS[(stage + 1) as PetStage] - brushes;
}

// 0..1 progress through the current stage, for the growth bar.
export function stageProgress(brushes: number): number {
  const stage = stageFor(brushes);
  if (stage === MAX_STAGE) return 1;
  const from = STAGE_THRESHOLDS[stage];
  const to = STAGE_THRESHOLDS[(stage + 1) as PetStage];
  return Math.max(0, Math.min(1, (brushes - from) / (to - from)));
}

export { levelUpVoice } from './puzzles';
