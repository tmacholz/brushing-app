import { motion } from 'framer-motion';
import { PetArt, StageStars } from './PetArt';
import { brushesToNextStage, stageProgress, stageFor, type RosterPet } from '../../data/petRoster';

// The home screen pet (the one fed last): its stage, stars and growth bar.
// With snacks left in the bag it offers to feed them.
export function BuddyCard({ pet, brushes, snacks = 0, onClick }: { pet: RosterPet; brushes: number; snacks?: number; onClick: () => void }) {
  const stage = stageFor(brushes);
  const left = brushesToNextStage(brushes);
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.97 }}
      className="w-full bg-white rounded-2xl shadow-sm p-3 flex items-center gap-3 text-left"
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        className="w-20 h-20 shrink-0"
      >
        <PetArt pet={pet} stage={stage} className="w-full h-full" />
      </motion.div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold text-text truncate">{pet.name}</p>
          <StageStars stage={stage} />
        </div>
        <div className="mt-1.5 h-2.5 rounded-full bg-gray-100 overflow-hidden">
          <div className="h-full rounded-full bg-gradient-to-r from-primary to-accent" style={{ width: `${stageProgress(brushes) * 100}%` }} />
        </div>
        <p className="mt-1 text-xs text-text/60 font-medium">
          {left === null
            ? `${pet.name} is all grown up!`
            : `${left} more ${left === 1 ? 'snack' : 'snacks'} until ${pet.name} grows!`}
        </p>
        {snacks > 0 && (
          <p className="mt-0.5 text-xs font-bold text-primary">🍎 {snacks} {snacks === 1 ? 'snack' : 'snacks'} in your bag. Tap to feed!</p>
        )}
      </div>
    </motion.button>
  );
}
