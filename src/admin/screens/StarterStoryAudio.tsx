import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Volume2,
  Plus,
  X,
  Copy,
  Download,
} from 'lucide-react';
import { getAllStories } from '../../data/starterStories';
import type { StoryTemplate, StorySegment, AudioSplicePoint } from '../../types';

interface SegmentAudioState {
  audioUrl: string | null;
  splicePoints: AudioSplicePoint[];
  loading: boolean;
}

type AudioStateMap = Record<string, SegmentAudioState>;

interface StarterStoryAudioProps {
  onBack: () => void;
}

export function StarterStoryAudio({ onBack }: StarterStoryAudioProps) {
  const [stories] = useState<StoryTemplate[]>(() => getAllStories());
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [audioState, setAudioState] = useState<AudioStateMap>({});
  const [playingSegmentId, setPlayingSegmentId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [editingSplicePoints, setEditingSplicePoints] = useState<string | null>(null);
  const [generatingAll, setGeneratingAll] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Count stats
  const totalSegments = stories.reduce(
    (acc, story) => acc + story.chapters.reduce((a, ch) => a + ch.segments.length, 0),
    0
  );
  const segmentsWithAudio = Object.values(audioState).filter((s) => s.audioUrl).length;

  const toggleStory = (storyId: string) => {
    setExpandedStories((prev) => {
      const next = new Set(prev);
      if (next.has(storyId)) {
        next.delete(storyId);
      } else {
        next.add(storyId);
      }
      return next;
    });
  };

  const toggleChapter = (chapterId: string) => {
    setExpandedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) {
        next.delete(chapterId);
      } else {
        next.add(chapterId);
      }
      return next;
    });
  };

  const generateAudio = async (segment: StorySegment, storyId: string, chapterNumber: number) => {
    setAudioState((prev) => ({
      ...prev,
      [segment.id]: { ...prev[segment.id], loading: true, audioUrl: null, splicePoints: [] },
    }));

    try {
      const res = await fetch('/api/admin/generate-starter-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: segment.id,
          text: segment.text,
          storyId,
          chapterNumber,
          segmentOrder: segment.id.split('-s').pop() || '1',
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await res.json();
      setAudioState((prev) => ({
        ...prev,
        [segment.id]: {
          audioUrl: data.audioUrl,
          splicePoints: prev[segment.id]?.splicePoints || [],
          loading: false,
        },
      }));
    } catch (error) {
      console.error('Failed to generate audio:', error);
      setAudioState((prev) => ({
        ...prev,
        [segment.id]: { ...prev[segment.id], loading: false },
      }));
      alert('Failed to generate audio. Check console for details.');
    }
  };

  const generateAllAudio = async () => {
    setGeneratingAll(true);

    for (const story of stories) {
      for (const chapter of story.chapters) {
        for (const segment of chapter.segments) {
          if (!audioState[segment.id]?.audioUrl) {
            await generateAudio(segment, story.id, chapter.chapterNumber);
            // Small delay to avoid rate limiting
            await new Promise((resolve) => setTimeout(resolve, 300));
          }
        }
      }
    }

    setGeneratingAll(false);
  };

  const togglePlay = (segmentId: string, audioUrl: string) => {
    if (playingSegmentId === segmentId) {
      audioRef.current?.pause();
      setPlayingSegmentId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingSegmentId(segmentId);
      }
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime * 1000);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration * 1000);
    }
  };

  const handleEnded = () => {
    setPlayingSegmentId(null);
    setCurrentTime(0);
  };

  const addSplicePoint = (segmentId: string, placeholder: 'CHILD' | 'PET') => {
    const newPoint: AudioSplicePoint = {
      placeholder,
      timestampMs: Math.round(currentTime),
    };
    setAudioState((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        splicePoints: [...(prev[segmentId]?.splicePoints || []), newPoint].sort(
          (a, b) => a.timestampMs - b.timestampMs
        ),
      },
    }));
  };

  const removeSplicePoint = (segmentId: string, index: number) => {
    setAudioState((prev) => ({
      ...prev,
      [segmentId]: {
        ...prev[segmentId],
        splicePoints: prev[segmentId].splicePoints.filter((_, i) => i !== index),
      },
    }));
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  // Generate export data
  const generateExportData = () => {
    const exportData: Record<string, { baseAudioUrl: string; splicePoints: AudioSplicePoint[] }> = {};

    for (const [segmentId, state] of Object.entries(audioState)) {
      if (state.audioUrl) {
        exportData[segmentId] = {
          baseAudioUrl: state.audioUrl,
          splicePoints: state.splicePoints,
        };
      }
    }

    return exportData;
  };

  const copyExportData = () => {
    const data = generateExportData();
    const json = JSON.stringify(data, null, 2);
    navigator.clipboard.writeText(json);
    alert('Copied to clipboard! Paste this into your starterStories.ts or a separate audio data file.');
  };

  const downloadExportData = () => {
    const data = generateExportData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'starter-story-audio.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={copyExportData}
              disabled={segmentsWithAudio === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Copy className="w-4 h-4" />
              Copy JSON
            </button>
            <button
              onClick={downloadExportData}
              disabled={segmentsWithAudio === 0}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              onClick={generateAllAudio}
              disabled={generatingAll}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingAll ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
              Generate All
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Starter Story Audio</h1>
          <p className="text-slate-400">
            Generate TTS audio for starter stories and mark splice points for name insertion.
          </p>
          <div className="mt-4 flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-slate-300">
                {segmentsWithAudio} / {totalSegments} segments have audio
              </span>
            </div>
            {generatingAll && (
              <span className="text-sm text-amber-400 animate-pulse">
                Generating audio...
              </span>
            )}
          </div>
        </div>

        {/* Stories */}
        <div className="space-y-4">
          {stories.map((story) => (
            <div
              key={story.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
            >
              {/* Story Header */}
              <button
                onClick={() => toggleStory(story.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="text-2xl">📖</span>
                  <div className="text-left">
                    <h3 className="font-semibold">{story.title}</h3>
                    <p className="text-sm text-slate-400">{story.worldId} • {story.chapters.length} chapters</p>
                  </div>
                </div>
                {expandedStories.has(story.id) ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              {/* Story Content */}
              <AnimatePresence>
                {expandedStories.has(story.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 space-y-3">
                      {story.chapters.map((chapter) => (
                        <div
                          key={chapter.id}
                          className="bg-slate-700/30 rounded-lg overflow-hidden"
                        >
                          {/* Chapter Header */}
                          <button
                            onClick={() => toggleChapter(chapter.id)}
                            className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 bg-cyan-500/20 text-cyan-400 rounded text-sm flex items-center justify-center">
                                {chapter.chapterNumber}
                              </span>
                              <span className="text-sm font-medium">{chapter.title}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                {chapter.segments.filter((s) => audioState[s.id]?.audioUrl).length} / {chapter.segments.length}
                              </span>
                              {expandedChapters.has(chapter.id) ? (
                                <ChevronDown className="w-4 h-4 text-slate-400" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400" />
                              )}
                            </div>
                          </button>

                          {/* Segments */}
                          <AnimatePresence>
                            {expandedChapters.has(chapter.id) && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 space-y-3">
                                  {chapter.segments.map((segment, idx) => {
                                    const state = audioState[segment.id] || { audioUrl: null, splicePoints: [], loading: false };
                                    const isPlaying = playingSegmentId === segment.id;
                                    const hasPlaceholders = segment.text.includes('[CHILD]') || segment.text.includes('[PET]');
                                    const isEditingSplice = editingSplicePoints === segment.id;

                                    return (
                                      <div
                                        key={segment.id}
                                        className="bg-slate-800/50 rounded-lg p-3"
                                      >
                                        {/* Segment Header */}
                                        <div className="flex items-start justify-between mb-2">
                                          <span className="text-xs text-cyan-400 font-medium">
                                            Segment {idx + 1}
                                          </span>
                                          {state.audioUrl && (
                                            <span className="flex items-center gap-1 text-xs text-green-400">
                                              <CheckCircle className="w-3 h-3" />
                                              Ready
                                            </span>
                                          )}
                                        </div>

                                        {/* Segment Text */}
                                        <p className="text-sm text-slate-300 mb-3">{segment.text}</p>

                                        {/* Audio Controls */}
                                        <div className="flex items-center gap-2 flex-wrap">
                                          <button
                                            onClick={() => generateAudio(segment, story.id, chapter.chapterNumber)}
                                            disabled={state.loading || generatingAll}
                                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors disabled:opacity-50"
                                          >
                                            {state.loading ? (
                                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                            ) : (
                                              <Mic className="w-3.5 h-3.5" />
                                            )}
                                            {state.audioUrl ? 'Regenerate' : 'Generate'}
                                          </button>

                                          {state.audioUrl && (
                                            <>
                                              <button
                                                onClick={() => togglePlay(segment.id, state.audioUrl!)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
                                              >
                                                {isPlaying ? (
                                                  <Pause className="w-3.5 h-3.5" />
                                                ) : (
                                                  <Play className="w-3.5 h-3.5" />
                                                )}
                                                {isPlaying ? 'Pause' : 'Play'}
                                              </button>

                                              {isPlaying && (
                                                <span className="text-xs text-slate-400">
                                                  {formatTime(currentTime)} / {formatTime(duration)}
                                                </span>
                                              )}

                                              {hasPlaceholders && (
                                                <button
                                                  onClick={() => setEditingSplicePoints(isEditingSplice ? null : segment.id)}
                                                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                                                    isEditingSplice
                                                      ? 'bg-amber-500/30 text-amber-300'
                                                      : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                                                  }`}
                                                >
                                                  <Volume2 className="w-3.5 h-3.5" />
                                                  Splice ({state.splicePoints.length})
                                                </button>
                                              )}
                                            </>
                                          )}
                                        </div>

                                        {/* Splice Point Editor */}
                                        {isEditingSplice && state.audioUrl && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className="mt-3 p-3 bg-slate-700/50 rounded-lg"
                                          >
                                            <div className="text-xs text-slate-400 mb-2">
                                              Play audio and mark where names should be inserted.
                                            </div>

                                            {/* Progress bar */}
                                            <div className="relative h-4 bg-slate-600 rounded mb-3">
                                              <div
                                                className="absolute top-0 left-0 h-full bg-cyan-500/30 rounded"
                                                style={{ width: `${(currentTime / duration) * 100}%` }}
                                              />
                                              {state.splicePoints.map((point, i) => (
                                                <div
                                                  key={i}
                                                  className={`absolute top-0 w-1 h-full ${
                                                    point.placeholder === 'CHILD' ? 'bg-pink-400' : 'bg-orange-400'
                                                  }`}
                                                  style={{ left: `${(point.timestampMs / duration) * 100}%` }}
                                                />
                                              ))}
                                            </div>

                                            {/* Add buttons */}
                                            <div className="flex items-center gap-2 mb-2">
                                              <span className="text-xs text-slate-400">Add at {formatTime(currentTime)}:</span>
                                              {segment.text.includes('[CHILD]') && (
                                                <button
                                                  onClick={() => addSplicePoint(segment.id, 'CHILD')}
                                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  [CHILD]
                                                </button>
                                              )}
                                              {segment.text.includes('[PET]') && (
                                                <button
                                                  onClick={() => addSplicePoint(segment.id, 'PET')}
                                                  className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded"
                                                >
                                                  <Plus className="w-3 h-3" />
                                                  [PET]
                                                </button>
                                              )}
                                            </div>

                                            {/* Splice points list */}
                                            {state.splicePoints.length > 0 && (
                                              <div className="space-y-1">
                                                {state.splicePoints.map((point, i) => (
                                                  <div
                                                    key={i}
                                                    className="flex items-center justify-between px-2 py-1 bg-slate-600/50 rounded text-xs"
                                                  >
                                                    <span className="flex items-center gap-2">
                                                      <span
                                                        className={`px-1.5 py-0.5 rounded ${
                                                          point.placeholder === 'CHILD'
                                                            ? 'bg-pink-500/20 text-pink-300'
                                                            : 'bg-orange-500/20 text-orange-300'
                                                        }`}
                                                      >
                                                        {point.placeholder}
                                                      </span>
                                                      <span className="text-slate-400">at {formatTime(point.timestampMs)}</span>
                                                    </span>
                                                    <button
                                                      onClick={() => removeSplicePoint(segment.id, i)}
                                                      className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400"
                                                    >
                                                      <X className="w-3 h-3" />
                                                    </button>
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                          </motion.div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
