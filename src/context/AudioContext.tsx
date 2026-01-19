import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  getSharedAudioContext,
  unlockAudio,
  isAudioUnlocked,
} from '../utils/iosAudioUnlock';

type SoundName =
  | 'tap'
  | 'success'
  | 'countdown'
  | 'chapterStart'
  | 'storyTransition'
  | 'brushingPrompt'
  | 'complete'
  | 'points'
  | 'unlock';

interface AudioContextType {
  playSound: (name: SoundName) => void;
  setMuted: (muted: boolean) => void;
  isMuted: boolean;
  isReady: boolean;
  /** Force unlock audio (useful if user reports no sound) */
  forceUnlock: () => Promise<void>;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

// Sound configurations - using Web Audio API oscillators for simple synth sounds
const SOUND_CONFIGS: Record<
  SoundName,
  { frequencies: number[]; duration: number; type: OscillatorType; volume: number }
> = {
  tap: { frequencies: [800], duration: 0.05, type: 'sine', volume: 0.2 },
  success: { frequencies: [523, 659, 784], duration: 0.15, type: 'sine', volume: 0.25 },
  countdown: { frequencies: [440], duration: 0.2, type: 'sine', volume: 0.3 },
  chapterStart: { frequencies: [392, 523, 659, 784], duration: 0.2, type: 'sine', volume: 0.25 },
  storyTransition: { frequencies: [523, 659], duration: 0.1, type: 'triangle', volume: 0.2 },
  brushingPrompt: { frequencies: [659, 784, 880], duration: 0.12, type: 'sine', volume: 0.25 },
  complete: { frequencies: [523, 659, 784, 1047], duration: 0.25, type: 'sine', volume: 0.3 },
  points: { frequencies: [880, 1108], duration: 0.1, type: 'sine', volume: 0.2 },
  unlock: { frequencies: [392, 523, 659, 784, 1047], duration: 0.2, type: 'sine', volume: 0.3 },
};

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize audio context using shared context (for iOS unlock compatibility)
    const initAudio = async () => {
      if (!audioContextRef.current) {
        audioContextRef.current = getSharedAudioContext();
        setIsReady(true);
      }
    };

    // Try to init immediately, but also on first interaction
    try {
      initAudio();
    } catch {
      // Will init on first interaction
    }

    const handleInteraction = async () => {
      await initAudio();
      // Unlock audio for iOS silent mode
      await unlockAudio();
      if (audioContextRef.current?.state === 'suspended') {
        audioContextRef.current.resume();
      }
    };

    // Use touchstart, touchend, AND click for better iOS coverage
    document.addEventListener('touchstart', handleInteraction, { once: true, passive: true });
    document.addEventListener('touchend', handleInteraction, { once: true, passive: true });
    document.addEventListener('click', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('touchend', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, []);

  const playSound = useCallback(
    (name: SoundName) => {
      if (isMuted || !audioContextRef.current) return;

      const config = SOUND_CONFIGS[name];
      if (!config) return;

      const ctx = audioContextRef.current;

      // Ensure audio is unlocked for iOS silent mode
      if (!isAudioUnlocked()) {
        unlockAudio();
      }

      // Resume context if suspended
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      const { frequencies, duration, type, volume } = config;
      const now = ctx.currentTime;

      frequencies.forEach((freq, index) => {
        const oscillator = ctx.createOscillator();
        const gainNode = ctx.createGain();

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(freq, now);

        const startTime = now + index * (duration * 0.7);
        gainNode.gain.setValueAtTime(0, startTime);
        gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(ctx.destination);

        oscillator.start(startTime);
        oscillator.stop(startTime + duration + 0.1);
      });
    },
    [isMuted]
  );

  const setMuted = useCallback((muted: boolean) => {
    setIsMuted(muted);
  }, []);

  const forceUnlock = useCallback(async () => {
    await unlockAudio();
    if (audioContextRef.current?.state === 'suspended') {
      await audioContextRef.current.resume();
    }
  }, []);

  return (
    <AudioContext.Provider value={{ playSound, setMuted, isMuted, isReady, forceUnlock }}>
      {children}
    </AudioContext.Provider>
  );
}

export function useAudio() {
  const context = useContext(AudioContext);
  if (context === undefined) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
}

export type { SoundName };
export default AudioContext;
