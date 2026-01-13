import { useState, useCallback, useMemo } from 'react';
import type { StoryChapter, StorySegment } from '../types';

export interface StoryProgressionState {
  currentSegmentIndex: number;
  currentSegment: StorySegment | null;
  isShowingRecap: boolean;
  isShowingTitle: boolean;
  isShowingCliffhanger: boolean;
  isShowingTeaser: boolean;
  phase: 'recap' | 'title' | 'story' | 'cliffhanger' | 'teaser' | 'complete';
}

export interface UseStoryProgressionReturn extends StoryProgressionState {
  advanceToSegment: (segmentIndex: number) => void;
  getSegmentForTime: (elapsedSeconds: number) => void;
}

// Timeline breakdown for 2-minute session:
// 0:00-0:15  → Recap (if not chapter 1)
// 0:15-0:25  → Chapter title reveal
// 0:25-1:45  → Story segments (~80 seconds)
// 1:45-1:55  → Cliffhanger
// 1:55-2:00  → Teaser

const RECAP_END = 15;
const TITLE_END = 25;
const STORY_START = 25;
const STORY_END = 105; // 1:45
const CLIFFHANGER_END = 115;
const TEASER_END = 120;

export function useStoryProgression(
  chapter: StoryChapter | null,
  isFirstChapter: boolean = false
): UseStoryProgressionReturn {
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [phase, setPhase] = useState<StoryProgressionState['phase']>(
    isFirstChapter ? 'title' : 'recap'
  );

  const segments = chapter?.segments ?? [];
  const totalSegments = segments.length;

  // Calculate segment timing within story phase
  const segmentTimings = useMemo(() => {
    if (totalSegments === 0) return [];

    const storyDuration = STORY_END - STORY_START; // 80 seconds
    const timings: { start: number; end: number }[] = [];

    // Calculate total duration from segments
    const totalDuration = segments.reduce((acc, seg) => acc + seg.durationSeconds, 0);

    // Scale segments to fit in the story window
    const scale = totalDuration > 0 ? storyDuration / totalDuration : 1;

    let currentTime = STORY_START;
    segments.forEach((segment) => {
      const duration = segment.durationSeconds * scale;
      timings.push({
        start: currentTime,
        end: currentTime + duration,
      });
      currentTime += duration;
    });

    return timings;
  }, [segments, totalSegments]);

  const getSegmentForTime = useCallback(
    (elapsedSeconds: number) => {
      // Determine phase based on elapsed time
      if (!isFirstChapter && elapsedSeconds < RECAP_END) {
        setPhase('recap');
        return;
      }

      if (elapsedSeconds < TITLE_END) {
        setPhase('title');
        return;
      }

      if (elapsedSeconds < STORY_END) {
        setPhase('story');

        // Find the current segment
        const segmentIndex = segmentTimings.findIndex(
          (timing) => elapsedSeconds >= timing.start && elapsedSeconds < timing.end
        );

        if (segmentIndex !== -1) {
          setCurrentSegmentIndex(segmentIndex);
        } else if (segmentTimings.length > 0) {
          // If past all segments, show the last one
          setCurrentSegmentIndex(totalSegments - 1);
        }
        return;
      }

      if (elapsedSeconds < CLIFFHANGER_END) {
        setPhase('cliffhanger');
        return;
      }

      if (elapsedSeconds < TEASER_END) {
        setPhase('teaser');
        return;
      }

      setPhase('complete');
    },
    [isFirstChapter, segmentTimings, totalSegments]
  );

  const advanceToSegment = useCallback((index: number) => {
    setCurrentSegmentIndex(Math.max(0, Math.min(index, totalSegments - 1)));
  }, [totalSegments]);

  const currentSegment = segments[currentSegmentIndex] ?? null;

  return {
    currentSegmentIndex,
    currentSegment,
    isShowingRecap: phase === 'recap',
    isShowingTitle: phase === 'title',
    isShowingCliffhanger: phase === 'cliffhanger',
    isShowingTeaser: phase === 'teaser',
    phase,
    advanceToSegment,
    getSegmentForTime,
  };
}

export default useStoryProgression;
