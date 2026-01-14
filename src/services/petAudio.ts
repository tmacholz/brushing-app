// Cache for pet audio URLs
let petAudioCache: Record<string, string> = {};
let cacheInitialized = false;

/**
 * Fetch all pet audio URLs from the database.
 * Results are cached to avoid repeated network requests.
 */
export async function fetchPetAudioUrls(): Promise<Record<string, string>> {
  if (cacheInitialized) {
    return petAudioCache;
  }

  try {
    const res = await fetch('/api/admin/pet-audio');
    if (res.ok) {
      const data = await res.json();
      petAudioCache = data.petAudio || {};
      cacheInitialized = true;
      return petAudioCache;
    }
  } catch (error) {
    console.error('Failed to fetch pet audio URLs:', error);
  }

  return {};
}

/**
 * Get audio URL for a specific pet.
 */
export async function getPetAudioUrl(petId: string): Promise<string | null> {
  const audioUrls = await fetchPetAudioUrls();
  return audioUrls[petId] || null;
}

/**
 * Clear the pet audio cache (useful when new audio is generated).
 */
export function clearPetAudioCache(): void {
  petAudioCache = {};
  cacheInitialized = false;
}
