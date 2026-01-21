import {
  createContext,
  useContext,
  useCallback,
  useRef,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

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
  // Shared Web Audio context for use by other hooks (e.g., audio splicing)
  getWebAudioContext: () => AudioContext | null;
  // Function to unlock audio on iOS - call this on user interaction
  unlockAudio: () => Promise<void>;
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

// Silent audio data URL - a tiny silent MP3 for unlocking HTML Audio on iOS
const SILENT_AUDIO_DATA_URL =
  'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYNAAAAAAAAAAAAAAAAAAAA//tQZAAP8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAETEFNRTMuMTAwVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVV//tQZB4P8AAAaQAAAAgAAA0gAAABAAABpAAAACAAADSAAAAEVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVQ==';

// Track if HTML Audio has been unlocked
let htmlAudioUnlocked = false;
let silentAudioElement: HTMLAudioElement | null = null;

export function AudioProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize Web Audio context
  const initWebAudio = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      setIsReady(true);
    }
    return audioContextRef.current;
  }, []);

  // Unlock HTML Audio for iOS - plays a silent sound to allow future playback
  const unlockHtmlAudio = useCallback(async () => {
    if (htmlAudioUnlocked) return;

    try {
      // Create silent audio element if needed
      if (!silentAudioElement) {
        silentAudioElement = new Audio(SILENT_AUDIO_DATA_URL);
        silentAudioElement.volume = 0.01;
      }

      // Play the silent audio to unlock HTML Audio on iOS
      await silentAudioElement.play();
      silentAudioElement.pause();
      silentAudioElement.currentTime = 0;
      htmlAudioUnlocked = true;
      console.log('[Audio] HTML Audio unlocked for iOS');
    } catch (err) {
      console.warn('[Audio] Failed to unlock HTML Audio:', err);
    }
  }, []);

  // Combined unlock function for both Web Audio and HTML Audio
  const unlockAudio = useCallback(async () => {
    // Initialize and resume Web Audio
    const ctx = initWebAudio();
    if (ctx.state === 'suspended') {
      await ctx.resume();
      console.log('[Audio] Web Audio context resumed');
    }

    // Unlock HTML Audio
    await unlockHtmlAudio();
  }, [initWebAudio, unlockHtmlAudio]);

  // Get the shared Web Audio context
  const getWebAudioContext = useCallback(() => {
    return audioContextRef.current;
  }, []);

  useEffect(() => {
    // Try to init immediately (will work on desktop)
    try {
      initWebAudio();
    } catch {
      // Will init on first interaction
    }

    // Unlock audio on first user interaction (required for iOS)
    const handleInteraction = async () => {
      await unlockAudio();
    };

    document.addEventListener('touchstart', handleInteraction, { once: true });
    document.addEventListener('click', handleInteraction, { once: true });

    return () => {
      document.removeEventListener('touchstart', handleInteraction);
      document.removeEventListener('click', handleInteraction);
    };
  }, [initWebAudio, unlockAudio]);

  const playSound = useCallback(
    (name: SoundName) => {
      if (isMuted || !audioContextRef.current) return;

      const config = SOUND_CONFIGS[name];
      if (!config) return;

      const ctx = audioContextRef.current;

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

  return (
    <AudioContext.Provider value={{ playSound, setMuted, isMuted, isReady, getWebAudioContext, unlockAudio }}>
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
