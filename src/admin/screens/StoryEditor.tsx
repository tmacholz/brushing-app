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
  Play,
  Pause,
  Mic,
  Music,
  Wand2,
  Image,
  RefreshCw,
} from 'lucide-react';

// Narration sequence item - matches the type in src/types/index.ts
type NarrationSequenceItem =
  | { type: 'audio'; url: string }
  | { type: 'name'; placeholder: 'CHILD' | 'PET' };

interface Segment {
  id: string;
  segment_order: number;
  text: string;
  duration_seconds: number;
  brushing_zone: string | null;
  brushing_prompt: string | null;
  image_prompt: string | null;
  image_url: string | null;
  narration_sequence: NarrationSequenceItem[] | null;
}

interface Chapter {
  id: string;
  chapter_number: number;
  title: string;
  recap: string | null;
  cliffhanger: string | null;
  next_chapter_teaser: string | null;
  segments: Segment[];
  // Pre-recorded audio narration sequences
  recap_narration_sequence: NarrationSequenceItem[] | null;
  cliffhanger_narration_sequence: NarrationSequenceItem[] | null;
  teaser_narration_sequence: NarrationSequenceItem[] | null;
}

// Story Bible for visual consistency
interface StoryBible {
  colorPalette?: string;
  lightingStyle?: string;
  artDirection?: string;
  keyLocations?: { name: string; visualDescription: string; mood: string }[];
  recurringCharacters?: { name: string; visualDescription: string; personality: string; role: string }[];
}

interface Story {
  id: string;
  world_id: string;
  title: string;
  description: string;
  status: string;
  is_published: boolean;
  total_chapters: number;
  background_music_url: string | null;
  story_bible: StoryBible | null;
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
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasNarration = segment.narration_sequence && segment.narration_sequence.length > 0;
  const audioClipsCount = segment.narration_sequence?.filter(item => item.type === 'audio').length ?? 0;

  const handleGenerateAudio = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'segmentAudio',
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
      console.log('Audio generated:', { segmentId: segment.id, clipCount: data.clipCount, sequence: data.narrationSequence });

      // Save to database
      const saveRes = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narrationSequence: data.narrationSequence }),
      });

      if (!saveRes.ok) {
        const saveError = await saveRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save narration sequence to database:', saveError);
        throw new Error(`Failed to save: ${saveError.details || saveError.error}`);
      }

      const saveData = await saveRes.json();
      console.log('Database save response:', saveData);

      onUpdate(segment.id, { narration_sequence: data.narrationSequence });
    } catch (error) {
      console.error('Failed to generate audio:', error);
      alert('Failed to generate audio. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  // Simple preview - just plays the first audio clip
  const handlePreview = () => {
    if (!segment.narration_sequence) return;

    const firstAudioClip = segment.narration_sequence.find(item => item.type === 'audio');
    if (firstAudioClip && firstAudioClip.type === 'audio') {
      if (audioRef.current) {
        if (playing) {
          audioRef.current.pause();
          setPlaying(false);
        } else {
          audioRef.current.src = firstAudioClip.url;
          audioRef.current.play();
          setPlaying(true);
        }
      }
    }
  };

  const handleEnded = () => {
    setPlaying(false);
  };

  // Count placeholders in the narration sequence
  const placeholderCount = segment.narration_sequence?.filter(item => item.type === 'name').length ?? 0;

  return (
    <div className="mt-3 pt-3 border-t border-slate-600/50">
      <audio ref={audioRef} onEnded={handleEnded} />

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
          {hasNarration ? 'Regenerate Audio' : 'Generate Audio'}
        </button>

        {/* Preview Button */}
        {hasNarration && (
          <button
            onClick={handlePreview}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
          >
            {playing ? (
              <Pause className="w-3.5 h-3.5" />
            ) : (
              <Play className="w-3.5 h-3.5" />
            )}
            Preview
          </button>
        )}

        {/* Audio status indicator */}
        {hasNarration && (
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            {audioClipsCount} clip{audioClipsCount !== 1 ? 's' : ''}
            {placeholderCount > 0 && ` + ${placeholderCount} name insert${placeholderCount !== 1 ? 's' : ''}`}
          </span>
        )}
      </div>
    </div>
  );
}

// Component for managing image on a single segment
interface SegmentImageEditorProps {
  segment: Segment;
  storyId: string;
  previousImageUrl?: string | null;
  storyBible?: StoryBible | null;
  onUpdate: (segmentId: string, updates: Partial<Segment>) => void;
}

function SegmentImageEditor({ segment, storyId, previousImageUrl, storyBible, onUpdate }: SegmentImageEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const hasImage = !!segment.image_url;
  const hasPrompt = !!segment.image_prompt;

  const handleGenerateImage = async () => {
    if (!segment.image_prompt) {
      alert('No image prompt for this segment');
      return;
    }

    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          prompt: segment.image_prompt,
          segmentId: segment.id,
          referenceImageUrl: previousImageUrl || undefined,
          // Don't include characters - using overlay system instead
          includeUser: false,
          includePet: false,
          storyBible: storyBible || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();
      console.log('Image generated:', { segmentId: segment.id, imageUrl: data.imageUrl });

      // Save to database
      const saveRes = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: data.imageUrl }),
      });

      if (!saveRes.ok) {
        const saveError = await saveRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error('Failed to save image URL to database:', saveError);
        throw new Error(`Failed to save: ${saveError.details || saveError.error}`);
      }

      onUpdate(segment.id, { image_url: data.imageUrl });
    } catch (error) {
      console.error('Failed to generate image:', error);
      alert('Failed to generate image. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  if (!hasPrompt) {
    return null;
  }

  return (
    <div className="mt-2 flex items-center gap-2 flex-wrap">
      {/* Generate/Regenerate Image Button */}
      <button
        onClick={handleGenerateImage}
        disabled={generating}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : hasImage ? (
          <RefreshCw className="w-3.5 h-3.5" />
        ) : (
          <Image className="w-3.5 h-3.5" />
        )}
        {hasImage ? 'Regenerate Image' : 'Generate Image'}
      </button>

      {/* Preview Button */}
      {hasImage && (
        <button
          onClick={() => setShowPreview(!showPreview)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          {showPreview ? 'Hide' : 'Preview'}
        </button>
      )}

      {/* Image status indicator */}
      {hasImage && (
        <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          Image ready
        </span>
      )}

      {/* Image Preview */}
      {showPreview && segment.image_url && (
        <div className="w-full mt-2">
          <img
            src={segment.image_url}
            alt="Scene preview"
            className="w-full max-w-md rounded-lg border border-slate-600"
          />
        </div>
      )}
    </div>
  );
}

// Component for managing audio on a single chapter field (recap, cliffhanger, or teaser)
interface ChapterFieldAudioEditorProps {
  chapterId: string;
  storyId: string;
  chapterNumber: number;
  fieldName: 'recap' | 'cliffhanger' | 'teaser';
  fieldLabel: string;
  text: string | null;
  narrationSequence: NarrationSequenceItem[] | null;
  onUpdate: (chapterId: string, field: string, sequence: NarrationSequenceItem[]) => void;
}

function ChapterFieldAudioEditor({
  chapterId,
  storyId,
  chapterNumber,
  fieldName,
  fieldLabel,
  text,
  narrationSequence,
  onUpdate,
}: ChapterFieldAudioEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const hasNarration = narrationSequence && narrationSequence.length > 0;
  const audioClipsCount = narrationSequence?.filter(item => item.type === 'audio').length ?? 0;

  if (!text) return null;

  const handleGenerateAudio = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'chapterAudio',
          chapterId,
          text,
          storyId,
          chapterNumber,
          fieldName,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();
      console.log(`${fieldLabel} audio generated:`, { chapterId, clipCount: data.clipCount, sequence: data.narrationSequence });

      // Save to database using the appropriate field name
      const saveBody: Record<string, unknown> = {};
      if (fieldName === 'recap') {
        saveBody.recapNarrationSequence = data.narrationSequence;
      } else if (fieldName === 'cliffhanger') {
        saveBody.cliffhangerNarrationSequence = data.narrationSequence;
      } else {
        saveBody.teaserNarrationSequence = data.narrationSequence;
      }

      const saveRes = await fetch(`/api/admin/stories/${storyId}?chapter=${chapterId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(saveBody),
      });

      if (!saveRes.ok) {
        const saveError = await saveRes.json().catch(() => ({ error: 'Unknown error' }));
        console.error(`Failed to save ${fieldName} narration sequence:`, saveError);
        throw new Error(`Failed to save: ${saveError.details || saveError.error}`);
      }

      onUpdate(chapterId, `${fieldName}_narration_sequence`, data.narrationSequence);
    } catch (error) {
      console.error(`Failed to generate ${fieldName} audio:`, error);
      alert(`Failed to generate ${fieldName} audio. Check console for details.`);
    } finally {
      setGenerating(false);
    }
  };

  const handlePreview = () => {
    if (!narrationSequence) return;

    const firstAudioClip = narrationSequence.find(item => item.type === 'audio');
    if (firstAudioClip && firstAudioClip.type === 'audio') {
      if (audioRef.current) {
        if (playing) {
          audioRef.current.pause();
          setPlaying(false);
        } else {
          audioRef.current.src = firstAudioClip.url;
          audioRef.current.play();
          setPlaying(true);
        }
      }
    }
  };

  const handleEnded = () => {
    setPlaying(false);
  };

  const placeholderCount = narrationSequence?.filter(item => item.type === 'name').length ?? 0;

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      <audio ref={audioRef} onEnded={handleEnded} />

      <button
        onClick={handleGenerateAudio}
        disabled={generating}
        className="flex items-center gap-1.5 px-2.5 py-1 text-xs bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors disabled:opacity-50"
      >
        {generating ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Mic className="w-3 h-3" />
        )}
        {hasNarration ? 'Regen' : 'Generate'} Audio
      </button>

      {hasNarration && (
        <button
          onClick={handlePreview}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
        >
          {playing ? (
            <Pause className="w-3 h-3" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Preview
        </button>
      )}

      {hasNarration && (
        <span className="text-xs text-green-400 flex items-center gap-1">
          <CheckCircle className="w-3 h-3" />
          {audioClipsCount} clip{audioClipsCount !== 1 ? 's' : ''}
          {placeholderCount > 0 && ` + ${placeholderCount} name`}
        </span>
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

  // Music generation state
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const musicAudioRef = useRef<HTMLAudioElement>(null);

  // Chapter image generation state
  const [generatingImagesForChapter, setGeneratingImagesForChapter] = useState<string | null>(null);
  const [imageGenProgress, setImageGenProgress] = useState<{ current: number; total: number } | null>(null);

  const fetchStory = useCallback(async () => {
    try {
      console.log('[StoryEditor] Fetching story:', storyId);
      const res = await fetch(`/api/admin/stories/${storyId}`);
      console.log('[StoryEditor] Response status:', res.status);

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        console.error('[StoryEditor] API error:', errorData);
        throw new Error(errorData.error || `Failed to fetch story (${res.status})`);
      }

      const data = await res.json();
      console.log('[StoryEditor] Received story:', data.story?.id, data.story?.title);

      if (!data.story) {
        throw new Error('No story in response');
      }

      setStory(data.story);
      setTitle(data.story.title);
      setDescription(data.story.description);
    } catch (err) {
      console.error('[StoryEditor] Error:', err);
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

  const handleGenerateMusic = async () => {
    if (!story) return;
    setGeneratingMusic(true);
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'backgroundMusic',
          storyId: story.id,
          storyTitle: story.title,
          storyDescription: story.description,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate music');
      }

      const data = await res.json();

      // Save music URL to database
      const saveRes = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundMusicUrl: data.musicUrl }),
      });

      if (!saveRes.ok) throw new Error('Failed to save music URL');

      setStory({ ...story, background_music_url: data.musicUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate music');
    } finally {
      setGeneratingMusic(false);
    }
  };

  const toggleMusicPreview = () => {
    if (!musicAudioRef.current || !story?.background_music_url) return;

    if (musicPlaying) {
      musicAudioRef.current.pause();
      setMusicPlaying(false);
    } else {
      musicAudioRef.current.src = story.background_music_url;
      musicAudioRef.current.play();
      setMusicPlaying(true);
    }
  };

  const handleMusicEnded = () => {
    setMusicPlaying(false);
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

  // Update a segment in local state after audio/image changes
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

  // Update a chapter in local state after audio changes
  const handleChapterUpdate = useCallback((chapterId: string, field: string, sequence: NarrationSequenceItem[]) => {
    setStory((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, [field]: sequence } : chapter
        ),
      };
    });
  }, []);

  // Generate all images for a chapter
  const handleGenerateChapterImages = useCallback(async (chapter: Chapter) => {
    const segmentsWithPrompts = chapter.segments.filter(s => s.image_prompt);
    if (segmentsWithPrompts.length === 0) {
      alert('No segments with image prompts in this chapter');
      return;
    }

    setGeneratingImagesForChapter(chapter.id);
    setImageGenProgress({ current: 0, total: segmentsWithPrompts.length });

    let previousImageUrl: string | null = null;

    for (let i = 0; i < segmentsWithPrompts.length; i++) {
      const segment = segmentsWithPrompts[i];
      setImageGenProgress({ current: i + 1, total: segmentsWithPrompts.length });

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'image',
            prompt: segment.image_prompt,
            segmentId: segment.id,
            referenceImageUrl: previousImageUrl || undefined,
            includeUser: false,
            includePet: false,
            storyBible: story?.story_bible || undefined,
          }),
        });

        if (!res.ok) {
          const error = await res.text();
          console.error(`Failed to generate image for segment ${segment.id}:`, error);
          continue;
        }

        const data = await res.json();

        // Save to database
        await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: data.imageUrl }),
        });

        handleSegmentUpdate(segment.id, { image_url: data.imageUrl });
        previousImageUrl = data.imageUrl;
      } catch (error) {
        console.error(`Error generating image for segment ${segment.id}:`, error);
      }
    }

    setGeneratingImagesForChapter(null);
    setImageGenProgress(null);
  }, [storyId, handleSegmentUpdate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center gap-4">
        <p className="text-slate-400">{error || 'Story not found'}</p>
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 text-cyan-400 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Go Back
        </button>
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

        {/* Background Music Section */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Music className="w-5 h-5 text-purple-400" />
            Background Music
          </h2>

          <audio ref={musicAudioRef} onEnded={handleMusicEnded} />

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={handleGenerateMusic}
              disabled={generatingMusic}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50"
            >
              {generatingMusic ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4" />
              )}
              {story.background_music_url ? 'Regenerate Music' : 'Generate Music'}
            </button>

            {story.background_music_url && (
              <button
                onClick={toggleMusicPreview}
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
              >
                {musicPlaying ? (
                  <Pause className="w-4 h-4" />
                ) : (
                  <Play className="w-4 h-4" />
                )}
                Preview
              </button>
            )}

            {story.background_music_url && (
              <span className="ml-auto text-sm text-green-400 flex items-center gap-1.5">
                <CheckCircle className="w-4 h-4" />
                Music ready
              </span>
            )}
          </div>

          {generatingMusic && (
            <p className="mt-3 text-sm text-slate-400">
              Generating background music... This may take up to a minute.
            </p>
          )}
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
                          <ChapterFieldAudioEditor
                            chapterId={chapter.id}
                            storyId={storyId}
                            chapterNumber={chapter.chapter_number}
                            fieldName="recap"
                            fieldLabel="Recap"
                            text={chapter.recap}
                            narrationSequence={chapter.recap_narration_sequence}
                            onUpdate={handleChapterUpdate}
                          />
                        </div>
                      )}

                      {/* Chapter Actions - Generate All Images */}
                      <div className="mb-4 flex items-center gap-3 flex-wrap">
                        <button
                          onClick={() => handleGenerateChapterImages(chapter)}
                          disabled={generatingImagesForChapter === chapter.id}
                          className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {generatingImagesForChapter === chapter.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Image className="w-4 h-4" />
                          )}
                          {chapter.segments.every(s => s.image_url) ? 'Regenerate All Images' : 'Generate All Images'}
                        </button>

                        {generatingImagesForChapter === chapter.id && imageGenProgress && (
                          <span className="text-sm text-slate-400">
                            Generating image {imageGenProgress.current} of {imageGenProgress.total}...
                          </span>
                        )}

                        {/* Image status summary */}
                        {!generatingImagesForChapter && (
                          <span className="ml-auto text-xs text-slate-500">
                            {chapter.segments.filter(s => s.image_url).length}/{chapter.segments.length} images ready
                          </span>
                        )}
                      </div>

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

                            {/* Image Editor */}
                            <SegmentImageEditor
                              segment={segment}
                              storyId={storyId}
                              previousImageUrl={idx > 0 ? chapter.segments[idx - 1].image_url : null}
                              storyBible={story?.story_bible}
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
                          <ChapterFieldAudioEditor
                            chapterId={chapter.id}
                            storyId={storyId}
                            chapterNumber={chapter.chapter_number}
                            fieldName="cliffhanger"
                            fieldLabel="Cliffhanger"
                            text={chapter.cliffhanger}
                            narrationSequence={chapter.cliffhanger_narration_sequence}
                            onUpdate={handleChapterUpdate}
                          />
                        </div>
                      )}

                      {/* Next Chapter Teaser */}
                      {chapter.next_chapter_teaser && (
                        <div className="mt-2">
                          <label className="text-xs text-slate-500 uppercase tracking-wide">Next Chapter Teaser</label>
                          <p className="text-sm text-slate-400 mt-1">{chapter.next_chapter_teaser}</p>
                          <ChapterFieldAudioEditor
                            chapterId={chapter.id}
                            storyId={storyId}
                            chapterNumber={chapter.chapter_number}
                            fieldName="teaser"
                            fieldLabel="Teaser"
                            text={chapter.next_chapter_teaser}
                            narrationSequence={chapter.teaser_narration_sequence}
                            onUpdate={handleChapterUpdate}
                          />
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
