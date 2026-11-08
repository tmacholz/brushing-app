import { useCallback, useEffect, useRef } from 'react';
import { useAudio } from '../context/AudioContext';
import { voiceClipUrl, type VoiceLine } from '../data/puzzles';

// Plays puzzle-mode voice lines from pre-recorded static clips.
//
// Clips go through one shared <audio> element rather than Web Audio: on
// iPhones, Web Audio is silenced by the ring/silent switch and can be left
// suspended, while media elements play like the background music does. The
// element is unlocked by the tap that starts brushing (primeSpeechFallback).
// A missing or broken clip falls back to the device's own speech voice, so
// there is always something to hear.

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

let voiceEl: HTMLAudioElement | null = null;
function getVoiceElement(): HTMLAudioElement | null {
  if (typeof window === 'undefined' || typeof Audio === 'undefined') return null;
  if (!voiceEl) {
    voiceEl = new Audio();
    voiceEl.preload = 'auto';
    voiceEl.setAttribute('playsinline', '');
  }
  return voiceEl;
}

// Whether a clip exists, so a missing one goes straight to the device voice.
// A missing file comes back as the app's index.html, not a 404.
const clipChecks = new Map<string, Promise<boolean>>();
function hasClip(key: string): Promise<boolean> {
  let p = clipChecks.get(key);
  if (!p) {
    p = fetch(voiceClipUrl(key))
      .then((res) => res.ok && (res.headers.get('content-type') ?? '').startsWith('audio'))
      .catch(() => false);
    clipChecks.set(key, p);
  }
  return p;
}

function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.rate = 1.0;
  u.pitch = 1.15;
  window.speechSynthesis.speak(u);
}

export function usePuzzleVoice(enabled: boolean) {
  const { isMuted } = useAudio();
  const enabledRef = useRef(enabled && !isMuted);
  const playId = useRef(0);
  useEffect(() => { enabledRef.current = enabled && !isMuted; }, [enabled, isMuted]);

  const preload = useCallback((line: VoiceLine) => hasClip(line.key), []);

  const stop = useCallback(() => {
    playId.current++;
    const el = voiceEl;
    if (el && !el.paused) el.pause();
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
  }, []);

  const play = useCallback(async (line: VoiceLine) => {
    if (!enabledRef.current) return;
    stop();
    const id = playId.current;
    const el = getVoiceElement();
    const clip = el ? await hasClip(line.key) : false;
    if (id !== playId.current || !enabledRef.current) return;
    if (el && clip) {
      el.src = voiceClipUrl(line.key);
      el.volume = 1;
      try {
        await el.play();
        return;
      } catch {
        if (id !== playId.current) return;
        // Blocked or undecodable: use the device voice instead.
      }
    }
    speak(line.text);
  }, [stop]);

  useEffect(() => stop, [stop]);

  return { play, preload, stop };
}

// iOS only lets audio play later if it was started inside a tap. Call this
// from the tap that starts brushing so both the clips and the device voice work.
export function primeSpeechFallback() {
  const el = getVoiceElement();
  if (el) {
    el.src = SILENT_WAV;
    el.play().then(() => el.pause()).catch(() => { /* best effort */ });
  }
  if (!('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(' ');
  u.volume = 0;
  window.speechSynthesis.speak(u);
}
