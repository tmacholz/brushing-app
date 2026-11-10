import { Star } from 'lucide-react';
import { petImage, MAX_STAGE, type PetStage, type RosterPet } from '../../data/petRoster';

// A pet at its stage. The art has a soft cream background, so it sits in a
// rounded cream tile that matches it.
export function PetArt({ pet, stage, className = '' }: { pet: RosterPet; stage: PetStage; className?: string }) {
  return (
    <div className={`rounded-2xl overflow-hidden bg-[#fcf6e4] ${className}`}>
      <img src={petImage(pet, stage)} alt={pet.name} draggable={false} className="w-full h-full object-cover" />
    </div>
  );
}

export function StageStars({ stage, className = 'w-4 h-4' }: { stage: PetStage; className?: string }) {
  return (
    <div className="flex gap-0.5" aria-label={`${stage} of ${MAX_STAGE} stars`}>
      {Array.from({ length: MAX_STAGE }, (_, i) => (
        <Star key={i} className={`${className} ${i < stage ? 'text-accent fill-accent' : 'text-gray-300'}`} />
      ))}
    </div>
  );
}
