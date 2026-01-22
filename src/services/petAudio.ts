// Cache for pet audio URLs (both regular and possessive forms, including arrays for variety)
interface PetAudioUrls {
  regular: Record<string, string>;
  possessive: Record<string, string>;
  regularArrays: Record<string, string[]>;
  possessiveArrays: Record<string, string[]>;
}

let petAudioCache: PetAudioUrls = { regular: {}, possessive: {}, regularArrays: {}, possessiveArrays: {} };
let cacheInitialized = false;

/**
 * Fetch all pet audio URLs from the database.
 * Results are cached to avoid repeated network requests.
 */
export async function fetchPetAudioUrls(): Promise<PetAudioUrls> {
  if (cacheInitialized) {
    return petAudioCache;
  }

  try {
    const res = await fetch('/api/admin/pets?audio=true');
    if (res.ok) {
      const data = await res.json();
      petAudioCache = {
        regular: data.petAudio || {},
        possessive: data.petAudioPossessive || {},
        regularArrays: data.petAudioUrls || {},
        possessiveArrays: data.petAudioPossessiveUrls || {},
      };
      cacheInitialized = true;
      return petAudioCache;
    }
  } catch (error) {
    console.error('Failed to fetch pet audio URLs:', error);
  }

  return { regular: {}, possessive: {}, regularArrays: {}, possessiveArrays: {} };
}

/**
 * Get audio URL for a specific pet.
 */
export async function getPetAudioUrl(petId: string): Promise<string | null> {
  const audioUrls = await fetchPetAudioUrls();
  return audioUrls.regular[petId] || null;
}

/**
 * Get possessive audio URL for a specific pet (e.g., "Sparkle's").
 */
export async function getPetAudioPossessiveUrl(petId: string): Promise<string | null> {
  const audioUrls = await fetchPetAudioUrls();
  return audioUrls.possessive[petId] || null;
}

/**
 * Get all audio URL variants for a specific pet (for variety in splicing).
 */
export async function getPetAudioUrls(petId: string): Promise<string[]> {
  const audioUrls = await fetchPetAudioUrls();
  return audioUrls.regularArrays[petId] || [];
}

/**
 * Get all possessive audio URL variants for a specific pet (for variety in splicing).
 */
export async function getPetAudioPossessiveUrls(petId: string): Promise<string[]> {
  const audioUrls = await fetchPetAudioUrls();
  return audioUrls.possessiveArrays[petId] || [];
}

/**
 * Clear the pet audio cache (useful when new audio is generated).
 */
export function clearPetAudioCache(): void {
  petAudioCache = { regular: {}, possessive: {}, regularArrays: {}, possessiveArrays: {} };
  cacheInitialized = false;
}
