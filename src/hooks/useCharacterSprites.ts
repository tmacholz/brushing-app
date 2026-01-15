import { useState, useEffect, useCallback } from 'react';
import type { Child, Pet, SpriteMap, CharacterSprite } from '../types';

interface UseCharacterSpritesOptions {
  child: Child | null;
  pet: Pet | null;
}

interface UseCharacterSpritesReturn {
  childSprites: SpriteMap;
  petSprites: SpriteMap;
  spritesReady: boolean;
  isLoading: boolean;
  error: string | null;
  refreshSprites: () => Promise<void>;
}

/**
 * Hook for loading and managing character sprites for overlay compositing.
 * Fetches sprite URLs for both child character type and pet.
 *
 * Note: Child sprites are shared across all children with the same characterId (boy/girl).
 * Pet sprites are per-pet based on their unique avatar.
 */
export function useCharacterSprites({ child, pet }: UseCharacterSpritesOptions): UseCharacterSpritesReturn {
  const [childSprites, setChildSprites] = useState<SpriteMap>({});
  const [petSprites, setPetSprites] = useState<SpriteMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if sprites are ready (at least 'happy' pose is loaded)
  const spritesReady = !!(childSprites['happy'] && petSprites['happy']);

  // Fetch sprites for a specific character
  const fetchSprites = useCallback(async (ownerType: 'child' | 'pet', ownerId: string): Promise<CharacterSprite[]> => {
    try {
      const response = await fetch(`/api/admin/characters?entity=sprites&ownerType=${ownerType}&ownerId=${ownerId}`);
      if (!response.ok) {
        // If sprites don't exist yet, return empty array (not an error)
        if (response.status === 404) {
          return [];
        }
        throw new Error(`Failed to fetch sprites: ${response.statusText}`);
      }
      const data = await response.json();
      return data.sprites || [];
    } catch (err) {
      console.warn(`Failed to fetch ${ownerType} sprites:`, err);
      return [];
    }
  }, []);

  // Convert sprite array to map for easy lookup
  const spritesToMap = (sprites: CharacterSprite[]): SpriteMap => {
    return sprites.reduce((map, sprite) => {
      if (sprite.generationStatus === 'complete' && sprite.spriteUrl) {
        map[sprite.poseKey] = sprite.spriteUrl;
      }
      return map;
    }, {} as SpriteMap);
  };

  // Load all sprites for current child's character type and pet
  const refreshSprites = useCallback(async () => {
    // Use child.characterId for child sprites (shared across all children of same type)
    // Use pet.id for pet sprites (unique per pet)
    if (!child?.characterId || !pet?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch child (by characterId) and pet sprites in parallel
      const [childSpritesList, petSpritesList] = await Promise.all([
        fetchSprites('child', child.characterId),
        fetchSprites('pet', pet.id),
      ]);

      setChildSprites(spritesToMap(childSpritesList));
      setPetSprites(spritesToMap(petSpritesList));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sprites');
    } finally {
      setIsLoading(false);
    }
  }, [child?.characterId, pet?.id, fetchSprites]);

  // Load sprites when child's character type or pet changes
  useEffect(() => {
    if (child?.characterId && pet?.id) {
      refreshSprites();
    } else {
      // Clear sprites if no child or pet
      setChildSprites({});
      setPetSprites({});
    }
  }, [child?.characterId, pet?.id, refreshSprites]);

  return {
    childSprites,
    petSprites,
    spritesReady,
    isLoading,
    error,
    refreshSprites,
  };
}

export default useCharacterSprites;
