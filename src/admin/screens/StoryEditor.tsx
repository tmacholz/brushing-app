import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Save,
  Trash2,
  CheckCircle,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Loader2,
  Clock,
  Sparkles,
  Volume2,
  Play,
  Pause,
  Plus,
  X,
  Mic,
} from 'lucide-react';

interface SplicePoint {
  placeholder: 'CHILD' | 'PET';
  timestampMs: number;
}

interface Segment {
  id: string;
  segment_order: number;
  text: string;
  duration_seconds: number;
  brushing_zone: string | null;
  brushing_prompt: string | null;
  image_prompt: string | null;
  image_url: string | null;
  base_audio_url: string | null;
  splice_points: SplicePoint[];
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  recap: string | null;
  cliffhanger: string | null;
  next_chapter_teaser: string | null;
  segments: Segment[];
}

interface Story {
  id: string;
  world_id: string;
  title: string;
  description: string;
  status: string;
  is_published: boolean;
  total_chapters: number;
  chapters: Chapter[];
}

interface StoryEditorProps {
  storyId: string;
  onBack: () => void;
}

// Component for managing audio on a single segment
interface SegmentAudioEditorProps {
  segment: Segment;
  storyId: string;
  chapterNumber: number;
  onUpdate: (segmentId: string, updates: Partial<Segment>) => void;
}

function SegmentAudioEditor({ segment, storyId, chapterNumber, onUpdate }: SegmentAudioEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showSpliceEditor, setShowSpliceEditor] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasPlaceholders = segment.text.includes('[CHILD]') || segment.text.includes('[PET]');

  const handleGenerateAudio = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/admin/generate-segment-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segmentId: segment.id,
          text: segment.text,
          storyId,
          chapterNumber,
          segmentOrder: segment.segment_order,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();

      // Save to database
      await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ baseAudioUrl: data.audioUrl }),
      });

      onUpdate(segment.id, { base_audio_url: data.audioUrl });
    } catch (error) {
      console.error('Failed to generate audio:', error);
      alert('Failed to generate audio. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current) return;

    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
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
    setPlaying(false);
    setCurrentTime(0);
  };

  const addSplicePoint = (placeholder: 'CHILD' | 'PET') => {
    const newPoint: SplicePoint = {
      placeholder,
      timestampMs: Math.round(currentTime),
    };
    const updatedPoints = [...(segment.splice_points || []), newPoint].sort(
      (a, b) => a.timestampMs - b.timestampMs
    );
    saveSplicePoints(updatedPoints);
  };

  const removeSplicePoint = (index: number) => {
    const updatedPoints = segment.splice_points.filter((_, i) => i !== index);
    saveSplicePoints(updatedPoints);
  };

  const saveSplicePoints = async (splicePoints: SplicePoint[]) => {
    try {
      await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ splicePoints }),
      });
      onUpdate(segment.id, { splice_points: splicePoints });
    } catch (error) {
      console.error('Failed to save splice points:', error);
    }
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${seconds}.${milliseconds.toString().padStart(2, '0')}s`;
  };

  return (
    <div className="mt-3 pt-3 border-t border-slate-600/50">
      {/* Hidden audio element */}
      {segment.base_audio_url && (
        <audio
          ref={audioRef}
          src={segment.base_audio_url}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={handleEnded}
        />
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {/* Generate/Regenerate Audio Button */}
        <button
          onClick={handleGenerateAudio}
          disabled={generating}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors disabled:opacity-50"
        >
          {generating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Mic className="w-3.5 h-3.5" />
          )}
          {segment.base_audio_url ? 'Regenerate Audio' : 'Generate Audio'}
        </button>

        {/* Audio Controls */}
        {segment.base_audio_url && (
          <>
            <button
              onClick={togglePlayback}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
            >
              {playing ? (
                <Pause className="w-3.5 h-3.5" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {playing ? 'Pause' : 'Play'}
            </button>

            <span className="text-xs text-slate-400">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>

            {hasPlaceholders && (
              <button
                onClick={() => setShowSpliceEditor(!showSpliceEditor)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                  showSpliceEditor
                    ? 'bg-amber-500/30 text-amber-300'
                    : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300'
                }`}
              >
                <Volume2 className="w-3.5 h-3.5" />
                Splice Points ({segment.splice_points?.length || 0})
              </button>
            )}
          </>
        )}

        {/* Audio status indicator */}
        {segment.base_audio_url && (
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Audio ready
          </span>
        )}
      </div>

      {/* Splice Point Editor */}
      {showSpliceEditor && segment.base_audio_url && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="mt-3 p-3 bg-slate-800/50 rounded-lg"
        >
          <div className="text-xs text-slate-400 mb-2">
            Play audio and click to mark where [CHILD] or [PET] names should be inserted.
          </div>

          {/* Progress bar with splice markers */}
          <div className="relative h-6 bg-slate-700 rounded mb-3">
            {/* Progress */}
            <div
              className="absolute top-0 left-0 h-full bg-cyan-500/30 rounded"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            {/* Splice point markers */}
            {segment.splice_points?.map((point, idx) => (
              <div
                key={idx}
                className={`absolute top-0 w-1 h-full ${
                  point.placeholder === 'CHILD' ? 'bg-pink-400' : 'bg-orange-400'
                }`}
                style={{ left: `${(point.timestampMs / duration) * 100}%` }}
                title={`${point.placeholder} at ${formatTime(point.timestampMs)}`}
              />
            ))}
          </div>

          {/* Add splice point buttons */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs text-slate-400">Add at current time:</span>
            {segment.text.includes('[CHILD]') && (
              <button
                onClick={() => addSplicePoint('CHILD')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-pink-500/20 hover:bg-pink-500/30 text-pink-300 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                [CHILD]
              </button>
            )}
            {segment.text.includes('[PET]') && (
              <button
                onClick={() => addSplicePoint('PET')}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-orange-500/20 hover:bg-orange-500/30 text-orange-300 rounded transition-colors"
              >
                <Plus className="w-3 h-3" />
                [PET]
              </button>
            )}
          </div>

          {/* List of splice points */}
          {segment.splice_points && segment.splice_points.length > 0 && (
            <div className="space-y-1">
              {segment.splice_points.map((point, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between px-2 py-1 bg-slate-700/50 rounded text-xs"
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
                    onClick={() => removeSplicePoint(idx)}
                    className="p-1 hover:bg-red-500/20 rounded text-slate-400 hover:text-red-400 transition-colors"
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
}

export function StoryEditor({ storyId, onBack }: StoryEditorProps) {
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const fetchStory = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/stories/${storyId}`);
      if (!res.ok) throw new Error('Failed to fetch story');
      const data = await res.json();
      setStory(data.story);
      setTitle(data.story.title);
      setDescription(data.story.description);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load story');
    } finally {
      setLoading(false);
    }
  }, [storyId]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description }),
      });

      if (!res.ok) throw new Error('Failed to save story');
      const data = await res.json();
      setStory({ ...story!, ...data.story });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async (publish: boolean) => {
    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ publish }),
      });

      if (!res.ok) throw new Error('Failed to update publish status');
      const data = await res.json();
      setStory({ ...story!, ...data.story });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this story? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete story');
      onBack();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete story');
    }
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

  const getBrushingZoneLabel = (zone: string | null): string => {
    switch (zone) {
      case 'top-left': return 'Top Left';
      case 'top-right': return 'Top Right';
      case 'bottom-left': return 'Bottom Left';
      case 'bottom-right': return 'Bottom Right';
      case 'tongue': return 'Tongue';
      default: return 'None';
    }
  };

  // Update a segment in local state after audio changes
  const handleSegmentUpdate = useCallback((segmentId: string, updates: Partial<Segment>) => {
    setStory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) => ({
          ...chapter,
          segments: chapter.segments.map((segment) =>
            segment.id === segmentId ? { ...segment, ...updates } : segment
          ),
        })),
      };
    });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">Story not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={onBack}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDelete}
              className="flex items-center gap-2 px-4 py-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </button>
            {story.is_published ? (
              <button
                onClick={() => handlePublish(false)}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                <EyeOff className="w-4 h-4" />
                Unpublish
              </button>
            ) : (
              <button
                onClick={() => handlePublish(true)}
                className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
              >
                <Eye className="w-4 h-4" />
                Publish
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-300">
            {error}
          </div>
        )}

        {/* Status Badge */}
        <div className="flex items-center gap-3 mb-6">
          {story.status === 'generating' ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-yellow-500/20 text-yellow-400 rounded-full">
              <Clock className="w-4 h-4" />
              Generating...
            </span>
          ) : story.is_published ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full">
              <CheckCircle className="w-4 h-4" />
              Published
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-600/50 text-slate-400 rounded-full">
              <Sparkles className="w-4 h-4" />
              Draft
            </span>
          )}
          <span className="text-slate-500 text-sm">
            {story.total_chapters} chapters
          </span>
        </div>

        {/* Story Details */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Story Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none"
                rows={3}
              />
            </div>
          </div>
        </section>

        {/* Chapters */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold">Chapters</h2>

          {story.chapters.map((chapter) => (
            <div
              key={chapter.id}
              className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden"
            >
              <button
                onClick={() => toggleChapter(chapter.id)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-700/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center font-semibold">
                    {chapter.chapter_number}
                  </span>
                  <span className="font-medium">{chapter.title}</span>
                </div>
                {expandedChapters.has(chapter.id) ? (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronRight className="w-5 h-5 text-slate-400" />
                )}
              </button>

              <AnimatePresence>
                {expandedChapters.has(chapter.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2 border-t border-slate-700/50">
                      {/* Recap */}
                      {chapter.recap && (
                        <div className="mb-4">
                          <label className="text-xs text-slate-500 uppercase tracking-wide">Recap</label>
                          <p className="text-sm text-slate-300 mt-1 italic">"{chapter.recap}"</p>
                        </div>
                      )}

                      {/* Segments */}
                      <div className="space-y-4">
                        {chapter.segments.map((segment, idx) => (
                          <div
                            key={segment.id}
                            className="bg-slate-700/30 rounded-lg p-4"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <span className="text-xs text-cyan-400 font-medium">
                                Segment {idx + 1}
                              </span>
                              <div className="flex items-center gap-2 text-xs text-slate-500">
                                <span>{segment.duration_seconds}s</span>
                                {segment.brushing_zone && (
                                  <span className="px-2 py-0.5 bg-slate-600/50 rounded">
                                    {getBrushingZoneLabel(segment.brushing_zone)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <p className="text-sm text-slate-200 mb-2">{segment.text}</p>

                            {segment.brushing_prompt && (
                              <p className="text-xs text-amber-400/80 mb-2">
                                🪥 {segment.brushing_prompt}
                              </p>
                            )}

                            {segment.image_prompt && (
                              <details className="mt-2">
                                <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400">
                                  Image prompt
                                </summary>
                                <p className="text-xs text-slate-400 mt-1 pl-3 border-l border-slate-600">
                                  {segment.image_prompt}
                                </p>
                              </details>
                            )}

                            {/* Audio Editor */}
                            <SegmentAudioEditor
                              segment={segment}
                              storyId={storyId}
                              chapterNumber={chapter.chapter_number}
                              onUpdate={handleSegmentUpdate}
                            />
                          </div>
                        ))}
                      </div>

                      {/* Cliffhanger */}
                      {chapter.cliffhanger && (
                        <div className="mt-4 pt-4 border-t border-slate-600/50">
                          <label className="text-xs text-slate-500 uppercase tracking-wide">Cliffhanger</label>
                          <p className="text-sm text-purple-300 mt-1 italic">"{chapter.cliffhanger}"</p>
                        </div>
                      )}

                      {/* Next Chapter Teaser */}
                      {chapter.next_chapter_teaser && (
                        <div className="mt-2">
                          <label className="text-xs text-slate-500 uppercase tracking-wide">Next Chapter Teaser</label>
                          <p className="text-sm text-slate-400 mt-1">{chapter.next_chapter_teaser}</p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
