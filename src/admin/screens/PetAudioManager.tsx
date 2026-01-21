import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Mic,
  Play,
  Pause,
  Loader2,
  CheckCircle,
  Volume2,
} from 'lucide-react';
import { pets } from '../../data/pets';

interface PetAudioData {
  petId: string;
  audioUrl: string | null;
  possessiveAudioUrl: string | null;
  loading: boolean;
}

export function PetAudioManager() {
  const navigate = useNavigate();
  const [petAudio, setPetAudio] = useState<Record<string, PetAudioData>>({});
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch existing pet audio URLs from database
  useEffect(() => {
    const fetchPetAudio = async () => {
      try {
        const res = await fetch('/api/admin/pets?audio=true');
        if (res.ok) {
          const data = await res.json();
          const audioMap: Record<string, PetAudioData> = {};

          // Initialize all pets
          pets.forEach((pet) => {
            audioMap[pet.id] = {
              petId: pet.id,
              audioUrl: data.petAudio?.[pet.id] || null,
              possessiveAudioUrl: data.petAudioPossessive?.[pet.id] || null,
              loading: false,
            };
          });

          setPetAudio(audioMap);
        }
      } catch (error) {
        console.error('Failed to fetch pet audio:', error);
        // Initialize with empty data
        const audioMap: Record<string, PetAudioData> = {};
        pets.forEach((pet) => {
          audioMap[pet.id] = {
            petId: pet.id,
            audioUrl: null,
            possessiveAudioUrl: null,
            loading: false,
          };
        });
        setPetAudio(audioMap);
      } finally {
        setLoading(false);
      }
    };

    fetchPetAudio();
  }, []);

  const generateAudio = async (petId: string, petName: string) => {
    setPetAudio((prev) => ({
      ...prev,
      [petId]: { ...prev[petId], loading: true },
    }));

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'nameAudio',
          name: petName,
          nameType: 'pet',
          id: petId,
        }),
      });

      if (!res.ok) {
        throw new Error('Failed to generate audio');
      }

      const data = await res.json();

      // Save both regular and possessive audio to database
      await fetch('/api/admin/pets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'saveAudio',
          petId,
          audioUrl: data.audioUrl,
          possessiveAudioUrl: data.possessiveAudioUrl,
        }),
      });

      setPetAudio((prev) => ({
        ...prev,
        [petId]: {
          petId,
          audioUrl: data.audioUrl,
          possessiveAudioUrl: data.possessiveAudioUrl,
          loading: false,
        },
      }));
    } catch (error) {
      console.error('Failed to generate pet audio:', error);
      setPetAudio((prev) => ({
        ...prev,
        [petId]: { ...prev[petId], loading: false },
      }));
      alert('Failed to generate audio. Check console for details.');
    }
  };

  const generateAllAudio = async () => {
    for (const pet of pets) {
      // Generate if missing either regular or possessive audio
      const audio = petAudio[pet.id];
      if (!audio?.audioUrl || !audio?.possessiveAudioUrl) {
        await generateAudio(pet.id, pet.displayName);
        // Small delay between requests to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  };

  const togglePlay = (petId: string, audioUrl: string) => {
    if (playingId === petId) {
      audioRef.current?.pause();
      setPlayingId(null);
    } else {
      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingId(petId);
      }
    }
  };

  const handleEnded = () => {
    setPlayingId(null);
  };

  const totalPets = pets.length;
  const petsWithBothAudio = Object.values(petAudio).filter((p) => p.audioUrl && p.possessiveAudioUrl).length;
  const petsWithAnyAudio = Object.values(petAudio).filter((p) => p.audioUrl || p.possessiveAudioUrl).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* Hidden audio element */}
      <audio ref={audioRef} onEnded={handleEnded} />

      {/* Header */}
      <header className="border-b border-slate-700/50 bg-slate-800/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/admin/pets')}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back
          </button>
          <button
            onClick={generateAllAudio}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-white rounded-lg transition-colors"
          >
            <Mic className="w-4 h-4" />
            Generate All Missing
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">Pet Name Audio</h1>
          <p className="text-slate-400">
            Pre-generate TTS audio for pet names to use in story audio splicing.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-cyan-400" />
            <span className="text-sm text-slate-300">
              {petsWithBothAudio} / {totalPets} pets have both forms
              {petsWithAnyAudio > petsWithBothAudio && (
                <span className="text-amber-400 ml-2">
                  ({petsWithAnyAudio - petsWithBothAudio} missing possessive)
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="space-y-4">
          {pets.map((pet) => {
            const audio = petAudio[pet.id];
            const isPlaying = playingId === pet.id;

            return (
              <motion.div
                key={pet.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-4">
                  {pet.avatarUrl && (
                    <img
                      src={pet.avatarUrl}
                      alt={pet.displayName}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  )}
                  <div>
                    <h3 className="font-medium">{pet.displayName}</h3>
                    <p className="text-sm text-slate-400">{pet.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {audio?.audioUrl && audio?.possessiveAudioUrl ? (
                    <>
                      <span className="flex items-center gap-1 text-xs text-green-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Both forms ready
                      </span>
                      <button
                        onClick={() => togglePlay(pet.id, audio.audioUrl!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {isPlaying ? 'Stop' : 'Play'}
                      </button>
                      <button
                        onClick={() => generateAudio(pet.id, pet.displayName)}
                        disabled={audio?.loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-slate-700/50 hover:bg-slate-600/50 text-slate-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {audio?.loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        Regenerate
                      </button>
                    </>
                  ) : audio?.audioUrl ? (
                    <>
                      <span className="flex items-center gap-1 text-xs text-amber-400">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Missing possessive
                      </span>
                      <button
                        onClick={() => togglePlay(pet.id, audio.audioUrl!)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-lg transition-colors"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {isPlaying ? 'Stop' : 'Play'}
                      </button>
                      <button
                        onClick={() => generateAudio(pet.id, pet.displayName)}
                        disabled={audio?.loading}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg transition-colors disabled:opacity-50"
                      >
                        {audio?.loading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Mic className="w-4 h-4" />
                        )}
                        Generate Possessive
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => generateAudio(pet.id, pet.displayName)}
                      disabled={audio?.loading}
                      className="flex items-center gap-1.5 px-4 py-2 text-sm bg-violet-500/20 hover:bg-violet-500/30 text-violet-300 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {audio?.loading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Mic className="w-4 h-4" />
                      )}
                      Generate Audio
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
