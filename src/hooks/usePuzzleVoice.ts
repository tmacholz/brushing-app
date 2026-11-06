import { useCallback, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { voiceClipUrl, type VoiceLine } from '../data/puzzles';

// Plays puzzle-mode voice lines from pre-recorded static clips through the
// app's shared Web Audio context (already unlocked by the kid's first tap,
// which is what iOS needs). A missing or broken clip falls back to the
// device's own speech voice, so there is always something to hear.
export function usePuzzleVoice(enabled: boolean) {
  const { getWebAudioContext, isMuted } = useAudio();
  const buffers = useRef(new Map<string, Promise<AudioBuffer | null>>());
  const current = useRef<AudioBufferSourceNode | null>(null);
  const enabledRef = useRef(enabled && !isMuted);
  useEffect(() => { enabledRef.current = enabled && !isMuted; }, [enabled, isMuted]);

  const load = useCallback((line: VoiceLine): Promise<AudioBuffer | null> => {
    let p = buffers.current.get(line.key);
    if (!p) {
      p = (async () => {
        const ctx = getWebAudioContext();
        if (!ctx) return null;
        try {
          const res = await fetch(voiceClipUrl(line.key));
          if (!res.ok) return null;
          return await ctx.decodeAudioData(await res.arrayBuffer());
        } catch {
          return null;
        }
      })();
      buffers.current.set(line.key, p);
    }
    return p;
  }, [getWebAudioContext]);

  const stop = useCallback(() => {
    try { current.current?.stop(); } catch { /* already stopped */ }
    current.current = null;
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const play = useCallback(async (line: VoiceLine) => {
    if (!enabledRef.current) return;
    stop();
    const ctx = getWebAudioContext();
    const buffer = await load(line);
    if (!enabledRef.current) return;
    if (ctx && buffer) {
      if (ctx.state === 'suspended') await ctx.resume().catch(() => {});
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.connect(ctx.destination);
      src.start();
      current.current = src;
      return;
    }
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(line.text);
      u.rate = 1.0;
      u.pitch = 1.15;
      window.speechSynthesis.speak(u);
    }
  }, [getWebAudioContext, load, stop]);

  useEffect(() => stop, [stop]);

  return { play, preload: load, stop };
}

// iOS only lets speechSynthesis talk after it has been used inside a tap.
// Call this from the tap that starts brushing so the fallback voice works.
export function primeSpeechFallback() {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}
