import { motion, AnimatePresence } from 'framer-motion';

interface CompositeStoryImageProps {
  backgroundUrl: string | null;
  childSpriteUrl?: string | null;
  petSpriteUrl?: string | null;
  // Border color for portrait circles (defaults to white)
  borderColor?: string;
  className?: string;
}

// Animation variants for portrait circles
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

      {/* Character portraits - Circle overlays in corners */}
      {/* Child portrait - Bottom left corner */}
      <AnimatePresence mode="wait">
        {showChild && (
          <motion.div
            key={`child-portrait-${childSpriteUrl}`}
            className="absolute bottom-3 left-3 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
            variants={portraitVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
          >
            <div
              className="w-full h-full rounded-full overflow-hidden"
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

      {/* Pet portrait - Bottom right corner */}
      <AnimatePresence mode="wait">
        {showPet && (
          <motion.div
            key={`pet-portrait-${petSpriteUrl}`}
            className="absolute bottom-3 right-3 w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24"
            variants={portraitVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            transition={{ delay: 0.1 }}
          >
            <div
              className="w-full h-full rounded-full overflow-hidden"
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
