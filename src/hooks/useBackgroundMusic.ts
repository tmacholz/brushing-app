import { useEffect, useRef } from 'react';

const FADE_MS = 600;
// Generated tracks fade in and out at their edges; skip those so a loop
// doesn't dip to silence each time it restarts.
const TRIM_START_S = 1.5;
const TRIM_END_S = 2.5;

// Loops a background track while `playing` is true, fading in and out so
// pausing or finishing never cuts it off abruptly. The element is created on
// first play and released on unmount.
export function useBackgroundMusic(url: string | null, playing: boolean, volume = 0.18) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!url) return;
    if (!audioRef.current && playing) {
      const a = new Audio(url);
      a.volume = 0;
      a.preload = 'auto';
      a.addEventListener('loadedmetadata', () => { a.currentTime = TRIM_START_S; }, { once: true });
      const restart = () => { a.currentTime = TRIM_START_S; a.play().catch(() => {}); };
      a.addEventListener('timeupdate', () => {
        if (a.duration && a.currentTime > a.duration - TRIM_END_S) restart();
      });
      a.addEventListener('ended', restart);
      audioRef.current = a;
    }
    const a = audioRef.current;
    if (!a) return;

    if (fadeRef.current !== null) window.clearInterval(fadeRef.current);
    const target = playing ? volume : 0;
    if (playing && a.paused) a.play().catch(() => { /* blocked or offline: music is optional */ });
    const step = (volume / FADE_MS) * 50;
    fadeRef.current = window.setInterval(() => {
      const next = a.volume + (target > a.volume ? step : -step);
      if ((target > a.volume && next >= target) || (target <= a.volume && next <= target)) {
        a.volume = target;
        if (!playing) a.pause();
        if (fadeRef.current !== null) window.clearInterval(fadeRef.current);
        fadeRef.current = null;
      } else {
        a.volume = Math.min(1, Math.max(0, next));
      }
    }, 50);
  }, [url, playing, volume]);

  useEffect(() => () => {
    if (fadeRef.current !== null) window.clearInterval(fadeRef.current);
    audioRef.current?.pause();
    audioRef.current = null;
  }, []);
}
