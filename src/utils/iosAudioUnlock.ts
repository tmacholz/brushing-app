/**
 * iOS Audio Unlock Utility
 *
 * On iOS, web audio respects the hardware mute/silent switch by default.
 * This utility "unlocks" audio playback by playing a silent buffer during
 * a user interaction, which switches the audio session to a mode that
 * ignores the mute switch.
 *
 * This must be called as a direct result of a user gesture (touchstart, click).
 */

let audioContext: AudioContext | null = null;
let isUnlocked = false;

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
 * 3. This triggers iOS to switch the audio session category
 *    from "ambient" (respects mute) to "playback" (ignores mute)
 */
export async function unlockAudio(): Promise<void> {
  if (isUnlocked) return;

  const ctx = getSharedAudioContext();

  // Resume context if suspended (required for autoplay policy)
  if (ctx.state === 'suspended') {
    await ctx.resume();
  }

  // Create a short silent buffer (1 sample at sample rate = very short)
  const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start(0);

  // Also unlock HTML5 Audio by creating and playing a data URI
  // This ensures both Web Audio API and HTML5 Audio are unlocked
  try {
    // Minimal valid MP3 file (silent)
    const silentDataUri =
      'data:audio/mp3;base64,SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4Ljc2LjEwMAAAAAAAAAAAAAAA//tQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAABhgC7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7u7//////////////////////////////////////////////////////////////////8AAAAATGF2YzU4LjEzAAAAAAAAAAAAAAAAJAAAAAAAAAAAAYYoRwmHAAAAAAD/+1DEAAAGAAGn9AAAIgAANP8AAABM//tQxBgAAADSAAAAAAAAANIAAAAATEFN//tQxCEAAADSAAAAAAAAANIAAAAA//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8=';

    const audio = new Audio(silentDataUri);
    audio.volume = 0.01; // Very quiet
    audio.playsInline = true;
    await audio.play();
    audio.pause();
  } catch {
    // HTML5 Audio unlock failed, but Web Audio API unlock may still work
    console.log('[iOS Audio] HTML5 Audio unlock fallback failed, continuing with Web Audio API');
  }

  isUnlocked = true;
  console.log('[iOS Audio] Audio unlocked for silent mode playback');
}

/**
 * Checks if audio has been unlocked
 */
export function isAudioUnlocked(): boolean {
  return isUnlocked;
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
  // Some iOS versions require touchend for the gesture to be considered "user-initiated"
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
}
