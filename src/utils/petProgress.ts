// Pet growth, stored at child.modeProgress.pets so the schema doesn't change:
//   { buddy: 'friend:pirate-ship', brushes: { 'friend:pirate-ship': 17 }, seen: { ... },
//     food: 2, hearts: { bubbles: 5 } }
// Every brush puts a snack in the bag (`food`), and the bonus wheel can add more.
// After brushing the kid feeds snacks to any pet: each snack is one step of
// growth (`brushes`, kept under its old name), and a fully grown pet gets a
// heart instead. `buddy` is the pet fed last, shown on the home screen.
// `seen` is the highest stage the kid has been shown a level-up for.
import type { Child } from '../types';
import { getPuzzleProgress } from './puzzleProgress';
import {
  STARTER_PETS, FRIEND_PETS, MAX_STAGE, friendPetId, getRosterPet, stageFor,
  type PetStage, type RosterPet,
} from '../data/petRoster';

export interface PetProgress {
  buddy: string | null;
  brushes: Record<string, number>;
  seen: Record<string, number>;
  food: number;
  hearts: Record<string, number>;
}

type ChildLike = Pick<Child, 'modeProgress' | 'activePetId'>;

const numMap = (v: unknown): Record<string, number> => {
  const out: Record<string, number> = {};
  if (v && typeof v === 'object') {
    for (const [k, n] of Object.entries(v as Record<string, unknown>)) {
      if (typeof n === 'number' && Number.isFinite(n) && n >= 0) out[k] = Math.floor(n);
    }
  }
  return out;
};

export function getPetProgress(child: Pick<Child, 'modeProgress'> | null | undefined): PetProgress {
  const raw = (child?.modeProgress as { pets?: Record<string, unknown> } | undefined)?.pets;
  if (!raw || typeof raw !== 'object') return { buddy: null, brushes: {}, seen: {}, food: 0, hearts: {} };
  const food = typeof raw.food === 'number' && Number.isFinite(raw.food) ? Math.max(0, Math.floor(raw.food)) : 0;
  return {
    buddy: typeof raw.buddy === 'string' ? raw.buddy : null,
    brushes: numMap(raw.brushes),
    seen: numMap(raw.seen),
    food,
    hearts: numMap(raw.hearts),
  };
}

export function withPetProgress(modeProgress: Record<string, unknown> | undefined, pets: PetProgress): Record<string, unknown> {
  return { ...(modeProgress ?? {}), pets };
}

// Starters plus every hidden friend found. Retired puzzles' friends only show
// once found.
export function ownedPets(child: Pick<Child, 'modeProgress'> | null | undefined): RosterPet[] {
  const found = new Set(getPuzzleProgress(child).friends);
  return [...STARTER_PETS, ...FRIEND_PETS.filter((p) => p.puzzle && found.has(p.puzzle.id))];
}

// Friends not found yet, for the silhouettes on the pet screen.
export function hiddenPets(child: Pick<Child, 'modeProgress'> | null | undefined): RosterPet[] {
  const found = new Set(getPuzzleProgress(child).friends);
  return FRIEND_PETS.filter((p) => p.puzzle && !p.puzzle.retired && !found.has(p.puzzle.id));
}

// The buddy is the pet the kid brushes with. Before they pick one, it follows
// their story pet when that's a starter (activePetId may be a pet name or a
// database id, so resolve names through the pets list).
export function buddyPet(child: ChildLike | null | undefined, storyPetName?: string): RosterPet {
  const owned = ownedPets(child);
  const chosen = getPetProgress(child).buddy;
  const fromChoice = owned.find((p) => p.id === chosen);
  if (fromChoice) return fromChoice;
  const fromStory = owned.find((p) => p.id === storyPetName || p.id === child?.activePetId);
  return fromStory ?? STARTER_PETS[0];
}

export function petBrushes(progress: PetProgress, petId: string): number {
  return progress.brushes[petId] ?? 0;
}

export function petStage(progress: PetProgress, petId: string): PetStage {
  return stageFor(petBrushes(progress, petId));
}

// Snacks into the bag: one per finished brush, more from the bonus wheel.
export function addSnacks(child: Pick<Child, 'modeProgress'>, count = 1): PetProgress {
  const progress = getPetProgress(child);
  return { ...progress, food: progress.food + count };
}

// Feed one snack from the bag to a pet. A growing pet grows one step; a fully
// grown pet gets a heart. Returns the progress unchanged when the bag is empty.
export function feedPet(progress: PetProgress, petId: string): PetProgress {
  if (progress.food <= 0) return progress;
  const brushes = petBrushes(progress, petId);
  const grown = stageFor(brushes) === MAX_STAGE;
  return {
    ...progress,
    food: progress.food - 1,
    buddy: petId,
    brushes: grown ? progress.brushes : { ...progress.brushes, [petId]: brushes + 1 },
    hearts: grown ? { ...progress.hearts, [petId]: (progress.hearts[petId] ?? 0) + 1 } : progress.hearts,
    // A brand-new pet has "seen" stage 1, so only real growth celebrates.
    seen: { [petId]: 1, ...progress.seen },
  };
}

export function petHearts(progress: PetProgress, petId: string): number {
  return progress.hearts[petId] ?? 0;
}

// A pet whose stage is higher than the last celebration, if any.
export function pendingLevelUp(child: ChildLike | null | undefined): { pet: RosterPet; stage: PetStage } | null {
  if (!child) return null;
  const progress = getPetProgress(child);
  for (const [id, brushes] of Object.entries(progress.brushes)) {
    const stage = stageFor(brushes);
    const pet = getRosterPet(id);
    if (pet && stage > (progress.seen[id] ?? 1)) return { pet, stage };
  }
  return null;
}

export function markLevelUpSeen(child: ChildLike, petId: string, stage: PetStage): PetProgress {
  const progress = getPetProgress(child);
  return { ...progress, seen: { ...progress.seen, [petId]: stage } };
}

export function setBuddy(child: ChildLike, petId: string): PetProgress {
  return { ...getPetProgress(child), buddy: petId };
}

export { friendPetId };
