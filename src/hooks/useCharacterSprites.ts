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
 * Fetches sprite URLs for both child and pet characters.
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

  // Load all sprites for current child and pet
  const refreshSprites = useCallback(async () => {
    if (!child?.id || !pet?.id) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch child and pet sprites in parallel
      const [childSpritesList, petSpritesList] = await Promise.all([
        fetchSprites('child', child.id),
        fetchSprites('pet', pet.id),
      ]);

      setChildSprites(spritesToMap(childSpritesList));
      setPetSprites(spritesToMap(petSpritesList));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load sprites');
    } finally {
      setIsLoading(false);
    }
  }, [child?.id, pet?.id, fetchSprites]);

  // Load sprites when child or pet changes
  useEffect(() => {
    if (child?.id && pet?.id) {
      refreshSprites();
    } else {
      // Clear sprites if no child or pet
      setChildSprites({});
      setPetSprites({});
    }
  }, [child?.id, pet?.id, refreshSprites]);

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
