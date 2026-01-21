import { useState, useCallback } from 'react';
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
  advanceToNext: () => void;
  // Legacy function - kept for compatibility but now only initializes the phase
  getSegmentForTime: (elapsedSeconds: number) => void;
}

/**
 * Hook for managing story progression through phases and segments.
 *
 * Progression is now audio-driven: call advanceToNext() when audio completes
 * to move to the next phase or segment. The 2-minute timer continues to run
 * for progress display, but no longer controls segment timing.
 *
 * Phase order: recap (optional) → title → story segments → cliffhanger → teaser → complete
 */
export function useStoryProgression(
  chapter: StoryChapter | null
): UseStoryProgressionReturn {
  const hasRecap = Boolean(chapter?.recap);
  const [currentSegmentIndex, setCurrentSegmentIndex] = useState(0);
  const [phase, setPhase] = useState<StoryProgressionState['phase']>(
    hasRecap ? 'recap' : 'title'
  );

  const segments = chapter?.segments ?? [];
  const totalSegments = segments.length;

  /**
   * Advance to the next phase or segment.
   * Call this when audio for the current phase/segment completes.
   */
  const advanceToNext = useCallback(() => {
    setPhase((currentPhase) => {
      switch (currentPhase) {
        case 'recap':
          return 'title';

        case 'title':
          if (totalSegments > 0) {
            setCurrentSegmentIndex(0);
            return 'story';
          }
          // No segments, skip to cliffhanger
          return 'cliffhanger';

        case 'story':
          // Check if there are more segments
          setCurrentSegmentIndex((prevIndex) => {
            const nextIndex = prevIndex + 1;
            if (nextIndex < totalSegments) {
              // Stay in story phase, just advance segment
              return nextIndex;
            }
            // No more segments, will transition to cliffhanger below
            return prevIndex;
          });

          // Check if we're at the last segment
          // We need to read the current index, but since setCurrentSegmentIndex
          // is async, we use a different approach
          return currentPhase; // Stay in story, the index update handles it

        case 'cliffhanger':
          return 'teaser';

        case 'teaser':
          return 'complete';

        case 'complete':
          return 'complete';

        default:
          return currentPhase;
      }
    });
  }, [totalSegments]);

  /**
   * Special advance function for story phase that checks if we should
   * move to cliffhanger. Called after segment index is updated.
   */
  const advanceFromStory = useCallback(() => {
    setCurrentSegmentIndex((prevIndex) => {
      const nextIndex = prevIndex + 1;
      if (nextIndex < totalSegments) {
        return nextIndex;
      } else {
        // Last segment done, move to cliffhanger
        setPhase('cliffhanger');
        return prevIndex;
      }
    });
  }, [totalSegments]);

  /**
   * Combined advance function that handles all phases correctly.
   */
  const advanceToNextCombined = useCallback(() => {
    if (phase === 'story') {
      advanceFromStory();
    } else {
      advanceToNext();
    }
  }, [phase, advanceFromStory, advanceToNext]);

  /**
   * Legacy function - now only used to initialize the starting phase.
   * Segment timing is no longer based on elapsed time.
   */
  const getSegmentForTime = useCallback(
    (_elapsedSeconds: number) => {
      // This function is kept for API compatibility but no longer
      // controls segment timing. Progression is now audio-driven.
      // The initial phase is set in useState based on hasRecap.
    },
    []
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
    advanceToNext: advanceToNextCombined,
    getSegmentForTime,
  };
}

export default useStoryProgression;
