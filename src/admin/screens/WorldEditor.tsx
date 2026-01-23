import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useToast } from '../../context/ToastContext';
import {
  ArrowLeft,
  Save,
  Trash2,
  Sparkles,
  RefreshCw,
  BookOpen,
  CheckCircle,
  Clock,
  Loader2,
  Lightbulb,
  Eye,
  EyeOff,
  ImageIcon,
  Music,
  Play,
  Pause,
  Upload,
  Library,
  X,
} from 'lucide-react';

interface World {
  id: string;
  name: string;
  display_name: string;
  description: string;
  theme: string | null;
  unlock_cost: number;
  is_starter: boolean;
  is_published: boolean;
  background_image_url: string | null;
  background_music_url: string | null;
}

interface Story {
  id: string;
  title: string;
  description: string;
  status: string;
  is_published: boolean;
  total_chapters: number;
  created_at: string;
}

interface StoryPitch {
  id: string;
  title: string;
  description: string;
  outline: { chapter: number; title: string; summary: string }[];
  is_used: boolean;
}

export function WorldEditor() {
  const params = useParams<{ worldId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  // Guaranteed by the route definition
  const worldId = params.worldId!;
  const [world, setWorld] = useState<World | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [theme, setTheme] = useState('');
  const [unlockCost, setUnlockCost] = useState(0);
  const [isStarter, setIsStarter] = useState(false);

  // Story creation state
  const [storyIdea, setStoryIdea] = useState('');
  const [generatingOutline, setGeneratingOutline] = useState(false);
  const [generatingPitches, setGeneratingPitches] = useState(false);
  const [pitches, setPitches] = useState<StoryPitch[]>([]);
  const [selectedPitch, setSelectedPitch] = useState<StoryPitch | null>(null);
  const [generatingStory, setGeneratingStory] = useState(false);

  // Image generation state
  const [regeneratingImage, setRegeneratingImage] = useState(false);

  // Music generation state
  const [generatingMusic, setGeneratingMusic] = useState(false);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [musicAudio, setMusicAudio] = useState<HTMLAudioElement | null>(null);
  const [musicPrompt, setMusicPrompt] = useState('');
  const [showMusicPrompt, setShowMusicPrompt] = useState(false);

  // Music upload state
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const audioInputRef = useRef<HTMLInputElement>(null);

  // Music library state
  const [showMusicLibrary, setShowMusicLibrary] = useState(false);
  const [musicLibrary, setMusicLibrary] = useState<Array<{
    id: string;
    name: string;
    url: string;
    theme: string | null;
    source: 'world';
  }>>([]);
  const [loadingLibrary, setLoadingLibrary] = useState(false);
  const [previewingMusicId, setPreviewingMusicId] = useState<string | null>(null);
  const [previewAudio, setPreviewAudio] = useState<HTMLAudioElement | null>(null);

  // Generate default music prompt based on world context
  const generateDefaultMusicPrompt = useCallback(() => {
    if (!world) return '';

    // Theme-specific musical elements
    const themeElements: Record<string, string> = {
      'magical-forest': 'woodland flutes, gentle harps, bird-like melodies, rustling leaves ambiance, fairy-tale wonder',
      'space': 'synthesizers, celestial pads, twinkling stars sounds, cosmic whooshes, futuristic wonder',
      'underwater': 'flowing water sounds, bubble effects, whale-song inspired melodies, oceanic swells, deep sea mystery',
      'dinosaurs': 'tribal drums, prehistoric atmosphere, bold brass, stomping rhythms, ancient jungle vibes',
      'pirates': 'sea shanty rhythms, accordion flourishes, ocean waves, adventurous fiddle, nautical adventure',
    };

    const themeMusic = world.theme ? themeElements[world.theme] || '' : '';

    return `Upbeat, adventurous instrumental background music for a children's story world.

World: ${world.display_name}
Description: ${world.description || 'A magical adventure world'}
Theme elements: ${themeMusic || 'whimsical and magical'}

Style: Energetic yet gentle, exciting adventure vibes suitable for ages 4-8. No vocals or lyrics. Loopable.
Mood: Sense of adventure, excitement, discovery, and fun! Should feel like embarking on an epic quest.
Tempo: Medium-upbeat, driving but not frantic
Instruments: Playful orchestral, bouncy strings, adventurous brass hints, rhythmic percussion, ${themeMusic ? 'plus ' + themeMusic : 'magical chimes'}`;
  }, [world]);

  // Handle audio file upload
  const handleAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !world) return;

    // Validate file type
    const validTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/wave', 'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/webm'];
    if (!validTypes.includes(file.type)) {
      showToast('Please upload a valid audio file (MP3, WAV, OGG, AAC, M4A)', 'error');
      return;
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      showToast('File too large. Maximum size is 50MB', 'error');
      return;
    }

    setUploadingMusic(true);
    setError(null);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const base64Data = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix to get just the base64 data
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Upload to server
      const res = await fetch('/api/admin/upload-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file.name,
          fileData: base64Data,
          fileType: file.type,
          worldId: world.id,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to upload audio');
      }

      const data = await res.json();

      // Save music URL to world
      const saveRes = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundMusicUrl: data.url }),
      });

      if (!saveRes.ok) throw new Error('Failed to save music URL');
      const saveData = await saveRes.json();
      setWorld(saveData.world);
      showToast('Music uploaded successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to upload audio');
      showToast('Failed to upload audio', 'error');
    } finally {
      setUploadingMusic(false);
      if (audioInputRef.current) {
        audioInputRef.current.value = '';
      }
    }
  };

  // Fetch music library
  const fetchMusicLibrary = async () => {
    setLoadingLibrary(true);
    try {
      const res = await fetch('/api/admin/music-library');
      if (!res.ok) throw new Error('Failed to fetch music library');
      const data = await res.json();
      // Filter out current world's music
      setMusicLibrary(data.music.filter((m: { id: string }) => m.id !== worldId));
    } catch (err) {
      console.error('Failed to fetch music library:', err);
      showToast('Failed to load music library', 'error');
    } finally {
      setLoadingLibrary(false);
    }
  };

  // Open music library
  const handleOpenMusicLibrary = () => {
    setShowMusicLibrary(true);
    fetchMusicLibrary();
  };

  // Preview music in library
  const handlePreviewLibraryMusic = (musicItem: { id: string; url: string }) => {
    // Stop any current preview
    if (previewAudio) {
      previewAudio.pause();
      if (previewingMusicId === musicItem.id) {
        setPreviewingMusicId(null);
        return;
      }
    }

    const audio = new Audio(musicItem.url);
    audio.addEventListener('ended', () => setPreviewingMusicId(null));
    audio.play();
    setPreviewAudio(audio);
    setPreviewingMusicId(musicItem.id);
  };

  // Select music from library
  const handleSelectLibraryMusic = async (musicUrl: string) => {
    if (!world) return;

    try {
      const saveRes = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundMusicUrl: musicUrl }),
      });

      if (!saveRes.ok) throw new Error('Failed to save music URL');
      const saveData = await saveRes.json();
      setWorld(saveData.world);
      setShowMusicLibrary(false);

      // Stop preview if playing
      if (previewAudio) {
        previewAudio.pause();
        setPreviewingMusicId(null);
      }

      showToast('Music selected');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to select music');
      showToast('Failed to select music', 'error');
    }
  };

  const fetchWorld = useCallback(async () => {
    if (!worldId) return;
    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`);
      if (!res.ok) throw new Error('Failed to fetch world');
      const data = await res.json();
      setWorld(data.world);
      setStories(data.stories);
      setDisplayName(data.world.display_name);
      setDescription(data.world.description);
      setTheme(data.world.theme || '');
      setUnlockCost(data.world.unlock_cost || 0);
      setIsStarter(data.world.is_starter || false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load world');
    } finally {
      setLoading(false);
    }
  }, [worldId]);

  useEffect(() => {
    fetchWorld();
  }, [fetchWorld]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName,
          description,
          theme: theme || null,
          unlockCost,
          isStarter,
        }),
      });

      if (!res.ok) throw new Error('Failed to save world');
      const data = await res.json();
      setWorld(data.world);
      showToast('World saved');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save world');
      showToast('Failed to save world', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this world? All stories will be deleted too.')) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete world');
      navigate('/admin/worlds');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete world');
    }
  };

  const handlePublish = async (publish: boolean) => {
    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublished: publish }),
      });

      if (!res.ok) throw new Error('Failed to update publish status');
      const data = await res.json();
      setWorld(data.world);
      showToast(publish ? 'World published' : 'World unpublished');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update publish status');
      showToast('Failed to update publish status', 'error');
    }
  };

  const handleRegenerateImage = async () => {
    setRegeneratingImage(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'regenerateImage' }),
      });

      if (!res.ok) throw new Error('Failed to regenerate world image');
      const data = await res.json();
      setWorld(data.world);
      showToast('Image regenerated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to regenerate world image');
      showToast('Failed to regenerate image', 'error');
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleGenerateMusic = async () => {
    if (!world) return;
    setGeneratingMusic(true);
    setError(null);

    try {
      // Use custom prompt if provided, otherwise let API generate default
      const promptToUse = musicPrompt.trim() || undefined;

      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'backgroundMusic',
          worldId: world.id,
          worldName: world.display_name,
          worldDescription: world.description,
          worldTheme: world.theme,
          musicPrompt: promptToUse,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate music');
      const data = await res.json();

      // Save music URL to world
      const saveRes = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backgroundMusicUrl: data.musicUrl }),
      });

      if (!saveRes.ok) throw new Error('Failed to save music URL');
      const saveData = await saveRes.json();
      setWorld(saveData.world);
      setShowMusicPrompt(false);
      showToast('Music generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate music');
      showToast('Failed to generate music', 'error');
    } finally {
      setGeneratingMusic(false);
    }
  };

  const toggleMusicPlayback = () => {
    if (!world?.background_music_url) return;

    if (musicPlaying && musicAudio) {
      musicAudio.pause();
      setMusicPlaying(false);
    } else {
      const audio = musicAudio || new Audio(world.background_music_url);
      if (!musicAudio) {
        audio.addEventListener('ended', () => setMusicPlaying(false));
        setMusicAudio(audio);
      }
      audio.play();
      setMusicPlaying(true);
    }
  };

  const handleGenerateOutline = async () => {
    if (!storyIdea.trim()) return;
    setGeneratingOutline(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'outline', idea: storyIdea }),
      });

      if (!res.ok) throw new Error('Failed to generate outline');
      const data = await res.json();
      setSelectedPitch(data.pitch);
      setStoryIdea('');
      showToast('Outline generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate outline');
      showToast('Failed to generate outline', 'error');
    } finally {
      setGeneratingOutline(false);
    }
  };

  const handleGeneratePitches = async () => {
    setGeneratingPitches(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'pitches', count: 3 }),
      });

      if (!res.ok) throw new Error('Failed to generate pitches');
      const data = await res.json();
      setPitches(data.pitches);
      showToast('Story ideas generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate pitches');
      showToast('Failed to generate ideas', 'error');
    } finally {
      setGeneratingPitches(false);
    }
  };

  const handleGenerateStory = async (pitch: StoryPitch) => {
    setGeneratingStory(true);
    setError(null);

    try {
      const res = await fetch(`/api/admin/worlds/${worldId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate', pitchId: pitch.id }),
      });

      if (!res.ok) throw new Error('Failed to generate story');

      setSelectedPitch(null);
      setPitches([]);
      await fetchWorld();
      showToast('Story generated');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate story');
      showToast('Failed to generate story', 'error');
    } finally {
      setGeneratingStory(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!world) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <p className="text-slate-400">World not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/worlds')}
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
            {world.is_published ? (
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
          {world.is_published ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 text-green-400 rounded-full">
              <CheckCircle className="w-4 h-4" />
              Published
            </span>
          ) : (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-600/50 text-slate-400 rounded-full">
              <Clock className="w-4 h-4" />
              Draft
            </span>
          )}
          <span className="text-slate-500 text-sm">
            {stories.length} {stories.length === 1 ? 'story' : 'stories'}
          </span>
        </div>

        {/* World Image */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">World Image</h2>
            <button
              onClick={handleRegenerateImage}
              disabled={regeneratingImage}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50"
            >
              {regeneratingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {regeneratingImage ? 'Generating...' : 'Regenerate Image'}
            </button>
          </div>

          <div className="flex items-center justify-center">
            {world.background_image_url ? (
              <div className="relative">
                <img
                  src={world.background_image_url}
                  alt={world.display_name}
                  className="w-48 h-48 rounded-full object-cover shadow-lg shadow-purple-500/20"
                />
                <div className="absolute inset-0 rounded-full ring-2 ring-purple-500/30" />
              </div>
            ) : (
              <div className="w-48 h-48 rounded-full bg-slate-700/50 flex flex-col items-center justify-center text-slate-500">
                <ImageIcon className="w-12 h-12 mb-2" />
                <span className="text-sm">No image yet</span>
                <span className="text-xs">Click regenerate to create one</span>
              </div>
            )}
          </div>
        </section>

        {/* World Music */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Music className="w-5 h-5 text-purple-400" />
              Background Music
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Upload Audio Button */}
              <button
                onClick={() => audioInputRef.current?.click()}
                disabled={uploadingMusic}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {uploadingMusic ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                Upload
              </button>
              <input
                ref={audioInputRef}
                type="file"
                accept="audio/mpeg,audio/mp3,audio/wav,audio/ogg,audio/aac,audio/mp4,audio/x-m4a,audio/webm,.mp3,.wav,.ogg,.aac,.m4a,.webm"
                onChange={handleAudioUpload}
                className="hidden"
              />

              {/* Music Library Button */}
              <button
                onClick={handleOpenMusicLibrary}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors"
              >
                <Library className="w-4 h-4" />
                Library
              </button>

              {!showMusicPrompt && (
                <button
                  onClick={() => {
                    setMusicPrompt(generateDefaultMusicPrompt());
                    setShowMusicPrompt(true);
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors"
                >
                  <Sparkles className="w-4 h-4" />
                  Edit Prompt
                </button>
              )}
              <button
                onClick={handleGenerateMusic}
                disabled={generatingMusic}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors disabled:opacity-50"
              >
                {generatingMusic ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {generatingMusic ? 'Generating...' : world.background_music_url ? 'Regenerate' : 'Generate'}
              </button>
            </div>
          </div>

          <p className="text-sm text-slate-400 mb-4">
            Background music plays during all stories in this world. Upload your own, choose from the library, or generate new music.
          </p>

          {/* Editable Music Prompt */}
          {showMusicPrompt && (
            <div className="mb-4 p-4 bg-slate-700/30 border border-slate-600/50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm text-slate-300 font-medium">Music Generation Prompt</label>
                <button
                  onClick={() => setShowMusicPrompt(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  Hide
                </button>
              </div>
              <textarea
                value={musicPrompt}
                onChange={(e) => setMusicPrompt(e.target.value)}
                rows={8}
                className="w-full px-3 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none font-mono"
                placeholder="Describe the music you want..."
              />
              <p className="text-xs text-slate-500 mt-2">
                Customize the prompt to generate different styles. The music will be 2 minutes and loopable.
              </p>
            </div>
          )}

          {world.background_music_url ? (
            <div className="flex items-center gap-4">
              <button
                onClick={toggleMusicPlayback}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700/50 hover:bg-slate-600/50 rounded-lg transition-colors"
              >
                {musicPlaying ? (
                  <>
                    <Pause className="w-5 h-5 text-purple-400" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 text-purple-400" />
                    <span>Preview</span>
                  </>
                )}
              </button>
              <span className="flex items-center gap-2 text-green-400 text-sm">
                <CheckCircle className="w-4 h-4" />
                Music ready
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-slate-500 text-sm">
              <Music className="w-4 h-4" />
              <span>No music yet. Upload, select from library, or generate new music.</span>
            </div>
          )}
        </section>

        {/* Music Library Modal */}
        {showMusicLibrary && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-lg max-h-[80vh] flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-slate-700">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Library className="w-5 h-5 text-purple-400" />
                  Music Library
                </h3>
                <button
                  onClick={() => {
                    setShowMusicLibrary(false);
                    if (previewAudio) {
                      previewAudio.pause();
                      setPreviewingMusicId(null);
                    }
                  }}
                  className="p-1 hover:bg-slate-700 rounded transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">
                {loadingLibrary ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                  </div>
                ) : musicLibrary.length === 0 ? (
                  <p className="text-center text-slate-500 py-8">
                    No other worlds have music yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {musicLibrary.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 bg-slate-700/30 hover:bg-slate-700/50 rounded-lg transition-colors"
                      >
                        <button
                          onClick={() => handlePreviewLibraryMusic(item)}
                          className="p-2 bg-slate-600/50 hover:bg-slate-500/50 rounded-lg transition-colors"
                        >
                          {previewingMusicId === item.id ? (
                            <Pause className="w-4 h-4 text-purple-400" />
                          ) : (
                            <Play className="w-4 h-4 text-purple-400" />
                          )}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.name}</p>
                          {item.theme && (
                            <p className="text-xs text-slate-400 capitalize">{item.theme.replace('-', ' ')}</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleSelectLibraryMusic(item.url)}
                          className="px-3 py-1.5 text-sm bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 rounded-lg transition-colors"
                        >
                          Use
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-slate-700">
                <p className="text-xs text-slate-500 text-center">
                  Select music from another world to reuse it here
                </p>
              </div>
            </motion.div>
          </div>
        )}

        {/* World Details */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">World Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm text-slate-400 mb-1">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
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

            <div>
              <label className="block text-sm text-slate-400 mb-1">Theme</label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                <option value="">No theme</option>
                <option value="magical-forest">Magical Forest</option>
                <option value="space">Space</option>
                <option value="underwater">Underwater</option>
                <option value="dinosaurs">Dinosaurs</option>
                <option value="pirates">Pirates</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Unlock Cost (points)</label>
                <input
                  type="number"
                  min="0"
                  value={unlockCost}
                  onChange={(e) => setUnlockCost(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <p className="text-xs text-slate-500 mt-1">Set to 0 for free worlds</p>
              </div>

              <div className="flex items-end pb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isStarter}
                    onChange={(e) => setIsStarter(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-600 bg-slate-700/50 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                  />
                  <div>
                    <span className="text-white font-medium">Starter World</span>
                    <p className="text-xs text-slate-500">Available to new users</p>
                  </div>
                </label>
              </div>
            </div>
          </div>
        </section>

        {/* Stories List */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Stories ({stories.length})</h2>

          {stories.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No stories yet. Create one below!</p>
          ) : (
            <div className="space-y-3">
              {stories.map((story) => (
                <motion.button
                  key={story.id}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => navigate(`/admin/worlds/${worldId}/stories/${story.id}`)}
                  className="w-full bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-left hover:border-cyan-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-slate-600/50 rounded-lg flex items-center justify-center">
                        <BookOpen className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <h3 className="font-medium">{story.title}</h3>
                        <p className="text-sm text-slate-400 line-clamp-1">{story.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {story.status === 'generating' ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                          <Clock className="w-3 h-3" />
                          Generating
                        </span>
                      ) : story.is_published ? (
                        <span className="flex items-center gap-1 px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                          <CheckCircle className="w-3 h-3" />
                          Published
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-600/50 text-slate-400 text-xs rounded-full">
                          Draft
                        </span>
                      )}
                    </div>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </section>

        {/* Create Story */}
        <section className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4">Create New Story</h2>

          {/* Selected Pitch / Outline Review */}
          {selectedPitch && (
            <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg">
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-purple-300">{selectedPitch.title}</h3>
                <button
                  onClick={() => setSelectedPitch(null)}
                  className="text-slate-400 hover:text-white text-sm"
                >
                  Cancel
                </button>
              </div>
              <p className="text-sm text-slate-300 mb-4">{selectedPitch.description}</p>

              <div className="space-y-2 mb-4">
                {selectedPitch.outline.map((ch) => (
                  <div key={ch.chapter} className="flex gap-3 text-sm">
                    <span className="text-purple-400 font-medium w-8">Ch {ch.chapter}</span>
                    <div>
                      <span className="text-white">{ch.title}</span>
                      <span className="text-slate-400 ml-2">— {ch.summary}</span>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => handleGenerateStory(selectedPitch)}
                disabled={generatingStory}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-500 hover:bg-purple-400 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {generatingStory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Generating Story Content...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Approve & Generate Full Story
                  </>
                )}
              </button>
            </div>
          )}

          {!selectedPitch && (
            <>
              {/* Mode 1: User Idea */}
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Lightbulb className="w-4 h-4 text-cyan-400" />
                  <label className="text-sm text-slate-300">Your Story Idea</label>
                </div>
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={storyIdea}
                    onChange={(e) => setStoryIdea(e.target.value)}
                    placeholder="e.g., A story about finding a lost star..."
                    className="flex-1 px-3 py-2 bg-slate-700/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  />
                  <button
                    onClick={handleGenerateOutline}
                    disabled={generatingOutline || !storyIdea.trim()}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingOutline ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Sparkles className="w-4 h-4" />
                    )}
                    Generate Outline
                  </button>
                </div>
              </div>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-slate-600/50"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="px-3 bg-slate-800/50 text-slate-500 text-sm">OR</span>
                </div>
              </div>

              {/* Mode 2: AI Pitches */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <label className="text-sm text-slate-300">AI Story Suggestions</label>
                  </div>
                  <button
                    onClick={handleGeneratePitches}
                    disabled={generatingPitches}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm text-purple-300 hover:bg-purple-500/20 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {generatingPitches ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    {pitches.length === 0 ? 'Generate Ideas' : 'Refresh'}
                  </button>
                </div>

                {pitches.length === 0 && !generatingPitches && (
                  <p className="text-slate-500 text-sm text-center py-6">
                    Click "Generate Ideas" to get AI story suggestions
                  </p>
                )}

                {generatingPitches && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    <span className="ml-2 text-slate-400">Generating story ideas...</span>
                  </div>
                )}

                {pitches.length > 0 && (
                  <div className="space-y-3">
                    {pitches.filter(p => !p.is_used).map((pitch) => (
                      <motion.button
                        key={pitch.id}
                        whileHover={{ scale: 1.01 }}
                        onClick={() => setSelectedPitch(pitch)}
                        className="w-full bg-slate-700/30 border border-slate-600/50 rounded-lg p-4 text-left hover:border-purple-500/50 transition-colors"
                      >
                        <h4 className="font-medium mb-1">{pitch.title}</h4>
                        <p className="text-sm text-slate-400">{pitch.description}</p>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}
