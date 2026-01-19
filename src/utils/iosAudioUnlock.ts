/**
 * iOS Audio Unlock Utility
 *
 * On iOS, web audio respects the hardware mute/silent switch by default.
 * HTML5 Audio elements ALWAYS respect the mute switch - there's no way around it.
 * The ONLY way to play audio when muted on iOS is through the Web Audio API.
 *
 * This utility provides:
 * 1. A shared AudioContext that's unlocked on first user interaction
 * 2. Helper functions to play audio through Web Audio API (bypasses mute switch)
 */

let audioContext: AudioContext | null = null;
let isUnlocked = false;

// Cache for decoded audio buffers
const audioBufferCache = new Map<string, AudioBuffer>();

/**
 * Detects if the current device is running iOS
 */
export function isIOS(): boolean {
  if (typeof navigator === 'undefined') return false;

  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    // iPad on iOS 13+ reports as Mac
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Gets or creates a shared AudioContext.
 * Using a shared context is more efficient and ensures consistent unlock state.
 */
export function getSharedAudioContext(): AudioContext {
  if (!audioContext || audioContext.state === 'closed') {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    audioContext = new AudioContextClass();
  }
  return audioContext;
}

/**
 * Unlocks audio playback on iOS by playing a silent buffer.
 * Should be called on the first user interaction (touchstart/click).
 *
 * This works by:
 * 1. Creating a short silent audio buffer
 * 2. Playing it through the Web Audio API
 * 3. This "unlocks" the AudioContext for future playback
 */
export async function unlockAudio(): Promise<void> {
  if (isUnlocked) return;

  const ctx = getSharedAudioContext();

  // Resume context if suspended (required for autoplay policy)
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Create a short silent buffer and play it
  // This is the key to unlocking audio on iOS
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  isUnlocked = true;
  console.log('[iOS Audio] Audio context unlocked');
}

/**
 * Checks if audio has been unlocked
 */
export function isAudioUnlocked(): boolean {
  return isUnlocked;
}

/**
 * Fetches and decodes an audio URL into an AudioBuffer.
 * Results are cached for performance.
 */
export async function fetchAudioBuffer(url: string): Promise<AudioBuffer> {
  // Check cache first
  const cached = audioBufferCache.get(url);
  if (cached) {
    return cached;
  }

  const ctx = getSharedAudioContext();

  // Fetch the audio file
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch audio: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  // Decode the audio data
  const audioBuffer = await ctx.decodeAudioData(arrayBuffer);

  // Cache it
  audioBufferCache.set(url, audioBuffer);

  return audioBuffer;
}

/**
 * Control object returned by playAudioBuffer
 */
export interface AudioPlaybackControl {
  stop: () => void;
  pause: () => void;
  resume: () => void;
  readonly isPlaying: boolean;
  readonly isPaused: boolean;
  readonly duration: number;
  onEnded: (() => void) | null;
}

/**
 * Plays an AudioBuffer through the Web Audio API.
 * This bypasses the iOS mute switch.
 */
export function playAudioBuffer(
  buffer: AudioBuffer,
  options?: { loop?: boolean; volume?: number }
): AudioPlaybackControl {
  const ctx = getSharedAudioContext();
  const { loop = false, volume = 1.0 } = options || {};

  // Resume context if needed
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  // Create gain node for volume control
  const gainNode = ctx.createGain();
  gainNode.gain.value = volume;
  gainNode.connect(ctx.destination);

  // Create source node
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = loop;
  source.connect(gainNode);

  let isPlaying = true;
  let isPaused = false;
  let startTime = ctx.currentTime;
  let pauseTime = 0;
  let currentSource: AudioBufferSourceNode | null = source;

  const control: AudioPlaybackControl = {
    get isPlaying() {
      return isPlaying && !isPaused;
    },
    get isPaused() {
      return isPaused;
    },
    get duration() {
      return buffer.duration;
    },
    onEnded: null,

    stop() {
      if (currentSource) {
        try {
          currentSource.stop();
        } catch {
          // Already stopped
        }
        currentSource.disconnect();
        currentSource = null;
      }
      gainNode.disconnect();
      isPlaying = false;
      isPaused = false;
    },

    pause() {
      if (!isPlaying || isPaused || !currentSource) return;

      pauseTime = ctx.currentTime - startTime;
      try {
        currentSource.stop();
      } catch {
        // Already stopped
      }
      currentSource.disconnect();
      currentSource = null;
      isPaused = true;
    },

    resume() {
      if (!isPaused) return;

      // Create a new source starting from where we paused
      const newSource = ctx.createBufferSource();
      newSource.buffer = buffer;
      newSource.loop = loop;
      newSource.connect(gainNode);

      newSource.onended = () => {
        if (isPlaying && !isPaused && control.onEnded) {
          isPlaying = false;
          control.onEnded();
        }
      };

      newSource.start(0, pauseTime);
      startTime = ctx.currentTime - pauseTime;
      currentSource = newSource;
      isPaused = false;
    },
  };

  source.onended = () => {
    if (isPlaying && !isPaused && control.onEnded) {
      isPlaying = false;
      control.onEnded();
    }
  };

  source.start(0);

  return control;
}

/**
 * Convenience function to fetch, decode, and play an audio URL.
 * This is the main function to use for playing audio that bypasses iOS mute.
 */
export async function playAudioUrl(
  url: string,
  options?: { loop?: boolean; volume?: number }
): Promise<AudioPlaybackControl> {
  // Ensure audio is unlocked
  if (!isUnlocked) {
    await unlockAudio();
  }

  const buffer = await fetchAudioBuffer(url);
  return playAudioBuffer(buffer, options);
}

/**
 * Clears the audio buffer cache
 */
export function clearAudioBufferCache(): void {
  audioBufferCache.clear();
}

/**
 * Sets up automatic audio unlock on first user interaction.
 * Call this once at app initialization.
 */
export function setupAutoUnlock(): () => void {
  const handleInteraction = async () => {
    await unlockAudio();
    // Remove listeners after successful unlock
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('touchend', handleInteraction);
    document.removeEventListener('click', handleInteraction);
  };

  // Use touchstart AND touchend for better iOS coverage
  document.addEventListener('touchstart', handleInteraction, { passive: true });
  document.addEventListener('touchend', handleInteraction, { passive: true });
  document.addEventListener('click', handleInteraction, { passive: true });

  // Return cleanup function
  return () => {
    document.removeEventListener('touchstart', handleInteraction);
    document.removeEventListener('touchend', handleInteraction);
    document.removeEventListener('click', handleInteraction);
  };
}

/**
 * Force close the shared audio context (for cleanup/testing)
 */
export function closeSharedAudioContext(): void {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
    isUnlocked = false;
  }
  audioBufferCache.clear();
}
