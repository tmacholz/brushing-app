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
  Pencil,
  Check,
  X,
  Users,
  MapPin,
  Package,
  Plus,
  Maximize2,
  Tag,
  BookOpen,
  Clapperboard,
  Camera,
  Video,
  Ban,
} from 'lucide-react';

// Narration sequence item - matches the type in src/types/index.ts
type NarrationSequenceItem =
  | { type: 'audio'; url: string }
  | { type: 'name'; placeholder: 'CHILD' | 'PET' };

interface ImageHistoryItem {
  url: string;
  created_at: string;
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
  image_history: ImageHistoryItem[] | null;
  narration_sequence: NarrationSequenceItem[] | null;
  reference_ids: string[] | null;
  // Storyboard fields
  storyboard_location: string | null;
  storyboard_characters: string[] | null;
  storyboard_shot_type: string | null;
  storyboard_camera_angle: string | null;
  storyboard_focus: string | null;
  storyboard_continuity: string | null;
  storyboard_exclude: string[] | null;
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

// Story Bible for narrative and visual consistency
interface StoryBible {
  // Narrative elements
  tone?: string;
  themes?: string[];
  narrativeStyle?: string;
  // Character behavior
  childRole?: string;
  petRole?: string;
  characterDynamic?: string;
  // World and visual consistency
  keyLocations?: { name: string; visualDescription: string; mood: string }[];
  recurringCharacters?: { name: string; visualDescription: string; personality: string; role: string }[];
  // Visual style guide
  colorPalette?: string;
  lightingStyle?: string;
  artDirection?: string;
  // Story-specific elements
  magicSystem?: string | null;
  stakes?: string;
  resolution?: string;
}

// Visual reference for consistent imagery
interface StoryReference {
  id: string;
  story_id: string;
  type: 'character' | 'object' | 'location';
  name: string;
  description: string;
  image_url: string | null;
  sort_order: number;
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
  cover_image_url: string | null;
  story_bible: StoryBible | null;
  chapters: Chapter[];
  references: StoryReference[];
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
  references?: StoryReference[];
  onUpdate: (segmentId: string, updates: Partial<Segment>) => void;
}

function SegmentImageEditor({ segment, storyId, previousImageUrl, storyBible, references, onUpdate }: SegmentImageEditorProps) {
  const [generating, setGenerating] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  const hasImage = !!segment.image_url;
  const hasStoryboard = !!(segment.storyboard_shot_type || segment.storyboard_location || segment.storyboard_focus);
  const hasPromptOverride = !!segment.image_prompt;
  const canGenerate = hasStoryboard || hasPromptOverride;
  const imageHistory = segment.image_history || [];
  const hasHistory = imageHistory.length > 1;

  // Get explicitly tagged references for this segment (no auto-detection)
  const getTaggedReferences = () => {
    if (!references || references.length === 0) return [];
    if (!segment.reference_ids || segment.reference_ids.length === 0) return [];

    // Only include explicitly tagged references that have generated images
    const taggedRefs = references.filter(ref =>
      segment.reference_ids?.includes(ref.id) && ref.image_url
    );

    return taggedRefs.map(ref => ({
      type: ref.type,
      name: ref.name,
      description: ref.description,
      imageUrl: ref.image_url!,
    }));
  };

  const handleGenerateImage = async () => {
    if (!canGenerate) {
      alert('No storyboard data or image prompt for this segment. Generate a storyboard first, or add a manual image prompt.');
      return;
    }

    setGenerating(true);
    try {
      const visualReferences = getTaggedReferences();
      console.log('[ImageGen] Using', visualReferences.length, 'tagged references:', visualReferences.map(r => r.name));

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'image',
          // Only pass prompt if it exists (manual override)
          prompt: segment.image_prompt || undefined,
          // Always pass segment text for storyboard-based generation
          segmentText: segment.text,
          segmentId: segment.id,
          referenceImageUrl: previousImageUrl || undefined,
          // Don't include characters - using overlay system instead
          includeUser: false,
          includePet: false,
          storyBible: storyBible || undefined,
          visualReferences: visualReferences.length > 0 ? visualReferences : undefined,
          // Storyboard fields for intentional visual planning
          storyboardLocation: segment.storyboard_location || undefined,
          storyboardCharacters: segment.storyboard_characters || undefined,
          storyboardShotType: segment.storyboard_shot_type || undefined,
          storyboardCameraAngle: segment.storyboard_camera_angle || undefined,
          storyboardFocus: segment.storyboard_focus || undefined,
          storyboardExclude: segment.storyboard_exclude || undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.text();
        throw new Error(error);
      }

      const data = await res.json();
      console.log('[ImageGen] Image generated:', { segmentId: segment.id, imageUrl: data.imageUrl });

      // Save to database (API will append to history)
      console.log('[ImageGen] Saving to database...');
      const saveRes = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: data.imageUrl }),
      });

      const saveData = await saveRes.json().catch(() => ({ error: 'Failed to parse response' }));
      console.log('[ImageGen] Database save response:', saveRes.status, saveData);

      if (!saveRes.ok) {
        console.error('[ImageGen] Failed to save image URL to database:', saveData);
        throw new Error(`Failed to save: ${saveData.details || saveData.error}`);
      }

      // Update local state with new image and history from response
      onUpdate(segment.id, {
        image_url: saveData.segment.image_url,
        image_history: saveData.segment.image_history
      });
    } catch (error) {
      console.error('[ImageGen] Failed to generate image:', error);
      alert('Failed to generate image. Check console for details.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSelectImage = async (imageUrl: string) => {
    if (imageUrl === segment.image_url) return;

    try {
      const res = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectImageFromHistory: imageUrl }),
      });

      if (!res.ok) {
        throw new Error('Failed to select image');
      }

      const data = await res.json();
      onUpdate(segment.id, { image_url: data.segment.image_url });
    } catch (error) {
      console.error('Failed to select image:', error);
      alert('Failed to select image');
    }
  };

  const handleDeleteImage = async (imageUrl: string) => {
    if (!confirm('Delete this image? This cannot be undone.')) return;

    setDeleting(imageUrl);
    try {
      const res = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
      });

      if (!res.ok) {
        throw new Error('Failed to delete image');
      }

      const data = await res.json();
      onUpdate(segment.id, {
        image_url: data.segment.image_url,
        image_history: data.segment.image_history
      });
    } catch (error) {
      console.error('Failed to delete image:', error);
      alert('Failed to delete image');
    } finally {
      setDeleting(null);
    }
  };

  if (!canGenerate) {
    return null;
  }

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 flex-wrap">
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
          {hasImage ? 'Regenerate' : 'Generate Image'}
        </button>

        {/* Gallery Button */}
        {hasImage && (
          <button
            onClick={() => setShowGallery(!showGallery)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            {showGallery ? 'Hide' : 'Gallery'}
            {hasHistory && <span className="bg-cyan-500/30 px-1.5 rounded">{imageHistory.length}</span>}
          </button>
        )}

        {/* Image status indicator */}
        {hasImage && (
          <span className="ml-auto text-xs text-green-400 flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Image ready
          </span>
        )}
      </div>

      {/* Image Gallery */}
      {showGallery && (
        <div className="mt-3 p-3 bg-slate-800/50 rounded-lg">
          {imageHistory.length === 0 ? (
            // No history yet - show just current image
            segment.image_url && (
              <div className="relative group">
                <img
                  src={segment.image_url}
                  alt="Current"
                  className="w-full max-w-md rounded-lg border-2 border-emerald-500"
                />
                <div className="absolute top-2 left-2 bg-emerald-500 text-white text-xs px-2 py-0.5 rounded">
                  Current
                </div>
                {/* Expand button */}
                <button
                  onClick={() => setLightboxUrl(segment.image_url)}
                  className="absolute bottom-2 right-2 bg-black/70 hover:bg-black/90 text-white p-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                  title="View full size"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
              </div>
            )
          ) : (
            // Show gallery grid
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {imageHistory.slice().reverse().map((item, idx) => {
                const isSelected = item.url === segment.image_url;
                const isDeleting = deleting === item.url;
                const createdAt = new Date(item.created_at);
                const timeAgo = getTimeAgo(createdAt);

                return (
                  <div key={item.url} className="relative group">
                    <img
                      src={item.url}
                      alt={`Version ${imageHistory.length - idx}`}
                      className={`w-full aspect-video object-cover rounded-lg cursor-pointer transition-all ${
                        isSelected
                          ? 'border-2 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'border border-slate-600 hover:border-slate-400'
                      } ${isDeleting ? 'opacity-50' : ''}`}
                      onClick={() => !isDeleting && handleSelectImage(item.url)}
                    />

                    {/* Selected indicator */}
                    {isSelected && (
                      <div className="absolute top-1 left-1 bg-emerald-500 text-white text-[10px] px-1.5 py-0.5 rounded flex items-center gap-1">
                        <CheckCircle className="w-2.5 h-2.5" />
                        Active
                      </div>
                    )}

                    {/* Time ago */}
                    <div className="absolute bottom-1 left-1 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {timeAgo}
                    </div>

                    {/* Expand button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxUrl(item.url);
                      }}
                      className="absolute bottom-1 right-8 bg-black/70 hover:bg-black/90 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                      title="View full size"
                    >
                      <Maximize2 className="w-3 h-3" />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteImage(item.url);
                      }}
                      disabled={isDeleting}
                      className="absolute top-1 right-1 bg-red-500/80 hover:bg-red-500 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                      title="Delete this image"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <Trash2 className="w-3 h-3" />
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
            onClick={() => setLightboxUrl(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-[90vw] max-h-[90vh]"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={lightboxUrl}
                alt="Full size preview"
                className="max-w-full max-h-[90vh] rounded-lg shadow-2xl"
              />
              <button
                onClick={() => setLightboxUrl(null)}
                className="absolute -top-3 -right-3 bg-white text-slate-900 p-2 rounded-full shadow-lg hover:bg-slate-100 transition-colors"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Helper to format time ago
function getTimeAgo(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

// Component for managing reference tags on a segment
interface SegmentReferenceTagsProps {
  segment: Segment;
  storyId: string;
  references: StoryReference[];
  onUpdate: (segmentId: string, updates: Partial<Segment>) => void;
}

function SegmentReferenceTags({ segment, storyId, references, onUpdate }: SegmentReferenceTagsProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const taggedRefs = references.filter(ref =>
    segment.reference_ids?.includes(ref.id)
  );
  const untaggedRefs = references.filter(ref =>
    !segment.reference_ids?.includes(ref.id)
  );

  const handleAddRef = async (refId: string) => {
    setSaving(true);
    try {
      const newRefs = [...(segment.reference_ids || []), refId];
      const res = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceIds: newRefs }),
      });
      if (res.ok) {
        onUpdate(segment.id, { reference_ids: newRefs });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveRef = async (refId: string) => {
    setSaving(true);
    try {
      const newRefs = (segment.reference_ids || []).filter(id => id !== refId);
      const res = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceIds: newRefs }),
      });
      if (res.ok) {
        onUpdate(segment.id, { reference_ids: newRefs });
      }
    } finally {
      setSaving(false);
    }
  };

  const getRefIcon = (type: string) => {
    switch (type) {
      case 'character': return <Users className="w-3 h-3" />;
      case 'location': return <MapPin className="w-3 h-3" />;
      case 'object': return <Package className="w-3 h-3" />;
      default: return <Tag className="w-3 h-3" />;
    }
  };

  if (references.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-slate-700/50">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 flex items-center gap-1">
          <Tag className="w-3 h-3" />
          References:
        </span>

        {/* Tagged references */}
        {taggedRefs.map(ref => (
          <button
            key={ref.id}
            onClick={() => handleRemoveRef(ref.id)}
            disabled={saving}
            className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-amber-500/20 text-amber-300 rounded-full hover:bg-red-500/30 hover:text-red-300 transition-colors disabled:opacity-50"
            title={`${ref.name} - Click to remove`}
          >
            {getRefIcon(ref.type)}
            {ref.name}
            <X className="w-2.5 h-2.5" />
          </button>
        ))}

        {/* Add button */}
        {untaggedRefs.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setShowPicker(!showPicker)}
              disabled={saving}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] bg-slate-600/50 text-slate-400 rounded-full hover:bg-slate-600 hover:text-slate-300 transition-colors disabled:opacity-50"
            >
              <Plus className="w-2.5 h-2.5" />
              Add
            </button>

            {/* Reference picker dropdown */}
            {showPicker && (
              <div className="absolute top-full left-0 mt-1 z-20 bg-slate-800 border border-slate-600 rounded-lg shadow-xl min-w-[200px] max-h-[200px] overflow-y-auto">
                {untaggedRefs.map(ref => (
                  <button
                    key={ref.id}
                    onClick={() => {
                      handleAddRef(ref.id);
                      setShowPicker(false);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-slate-700 transition-colors"
                  >
                    {ref.image_url ? (
                      <img src={ref.image_url} alt="" className="w-6 h-6 rounded object-cover" />
                    ) : (
                      <div className="w-6 h-6 rounded bg-slate-600 flex items-center justify-center">
                        {getRefIcon(ref.type)}
                      </div>
                    )}
                    <div>
                      <div className="text-slate-200">{ref.name}</div>
                      <div className="text-[10px] text-slate-500">{ref.type}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {taggedRefs.length === 0 && untaggedRefs.length > 0 && (
          <span className="text-[10px] text-slate-500 italic">No references tagged</span>
        )}
      </div>
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

// Editable text field component for inline editing
interface EditableFieldProps {
  value: string;
  onSave: (newValue: string) => Promise<void>;
  multiline?: boolean;
  className?: string;
  label?: string;
}

function EditableField({ value, onSave, multiline = false, className = '', label }: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setSaving(true);
    try {
      await onSave(editValue);
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to save:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditValue(value);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <div className="flex flex-col gap-2">
        {label && <label className="text-xs text-slate-500 uppercase tracking-wide">{label}</label>}
        {multiline ? (
          <textarea
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 resize-none text-sm"
            rows={3}
            autoFocus
          />
        ) : (
          <input
            type="text"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            autoFocus
          />
        )}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded transition-colors disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
            Save
          </button>
          <button
            onClick={handleCancel}
            disabled={saving}
            className="flex items-center gap-1 px-2 py-1 text-xs bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 rounded transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative ${className}`}>
      {label && <label className="text-xs text-slate-500 uppercase tracking-wide">{label}</label>}
      <div className="flex items-start gap-2">
        <span className="flex-1">{value}</span>
        <button
          onClick={() => setIsEditing(true)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-400 transition-all"
          title="Edit"
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>
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

  // Cover image generation state
  const [generatingCoverImage, setGeneratingCoverImage] = useState(false);
  const [showCoverPreview, setShowCoverPreview] = useState(false);

  // Reference management state
  const [generatingRefImages, setGeneratingRefImages] = useState<Set<string>>(new Set());
  const [generatingAllRefs, setGeneratingAllRefs] = useState(false);
  const [showAddReference, setShowAddReference] = useState(false);
  const [newRefType, setNewRefType] = useState<'character' | 'object' | 'location'>('character');
  const [newRefName, setNewRefName] = useState('');
  const [newRefDescription, setNewRefDescription] = useState('');

  // Story Bible state
  const [showStoryBible, setShowStoryBible] = useState(false);
  const [editingStoryBible, setEditingStoryBible] = useState(false);
  const [storyBibleDraft, setStoryBibleDraft] = useState<StoryBible | null>(null);
  const [savingStoryBible, setSavingStoryBible] = useState(false);

  // Storyboard generation state
  const [generatingStoryboard, setGeneratingStoryboard] = useState(false);

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

  const handleSaveStoryBible = async () => {
    if (!storyBibleDraft) return;
    setSavingStoryBible(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ storyBible: storyBibleDraft }),
      });

      if (!res.ok) throw new Error('Failed to save story bible');
      const data = await res.json();
      setStory({ ...story!, ...data.story });
      setEditingStoryBible(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save story bible');
    } finally {
      setSavingStoryBible(false);
    }
  };

  const startEditingStoryBible = () => {
    setStoryBibleDraft(story?.story_bible || {});
    setEditingStoryBible(true);
  };

  const cancelEditingStoryBible = () => {
    setStoryBibleDraft(null);
    setEditingStoryBible(false);
  };

  const updateStoryBibleField = (field: keyof StoryBible, value: string | string[] | null) => {
    setStoryBibleDraft(prev => prev ? { ...prev, [field]: value } : { [field]: value });
  };

  const handleGenerateStoryboard = async () => {
    if (!story?.story_bible) {
      setError('Story Bible required. Add or generate a Story Bible first.');
      return;
    }

    setGeneratingStoryboard(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generateStoryboard' }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to generate storyboard');
      }

      // Refresh story to get updated segment storyboard data
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate storyboard');
    } finally {
      setGeneratingStoryboard(false);
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

  const handleGenerateCoverImage = async () => {
    if (!story) return;
    setGeneratingCoverImage(true);
    setError(null);

    try {
      // Collect existing segment image URLs for style reference
      const referenceImageUrls: string[] = [];
      for (const chapter of story.chapters) {
        for (const segment of chapter.segments) {
          if (segment.image_url && referenceImageUrls.length < 3) {
            referenceImageUrls.push(segment.image_url);
          }
        }
      }

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'coverImage',
          storyId: story.id,
          storyTitle: story.title,
          storyDescription: story.description,
          referenceImageUrls,
          storyBible: story.story_bible || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate cover image');
      }

      const data = await res.json();

      // Save cover image URL to database
      const saveRes = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ coverImageUrl: data.coverImageUrl }),
      });

      if (!saveRes.ok) throw new Error('Failed to save cover image URL');

      setStory({ ...story, cover_image_url: data.coverImageUrl });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate cover image');
    } finally {
      setGeneratingCoverImage(false);
    }
  };

  // Generate image for a single reference
  const handleGenerateReferenceImage = async (reference: StoryReference) => {
    if (!story) return;

    setGeneratingRefImages(prev => new Set(prev).add(reference.id));
    setError(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'referenceImage',
          referenceId: reference.id,
          referenceType: reference.type,
          name: reference.name,
          description: reference.description,
          storyBible: story.story_bible || undefined,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate reference image');
      }

      const data = await res.json();

      // Save image URL to database
      const saveRes = await fetch(`/api/admin/stories/${storyId}?reference=${reference.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: data.imageUrl }),
      });

      if (!saveRes.ok) throw new Error('Failed to save reference image URL');

      // Update local state
      setStory(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          references: prev.references.map(r =>
            r.id === reference.id ? { ...r, image_url: data.imageUrl } : r
          ),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate reference image');
    } finally {
      setGeneratingRefImages(prev => {
        const next = new Set(prev);
        next.delete(reference.id);
        return next;
      });
    }
  };

  // Generate images for all references without images
  const handleGenerateAllReferenceImages = async () => {
    if (!story) return;

    const refsWithoutImages = story.references.filter(r => !r.image_url);
    if (refsWithoutImages.length === 0) {
      alert('All references already have images');
      return;
    }

    setGeneratingAllRefs(true);
    setError(null);

    try {
      for (const ref of refsWithoutImages) {
        await handleGenerateReferenceImage(ref);
        // Small delay between generations to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } finally {
      setGeneratingAllRefs(false);
    }
  };

  // Delete a reference
  const handleDeleteReference = async (referenceId: string) => {
    if (!confirm('Are you sure you want to delete this reference?')) return;

    try {
      const res = await fetch(`/api/admin/stories/${storyId}?reference=${referenceId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete reference');

      setStory(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          references: prev.references.filter(r => r.id !== referenceId),
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete reference');
    }
  };

  // Add a new reference
  const handleAddReference = async () => {
    if (!newRefName.trim() || !newRefDescription.trim()) {
      alert('Please provide both name and description');
      return;
    }

    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addReference',
          type: newRefType,
          name: newRefName.trim(),
          description: newRefDescription.trim(),
        }),
      });

      if (!res.ok) throw new Error('Failed to add reference');

      const data = await res.json();
      setStory(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          references: [...prev.references, data.reference],
        };
      });

      // Reset form
      setNewRefName('');
      setNewRefDescription('');
      setShowAddReference(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add reference');
    }
  };

  // Re-extract references from story
  const handleReExtractReferences = async () => {
    if (!confirm('This will replace all current references with newly extracted ones. Continue?')) return;

    setGeneratingAllRefs(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/stories/${storyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'extractReferences' }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to extract references');
      }

      const data = await res.json();
      setStory(prev => {
        if (!prev) return prev;
        return { ...prev, references: data.references };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to extract references');
    } finally {
      setGeneratingAllRefs(false);
    }
  };

  // Update reference field
  const handleSaveReferenceField = useCallback(async (
    referenceId: string,
    field: 'name' | 'description',
    value: string
  ) => {
    const res = await fetch(`/api/admin/stories/${storyId}?reference=${referenceId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.details || error.error);
    }

    setStory(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        references: prev.references.map(r =>
          r.id === referenceId ? { ...r, [field]: value } : r
        ),
      };
    });
  }, [storyId]);

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
    console.log('[handleSegmentUpdate] Called with:', segmentId, updates);
    setStory((prev) => {
      if (!prev) {
        console.log('[handleSegmentUpdate] No prev story, returning');
        return prev;
      }

      // Debug: check if segment exists and log old vs new
      let foundSegment = false;
      for (const ch of prev.chapters) {
        for (const seg of ch.segments) {
          if (seg.id === segmentId) {
            foundSegment = true;
            console.log('[handleSegmentUpdate] Found segment, old image_url:', seg.image_url);
            console.log('[handleSegmentUpdate] New image_url:', updates.image_url);
            console.log('[handleSegmentUpdate] URLs are same?', seg.image_url === updates.image_url);
          }
        }
      }
      if (!foundSegment) {
        console.error('[handleSegmentUpdate] SEGMENT NOT FOUND:', segmentId);
      }

      console.log('[handleSegmentUpdate] Creating new story object');
      const newStory = {
        ...prev,
        chapters: prev.chapters.map((chapter) => ({
          ...chapter,
          segments: chapter.segments.map((segment) =>
            segment.id === segmentId ? { ...segment, ...updates } : segment
          ),
        })),
      };
      console.log('[handleSegmentUpdate] Returning new story');
      return newStory;
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

  // Save chapter content changes to API
  const handleSaveChapterField = useCallback(async (
    chapterId: string,
    field: 'title' | 'recap' | 'cliffhanger' | 'nextChapterTeaser',
    value: string
  ) => {
    const res = await fetch(`/api/admin/stories/${storyId}?chapter=${chapterId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.details || error.error);
    }

    // Update local state
    setStory((prev) => {
      if (!prev) return prev;
      const fieldMap: Record<string, string> = {
        title: 'title',
        recap: 'recap',
        cliffhanger: 'cliffhanger',
        nextChapterTeaser: 'next_chapter_teaser',
      };
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) =>
          chapter.id === chapterId ? { ...chapter, [fieldMap[field]]: value } : chapter
        ),
      };
    });
  }, [storyId]);

  // Save segment content changes to API
  const handleSaveSegmentField = useCallback(async (
    segmentId: string,
    field: 'text' | 'brushingPrompt' | 'imagePrompt',
    value: string
  ) => {
    const res = await fetch(`/api/admin/stories/${storyId}?segment=${segmentId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.details || error.error);
    }

    // Update local state
    setStory((prev) => {
      if (!prev) return prev;
      const fieldMap: Record<string, string> = {
        text: 'text',
        brushingPrompt: 'brushing_prompt',
        imagePrompt: 'image_prompt',
      };
      return {
        ...prev,
        chapters: prev.chapters.map((chapter) => ({
          ...chapter,
          segments: chapter.segments.map((segment) =>
            segment.id === segmentId ? { ...segment, [fieldMap[field]]: value } : segment
          ),
        })),
      };
    });
  }, [storyId]);

  // Generate all images for a chapter
  // Helper to find relevant references for a segment using fuzzy matching
  const findRelevantReferences = useCallback((segment: Segment, allReferences: StoryReference[]) => {
    if (!allReferences || allReferences.length === 0) return [];

    // Only include references that have generated images
    const refsWithImages = allReferences.filter(r => r.image_url);
    if (refsWithImages.length === 0) return [];

    const searchText = `${segment.text} ${segment.image_prompt || ''}`.toLowerCase();

    // Find references whose name appears in the segment text or image prompt
    const relevantRefs = refsWithImages.filter(ref => {
      // Extract key words from reference name (remove articles, common words)
      const nameWords = ref.name.toLowerCase()
        .replace(/^(the|a|an)\s+/i, '')
        .split(/\s+/)
        .filter(w => w.length > 2);

      // Check if any significant word from the reference name appears in the segment
      return nameWords.some(word => searchText.includes(word));
    });

    // Return matching refs, formatted for the API
    return relevantRefs.map(ref => ({
      type: ref.type,
      name: ref.name,
      description: ref.description,
      imageUrl: ref.image_url!,
    }));
  }, []);

  const handleGenerateChapterImages = useCallback(async (chapter: Chapter) => {
    // Segments can be generated if they have storyboard data OR an image prompt
    const generatableSegments = chapter.segments.filter(s =>
      s.image_prompt || s.storyboard_shot_type || s.storyboard_location || s.storyboard_focus
    );
    if (generatableSegments.length === 0) {
      alert('No segments with storyboard data or image prompts in this chapter. Generate a storyboard first.');
      return;
    }

    setGeneratingImagesForChapter(chapter.id);
    setImageGenProgress({ current: 0, total: generatableSegments.length });

    let previousImageUrl: string | null = null;

    for (let i = 0; i < generatableSegments.length; i++) {
      const segment = generatableSegments[i];
      setImageGenProgress({ current: i + 1, total: generatableSegments.length });

      // Find relevant visual references for this segment
      const visualReferences = findRelevantReferences(segment, story?.references || []);
      console.log(`[ImageGen] Segment ${i + 1}: Found ${visualReferences.length} relevant references:`,
        visualReferences.map(r => r.name));

      try {
        const res = await fetch('/api/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'image',
            // Only pass prompt if it exists (manual override)
            prompt: segment.image_prompt || undefined,
            // Always pass segment text for storyboard-based generation
            segmentText: segment.text,
            segmentId: segment.id,
            referenceImageUrl: previousImageUrl || undefined,
            includeUser: false,
            includePet: false,
            storyBible: story?.story_bible || undefined,
            visualReferences: visualReferences.length > 0 ? visualReferences : undefined,
            // Storyboard fields for intentional visual planning
            storyboardLocation: segment.storyboard_location || undefined,
            storyboardCharacters: segment.storyboard_characters || undefined,
            storyboardShotType: segment.storyboard_shot_type || undefined,
            storyboardCameraAngle: segment.storyboard_camera_angle || undefined,
            storyboardFocus: segment.storyboard_focus || undefined,
            storyboardExclude: segment.storyboard_exclude || undefined,
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
  }, [storyId, handleSegmentUpdate, findRelevantReferences, story?.references, story?.story_bible]);

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

        {/* Story Bible Section */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setShowStoryBible(!showStoryBible)}
              className="flex items-center gap-2 text-lg font-semibold hover:text-cyan-300 transition-colors"
            >
              {showStoryBible ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
              <BookOpen className="w-5 h-5 text-amber-400" />
              Story Bible
              {story.story_bible ? (
                <span className="text-xs font-normal text-green-400 ml-2">(configured)</span>
              ) : (
                <span className="text-xs font-normal text-slate-500 ml-2">(not set)</span>
              )}
            </button>

            {showStoryBible && !editingStoryBible && story.story_bible && (
              <div className="flex gap-2">
                <button
                  onClick={handleGenerateStoryboard}
                  disabled={generatingStoryboard}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors disabled:opacity-50"
                  title="Generate visual storyboard from Story Bible"
                >
                  {generatingStoryboard ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clapperboard className="w-3.5 h-3.5" />}
                  {generatingStoryboard ? 'Generating...' : 'Generate Storyboard'}
                </button>
                <button
                  onClick={startEditingStoryBible}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </button>
              </div>
            )}

            {showStoryBible && editingStoryBible && (
              <div className="flex gap-2">
                <button
                  onClick={handleSaveStoryBible}
                  disabled={savingStoryBible}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {savingStoryBible ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Save
                </button>
                <button
                  onClick={cancelEditingStoryBible}
                  disabled={savingStoryBible}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 rounded-lg transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                  Cancel
                </button>
              </div>
            )}
          </div>

          <AnimatePresence>
            {showStoryBible && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                {!story.story_bible && !editingStoryBible ? (
                  <div className="text-center py-8">
                    <p className="text-slate-400 mb-4">No Story Bible configured. The Story Bible is generated automatically when a story is created.</p>
                    <button
                      onClick={startEditingStoryBible}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors mx-auto"
                    >
                      <Plus className="w-4 h-4" />
                      Create Story Bible
                    </button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Narrative Elements */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-purple-400" />
                        Narrative Elements
                      </h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Tone</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.tone || ''}
                              onChange={(e) => updateStoryBibleField('tone', e.target.value)}
                              placeholder="e.g., Whimsical and heartwarming with gentle humor"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.tone || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Themes</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.themes?.join(', ') || ''}
                              onChange={(e) => updateStoryBibleField('themes', e.target.value.split(',').map(t => t.trim()).filter(Boolean))}
                              placeholder="e.g., friendship, bravery, helping others"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.themes?.join(', ') || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Narrative Style</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.narrativeStyle || ''}
                              onChange={(e) => updateStoryBibleField('narrativeStyle', e.target.value)}
                              placeholder="e.g., Third person, warm narrator voice, simple sentences"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.narrativeStyle || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Character Behavior */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        <Users className="w-4 h-4 text-cyan-400" />
                        Character Behavior
                      </h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">[CHILD]'s Role</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.childRole || ''}
                              onChange={(e) => updateStoryBibleField('childRole', e.target.value)}
                              placeholder="e.g., Curious explorer who asks questions"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.childRole || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">[PET]'s Role</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.petRole || ''}
                              onChange={(e) => updateStoryBibleField('petRole', e.target.value)}
                              placeholder="e.g., Loyal sidekick who provides comic relief"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.petRole || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Character Dynamic</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.characterDynamic || ''}
                              onChange={(e) => updateStoryBibleField('characterDynamic', e.target.value)}
                              placeholder="e.g., [CHILD] leads, [PET] encourages and helps"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.characterDynamic || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Visual Style */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        <Image className="w-4 h-4 text-emerald-400" />
                        Visual Style
                      </h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Color Palette</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.colorPalette || ''}
                              onChange={(e) => updateStoryBibleField('colorPalette', e.target.value)}
                              placeholder="e.g., Warm golden yellows, soft greens, magical purples"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.colorPalette || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Lighting Style</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.lightingStyle || ''}
                              onChange={(e) => updateStoryBibleField('lightingStyle', e.target.value)}
                              placeholder="e.g., Soft dappled sunlight filtering through leaves"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.lightingStyle || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Art Direction</label>
                          {editingStoryBible ? (
                            <textarea
                              value={storyBibleDraft?.artDirection || ''}
                              onChange={(e) => updateStoryBibleField('artDirection', e.target.value)}
                              placeholder="Additional visual style notes..."
                              rows={2}
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500 resize-none"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.artDirection || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Story Elements */}
                    <div>
                      <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        Story Elements
                      </h3>
                      <div className="grid gap-4">
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Stakes</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.stakes || ''}
                              onChange={(e) => updateStoryBibleField('stakes', e.target.value)}
                              placeholder="e.g., The forest animals will lose their home"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.stakes || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Resolution</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.resolution || ''}
                              onChange={(e) => updateStoryBibleField('resolution', e.target.value)}
                              placeholder="e.g., The friends work together to save the day"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.resolution || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                        <div>
                          <label className="block text-xs text-slate-500 mb-1">Magic System</label>
                          {editingStoryBible ? (
                            <input
                              type="text"
                              value={storyBibleDraft?.magicSystem || ''}
                              onChange={(e) => updateStoryBibleField('magicSystem', e.target.value || null)}
                              placeholder="e.g., Magic comes from crystals that glow when touched (optional)"
                              className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-500"
                            />
                          ) : (
                            <p className="text-sm text-slate-300">{story.story_bible?.magicSystem || <span className="text-slate-500 italic">Not set</span>}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Key Locations */}
                    {(story.story_bible?.keyLocations?.length || 0) > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-rose-400" />
                          Key Locations ({story.story_bible?.keyLocations?.length || 0})
                        </h3>
                        <div className="space-y-3">
                          {story.story_bible?.keyLocations?.map((loc, idx) => (
                            <div key={idx} className="bg-slate-700/30 rounded-lg p-3">
                              <div className="font-medium text-sm text-white mb-1">{loc.name}</div>
                              <div className="text-xs text-slate-400 mb-1">{loc.visualDescription}</div>
                              <div className="text-xs text-slate-500">Mood: {loc.mood}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Recurring Characters */}
                    {(story.story_bible?.recurringCharacters?.length || 0) > 0 && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
                          <Users className="w-4 h-4 text-indigo-400" />
                          Recurring Characters ({story.story_bible?.recurringCharacters?.length || 0})
                        </h3>
                        <div className="space-y-3">
                          {story.story_bible?.recurringCharacters?.map((char, idx) => (
                            <div key={idx} className="bg-slate-700/30 rounded-lg p-3">
                              <div className="font-medium text-sm text-white mb-1">{char.name}</div>
                              <div className="text-xs text-slate-400 mb-1">{char.visualDescription}</div>
                              <div className="text-xs text-slate-500">
                                {char.personality} • {char.role}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
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

        {/* Cover Image Section */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Image className="w-5 h-5 text-emerald-400" />
            Cover Image
          </h2>

          <div className="flex items-start gap-4 flex-wrap">
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGenerateCoverImage}
                disabled={generatingCoverImage}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {generatingCoverImage ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Wand2 className="w-4 h-4" />
                )}
                {story.cover_image_url ? 'Regenerate Cover' : 'Generate Cover'}
              </button>

              {story.cover_image_url && (
                <button
                  onClick={() => setShowCoverPreview(!showCoverPreview)}
                  className="flex items-center gap-2 px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
                >
                  {showCoverPreview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {showCoverPreview ? 'Hide Preview' : 'Show Preview'}
                </button>
              )}

              {story.cover_image_url && (
                <span className="text-sm text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4" />
                  Cover ready
                </span>
              )}
            </div>

            {/* Cover preview */}
            {showCoverPreview && story.cover_image_url && (
              <div className="flex-1 min-w-[200px] max-w-md">
                <img
                  src={story.cover_image_url}
                  alt="Story cover"
                  className="w-full rounded-lg border border-slate-600 shadow-lg"
                />
              </div>
            )}
          </div>

          {generatingCoverImage && (
            <p className="mt-3 text-sm text-slate-400">
              Generating cover image... This uses existing segment images for style consistency.
            </p>
          )}

          {!story.cover_image_url && !generatingCoverImage && (
            <p className="mt-3 text-sm text-slate-500">
              Generate a cover image for this story. It will use existing segment images as style references if available.
            </p>
          )}
        </section>

        {/* Visual References Section */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              Visual References
              <span className="text-sm font-normal text-slate-400">
                ({story.references?.length || 0} items)
              </span>
            </h2>

            <div className="flex gap-2">
              <button
                onClick={handleReExtractReferences}
                disabled={generatingAllRefs}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-600/50 hover:bg-slate-600/70 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                title="Re-extract references from story"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generatingAllRefs ? 'animate-spin' : ''}`} />
                Re-extract
              </button>

              <button
                onClick={() => setShowAddReference(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add
              </button>

              {story.references && story.references.some(r => !r.image_url) && (
                <button
                  onClick={handleGenerateAllReferenceImages}
                  disabled={generatingAllRefs}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors disabled:opacity-50"
                >
                  {generatingAllRefs ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  Generate All Images
                </button>
              )}
            </div>
          </div>

          {/* Add Reference Form */}
          <AnimatePresence>
            {showAddReference && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden mb-4"
              >
                <div className="bg-slate-700/30 rounded-lg p-4 space-y-3">
                  <div className="flex gap-2">
                    <select
                      value={newRefType}
                      onChange={(e) => setNewRefType(e.target.value as 'character' | 'object' | 'location')}
                      className="px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm"
                    >
                      <option value="character">Character</option>
                      <option value="object">Object</option>
                      <option value="location">Location</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Name (e.g., 'the wise owl')"
                      value={newRefName}
                      onChange={(e) => setNewRefName(e.target.value)}
                      className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400"
                    />
                  </div>
                  <textarea
                    placeholder="Detailed visual description for image generation..."
                    value={newRefDescription}
                    onChange={(e) => setNewRefDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white text-sm placeholder-slate-400 resize-none"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setShowAddReference(false)}
                      className="px-3 py-1.5 text-sm text-slate-400 hover:text-slate-300"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddReference}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-green-500/20 hover:bg-green-500/30 text-green-300 rounded-lg transition-colors"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Add Reference
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* References Grid */}
          {story.references && story.references.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {story.references.map((ref) => {
                const isGenerating = generatingRefImages.has(ref.id);
                const TypeIcon = ref.type === 'character' ? Users : ref.type === 'location' ? MapPin : Package;
                const typeColor = ref.type === 'character' ? 'text-blue-400' : ref.type === 'location' ? 'text-green-400' : 'text-amber-400';

                return (
                  <div
                    key={ref.id}
                    className="bg-slate-700/30 rounded-lg overflow-hidden"
                  >
                    {/* Image Preview */}
                    <div className="aspect-video bg-slate-800/50 relative">
                      {ref.image_url ? (
                        <img
                          src={ref.image_url}
                          alt={ref.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <div className="text-center text-slate-500">
                            <Image className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            <span className="text-xs">No image yet</span>
                          </div>
                        </div>
                      )}

                      {/* Overlay buttons */}
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          onClick={() => handleGenerateReferenceImage(ref)}
                          disabled={isGenerating}
                          className="p-1.5 bg-black/50 hover:bg-black/70 rounded-lg text-white transition-colors disabled:opacity-50"
                          title={ref.image_url ? 'Regenerate image' : 'Generate image'}
                        >
                          {isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Wand2 className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteReference(ref.id)}
                          className="p-1.5 bg-black/50 hover:bg-red-500/70 rounded-lg text-white transition-colors"
                          title="Delete reference"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Type badge */}
                      <div className={`absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 rounded text-xs flex items-center gap-1 ${typeColor}`}>
                        <TypeIcon className="w-3 h-3" />
                        {ref.type}
                      </div>
                    </div>

                    {/* Details */}
                    <div className="p-3">
                      <EditableField
                        value={ref.name}
                        onSave={(value) => handleSaveReferenceField(ref.id, 'name', value)}
                        className="font-medium text-white text-sm mb-1"
                      />
                      <details className="text-xs text-slate-400">
                        <summary className="cursor-pointer hover:text-slate-300">
                          Description (click to edit)
                        </summary>
                        <div className="mt-1">
                          <EditableField
                            value={ref.description}
                            onSave={(value) => handleSaveReferenceField(ref.id, 'description', value)}
                            multiline
                            className="text-xs text-slate-400"
                          />
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-500 text-center py-8">
              No visual references yet. References are automatically extracted when a story is generated,
              or you can add them manually.
            </p>
          )}

          {generatingAllRefs && (
            <p className="mt-3 text-sm text-slate-400">
              {generatingRefImages.size > 0
                ? `Generating reference images... (${generatingRefImages.size} in progress)`
                : 'Extracting visual references from story...'}
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
              <div className="flex items-center px-6 py-4 gap-4">
                <button
                  onClick={() => toggleChapter(chapter.id)}
                  className="flex items-center gap-4 flex-1 hover:bg-slate-700/30 -m-2 p-2 rounded-lg transition-colors"
                >
                  <span className="w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-lg flex items-center justify-center font-semibold">
                    {chapter.chapter_number}
                  </span>
                  <span className="font-medium flex-1 text-left">{chapter.title}</span>
                  {expandedChapters.has(chapter.id) ? (
                    <ChevronDown className="w-5 h-5 text-slate-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-slate-400" />
                  )}
                </button>
              </div>

              <AnimatePresence>
                {expandedChapters.has(chapter.id) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-6 pb-6 pt-2 border-t border-slate-700/50">
                      {/* Chapter Title (editable) */}
                      <div className="mb-4">
                        <EditableField
                          label="Chapter Title"
                          value={chapter.title}
                          onSave={(value) => handleSaveChapterField(chapter.id, 'title', value)}
                          className="text-lg font-medium text-white"
                        />
                      </div>

                      {/* Recap */}
                      {chapter.recap && (
                        <div className="mb-4">
                          <EditableField
                            label="Recap"
                            value={chapter.recap}
                            onSave={(value) => handleSaveChapterField(chapter.id, 'recap', value)}
                            multiline
                            className="text-sm text-slate-300 italic"
                          />
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

                            {/* Editable segment text */}
                            <div className="mb-2">
                              <EditableField
                                value={segment.text}
                                onSave={(value) => handleSaveSegmentField(segment.id, 'text', value)}
                                multiline
                                className="text-sm text-slate-200"
                              />
                            </div>

                            {/* Editable brushing prompt */}
                            {segment.brushing_prompt && (
                              <div className="mb-2">
                                <EditableField
                                  label="Brushing Prompt"
                                  value={segment.brushing_prompt}
                                  onSave={(value) => handleSaveSegmentField(segment.id, 'brushingPrompt', value)}
                                  className="text-xs text-amber-400/80"
                                />
                              </div>
                            )}

                            {/* Image prompt override (optional) */}
                            <details className="mt-2">
                              <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-400 flex items-center gap-1">
                                <Image className="w-3 h-3" />
                                {segment.image_prompt ? 'Image prompt override (active)' : 'Add image prompt override'}
                              </summary>
                              <div className="mt-1 pl-3 border-l border-slate-600">
                                <p className="text-xs text-slate-500 mb-1">
                                  {segment.image_prompt
                                    ? 'This overrides storyboard-based generation:'
                                    : 'Leave empty to use storyboard data, or add a custom prompt:'}
                                </p>
                                <EditableField
                                  value={segment.image_prompt || ''}
                                  onSave={(value) => handleSaveSegmentField(segment.id, 'imagePrompt', value.trim() || '')}
                                  multiline
                                  className={`text-xs ${segment.image_prompt ? 'text-amber-400' : 'text-slate-400'}`}
                                />
                              </div>
                            </details>

                            {/* Storyboard Info */}
                            {(segment.storyboard_shot_type || segment.storyboard_location) && (
                              <details className="mt-2">
                                <summary className="text-xs text-cyan-500 cursor-pointer hover:text-cyan-400 flex items-center gap-1">
                                  <Clapperboard className="w-3 h-3" />
                                  Storyboard
                                </summary>
                                <div className="mt-1 pl-3 border-l border-cyan-600/50 space-y-1">
                                  <div className="flex flex-wrap gap-2 text-xs">
                                    {segment.storyboard_shot_type && (
                                      <span className="px-2 py-0.5 bg-cyan-500/20 text-cyan-300 rounded flex items-center gap-1">
                                        <Camera className="w-3 h-3" />
                                        {segment.storyboard_shot_type}
                                      </span>
                                    )}
                                    {segment.storyboard_camera_angle && (
                                      <span className="px-2 py-0.5 bg-purple-500/20 text-purple-300 rounded flex items-center gap-1">
                                        <Video className="w-3 h-3" />
                                        {segment.storyboard_camera_angle}
                                      </span>
                                    )}
                                  </div>
                                  {segment.storyboard_location && (
                                    <div className="text-xs text-slate-400">
                                      <span className="text-slate-500">Location:</span> {segment.storyboard_location}
                                    </div>
                                  )}
                                  {segment.storyboard_characters && segment.storyboard_characters.length > 0 && (
                                    <div className="text-xs text-slate-400">
                                      <span className="text-slate-500">NPCs:</span> {segment.storyboard_characters.join(', ')}
                                    </div>
                                  )}
                                  {segment.storyboard_focus && (
                                    <div className="text-xs text-slate-400">
                                      <span className="text-slate-500">Focus:</span> {segment.storyboard_focus}
                                    </div>
                                  )}
                                  {segment.storyboard_continuity && (
                                    <div className="text-xs text-slate-400 italic">
                                      {segment.storyboard_continuity}
                                    </div>
                                  )}
                                  {/* Exclusions */}
                                  {segment.storyboard_exclude && segment.storyboard_exclude.length > 0 && (
                                    <div className="text-xs text-red-400 flex items-center gap-1 flex-wrap">
                                      <Ban className="w-3 h-3" />
                                      <span className="text-red-500">Exclude:</span>
                                      {segment.storyboard_exclude.map((item, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-red-500/20 text-red-300 rounded">
                                          {item}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}

                            {/* Exclusion Editor - always visible if storyboard exists */}
                            {(segment.storyboard_shot_type || segment.storyboard_location) && (
                              <div className="mt-2 flex items-center gap-2">
                                <Ban className="w-3 h-3 text-red-400" />
                                <input
                                  type="text"
                                  placeholder="Add exclusion (e.g., dinosaurs) and press Enter"
                                  className="flex-1 px-2 py-1 text-xs bg-slate-700/30 border border-slate-600/50 rounded text-white placeholder-slate-500 focus:outline-none focus:border-red-500/50"
                                  onKeyDown={async (e) => {
                                    if (e.key === 'Enter') {
                                      const input = e.target as HTMLInputElement;
                                      const value = input.value.trim();
                                      if (!value) return;

                                      const currentExclude = segment.storyboard_exclude || [];
                                      const newExclude = [...currentExclude, value];

                                      try {
                                        const res = await fetch(`/api/admin/stories/${storyId}?segment=${segment.id}`, {
                                          method: 'PUT',
                                          headers: { 'Content-Type': 'application/json' },
                                          body: JSON.stringify({ storyboardExclude: newExclude }),
                                        });
                                        if (res.ok) {
                                          handleSegmentUpdate(segment.id, { storyboard_exclude: newExclude });
                                          input.value = '';
                                        }
                                      } catch (err) {
                                        console.error('Failed to add exclusion:', err);
                                      }
                                    }
                                  }}
                                />
                              </div>
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
                              references={story?.references}
                              onUpdate={handleSegmentUpdate}
                            />

                            {/* Reference Tags */}
                            {story?.references && story.references.length > 0 && (
                              <SegmentReferenceTags
                                segment={segment}
                                storyId={storyId}
                                references={story.references}
                                onUpdate={handleSegmentUpdate}
                              />
                            )}
                          </div>
                        ))}
                      </div>

                      {/* Cliffhanger */}
                      {chapter.cliffhanger && (
                        <div className="mt-4 pt-4 border-t border-slate-600/50">
                          <EditableField
                            label="Cliffhanger"
                            value={chapter.cliffhanger}
                            onSave={(value) => handleSaveChapterField(chapter.id, 'cliffhanger', value)}
                            multiline
                            className="text-sm text-purple-300 italic"
                          />
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
                          <EditableField
                            label="Next Chapter Teaser"
                            value={chapter.next_chapter_teaser}
                            onSave={(value) => handleSaveChapterField(chapter.id, 'nextChapterTeaser', value)}
                            multiline
                            className="text-sm text-slate-400"
                          />
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
