import { motion, AnimatePresence } from 'framer-motion';

interface CompositeStoryImageProps {
  backgroundUrl: string | null;
  childSpriteUrl?: string | null;
  petSpriteUrl?: string | null;
  // Border color for portrait frames (defaults to white)
  borderColor?: string;
  className?: string;
}

// Animation variants for portrait frames
const portraitVariants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring' as const,
      stiffness: 300,
      damping: 25,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
    },
  },
};

export function CompositeStoryImage({
  backgroundUrl,
  childSpriteUrl,
  petSpriteUrl,
  borderColor = '#ffffff',
  className = '',
}: CompositeStoryImageProps) {
  const showChild = !!childSpriteUrl;
  const showPet = !!petSpriteUrl;

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

      {/* Character portraits - Rounded square overlays above control buttons */}
      {/* Child portrait - Bottom left corner, above pause button */}
      <AnimatePresence mode="wait">
        {showChild && (
          <motion.div
            key={`child-portrait-${childSpriteUrl}`}
            className="absolute bottom-20 left-3 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44"
            variants={portraitVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="w-full h-full rounded-2xl overflow-hidden"
              style={{
                border: `3px solid ${borderColor}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <img
                src={childSpriteUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pet portrait - Bottom right corner, above exit button */}
      <AnimatePresence mode="wait">
        {showPet && (
          <motion.div
            key={`pet-portrait-${petSpriteUrl}`}
            className="absolute bottom-20 right-3 w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44"
            variants={portraitVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ delay: 0.1 }}
          >
            <div
              className="w-full h-full rounded-2xl overflow-hidden"
              style={{
                border: `3px solid ${borderColor}`,
                boxShadow: '0 4px 12px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.2)',
              }}
            >
              <img
                src={petSpriteUrl}
                alt=""
                className="w-full h-full object-cover"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default CompositeStoryImage;
