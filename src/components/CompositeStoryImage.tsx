import { motion, AnimatePresence } from 'framer-motion';
import type { CharacterPosition } from '../types';

interface CompositeStoryImageProps {
  backgroundUrl: string | null;
  childSpriteUrl?: string | null;
  petSpriteUrl?: string | null;
  childPosition?: CharacterPosition;
  petPosition?: CharacterPosition;
  className?: string;
}

// Position styles for character placement
const positionStyles: Record<CharacterPosition, string> = {
  'left': 'left-[15%] -translate-x-1/2',
  'center': 'left-1/2 -translate-x-1/2',
  'right': 'left-[85%] -translate-x-1/2',
  'off-screen': 'hidden',
};

// Animation variants for characters
const characterVariants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.9,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 200,
      damping: 20,
    },
  },
  exit: {
    opacity: 0,
    y: -20,
    scale: 0.95,
    transition: {
      duration: 0.2,
    },
  },
};

export function CompositeStoryImage({
  backgroundUrl,
  childSpriteUrl,
  petSpriteUrl,
  childPosition = 'center',
  petPosition = 'right',
  className = '',
}: CompositeStoryImageProps) {
  const showChild = childSpriteUrl && childPosition !== 'off-screen';
  const showPet = petSpriteUrl && petPosition !== 'off-screen';

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Background layer */}
      <AnimatePresence mode="wait">
        {backgroundUrl && (
          <motion.img
            key={backgroundUrl}
            src={backgroundUrl}
            alt=""
            className="absolute inset-0 w-full h-full object-cover"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          />
        )}
      </AnimatePresence>

      {/* Gradient overlay for text readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-black/30 pointer-events-none" />

      {/* Character layer - Child sprite */}
      <AnimatePresence mode="wait">
        {showChild && (
          <motion.img
            key={`child-${childSpriteUrl}-${childPosition}`}
            src={childSpriteUrl}
            alt=""
            className={`absolute bottom-0 h-[55%] w-auto max-w-[40%] object-contain ${positionStyles[childPosition]}`}
            variants={characterVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          />
        )}
      </AnimatePresence>

      {/* Character layer - Pet sprite */}
      <AnimatePresence mode="wait">
        {showPet && (
          <motion.img
            key={`pet-${petSpriteUrl}-${petPosition}`}
            src={petSpriteUrl}
            alt=""
            className={`absolute bottom-0 h-[40%] w-auto max-w-[35%] object-contain ${positionStyles[petPosition]}`}
            variants={characterVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ delay: 0.1 }}
            style={{
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))',
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default CompositeStoryImage;
