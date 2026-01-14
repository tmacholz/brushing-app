import { createContext, useContext, useCallback, useMemo, useState, useEffect, type ReactNode } from 'react';
import type { Child, StoryArc } from '../types';
import { usePets } from './PetsContext';
import { getBrushById } from '../data/brushes';
import { getWorldById } from '../data/worlds';
import { calculateStreak, getDateString } from '../utils/streakCalculator';

const ACTIVE_CHILD_KEY = 'brushquest_active_child_id';
const OLD_STORAGE_KEY = 'brushquest_data';
const LEGACY_STORAGE_KEY = 'brushquest_child';

interface ChildContextType {
  // Current active child
  child: Child | null;
  isNewUser: boolean;
  isLoading: boolean;

  // All children
  allChildren: Child[];
  hasMultipleChildren: boolean;

  // Child management
  createChild: (name: string, age: number, characterId: string, petId?: string, worldId?: string) => Promise<Child | null>;
  addChild: (name: string, age: number, characterId: string, petId?: string, worldId?: string) => Promise<Child | null>;
  switchChild: (childId: string) => void;
  deleteChild: (childId: string) => Promise<void>;

  // Active child updates
  updateChild: (updates: Partial<Child>) => Promise<void>;
  addPoints: (points: number) => Promise<void>;
  updateStreak: () => Promise<{ newStreak: number; streakBroken: boolean }>;
  setCurrentStoryArc: (storyArc: StoryArc | null) => Promise<void>;
  completeChapter: (chapterIndex: number) => Promise<void>;
  updateStoryImages: (imageUrlMap: Map<string, string>) => void;
  unlockPet: (petId: string) => Promise<boolean>;
  unlockBrush: (brushId: string) => Promise<boolean>;
  unlockWorld: (worldId: string) => Promise<boolean>;
  updateCharacter: (characterId: string) => Promise<void>;
  resetChild: () => Promise<void>;
  resetAllData: () => Promise<void>;

  // Refresh data from server
  refreshChildren: () => Promise<void>;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

// API helper functions
async function fetchChildrenFromAPI(): Promise<Child[]> {
  try {
    const res = await fetch('/api/children');
    if (!res.ok) throw new Error('Failed to fetch children');
    const data = await res.json();
    return data.children || [];
  } catch (error) {
    console.error('[ChildContext] Error fetching children:', error);
    return [];
  }
}

async function createChildInAPI(childData: {
  name: string;
  age: number;
  characterId: string;
  activePetId: string;
  activeBrushId: string;
  activeWorldId: string;
  unlockedPets: string[];
  unlockedBrushes: string[];
  unlockedWorlds: string[];
}): Promise<Child | null> {
  try {
    const res = await fetch('/api/children', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(childData),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to create child');
    }
    const data = await res.json();
    return data.child;
  } catch (error) {
    console.error('[ChildContext] Error creating child:', error);
    return null;
  }
}

async function updateChildInAPI(childId: string, updates: Partial<Child>): Promise<Child | null> {
  try {
    const res = await fetch(`/api/children?id=${childId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.error || 'Failed to update child');
    }
    const data = await res.json();
    return data.child;
  } catch (error) {
    console.error('[ChildContext] Error updating child:', error);
    return null;
  }
}

async function deleteChildInAPI(childId: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/children?id=${childId}`, {
      method: 'DELETE',
    });
    return res.ok;
  } catch (error) {
    console.error('[ChildContext] Error deleting child:', error);
    return false;
  }
}

// Migrate legacy localStorage data to database
async function migrateLegacyData(): Promise<void> {
  if (typeof window === 'undefined') return;

  // Check for old single-child format first
  const legacyData = window.localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacyData) {
    try {
      const oldChild = JSON.parse(legacyData);
      console.log('[ChildContext] Migrating legacy single-child data:', oldChild.name);

      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(oldChild),
      });

      if (res.ok) {
        window.localStorage.removeItem(LEGACY_STORAGE_KEY);
        console.log('[ChildContext] Legacy data migrated successfully');
      }
    } catch (error) {
      console.error('[ChildContext] Error migrating legacy data:', error);
    }
  }

  // Check for multi-child format
  const oldData = window.localStorage.getItem(OLD_STORAGE_KEY);
  if (oldData) {
    try {
      const parsed = JSON.parse(oldData);
      if (parsed.children && Array.isArray(parsed.children) && parsed.children.length > 0) {
        console.log('[ChildContext] Migrating', parsed.children.length, 'children to database');

        for (const child of parsed.children) {
          const res = await fetch('/api/children', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(child),
          });

          if (res.ok) {
            console.log('[ChildContext] Migrated child:', child.name);
          } else {
            console.error('[ChildContext] Failed to migrate child:', child.name);
          }
        }

        // Save the active child ID but remove the full data
        if (parsed.activeChildId) {
          window.localStorage.setItem(ACTIVE_CHILD_KEY, parsed.activeChildId);
        }
        window.localStorage.removeItem(OLD_STORAGE_KEY);
        console.log('[ChildContext] Migration complete');
      }
    } catch (error) {
      console.error('[ChildContext] Error migrating multi-child data:', error);
    }
  }
}

export function ChildProvider({ children }: { children: ReactNode }) {
  const { getStarterPets, getPetById } = usePets();

  const [allChildren, setAllChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return window.localStorage.getItem(ACTIVE_CHILD_KEY);
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(true);

  // Get active child from the list
  const child = useMemo(() => {
    if (!activeChildId) return null;
    return allChildren.find((c) => c.id === activeChildId) ?? null;
  }, [allChildren, activeChildId]);

  const hasMultipleChildren = allChildren.length > 1;
  const isNewUser = !isLoading && allChildren.length === 0;

  // Fetch children on mount
  const refreshChildren = useCallback(async () => {
    setIsLoading(true);
    try {
      // First, migrate any legacy data
      await migrateLegacyData();

      // Then fetch all children
      const children = await fetchChildrenFromAPI();
      setAllChildren(children);

      // If no active child set but children exist, set the first one
      if (!activeChildId && children.length > 0) {
        const firstChildId = children[0].id;
        setActiveChildId(firstChildId);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(ACTIVE_CHILD_KEY, firstChildId);
        }
      }

      // If active child doesn't exist in the list, clear it
      if (activeChildId && !children.find(c => c.id === activeChildId)) {
        if (children.length > 0) {
          setActiveChildId(children[0].id);
          if (typeof window !== 'undefined') {
            window.localStorage.setItem(ACTIVE_CHILD_KEY, children[0].id);
          }
        } else {
          setActiveChildId(null);
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(ACTIVE_CHILD_KEY);
          }
        }
      }
    } catch (error) {
      console.error('[ChildContext] Error refreshing children:', error);
    } finally {
      setIsLoading(false);
    }
  }, [activeChildId]);

  useEffect(() => {
    refreshChildren();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Create first child (used during onboarding)
  const createChild = useCallback(
    async (name: string, age: number, characterId: string, petId?: string, worldId?: string): Promise<Child | null> => {
      const starterPets = getStarterPets();
      const starterPetIds = starterPets.map((p) => p.id);

      const childData = {
        name,
        age,
        characterId,
        activePetId: petId ?? starterPetIds[0] ?? 'sparkle',
        activeBrushId: 'star-swirl',
        activeWorldId: worldId ?? 'magical-forest',
        unlockedPets: starterPetIds,
        unlockedBrushes: ['star-swirl'],
        unlockedWorlds: ['magical-forest', 'space-station'],
      };

      const newChild = await createChildInAPI(childData);

      if (newChild) {
        setAllChildren((prev) => [...prev, newChild]);
        setActiveChildId(newChild.id);
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(ACTIVE_CHILD_KEY, newChild.id);
        }
      }

      return newChild;
    },
    [getStarterPets]
  );

  // Add additional child (same as createChild)
  const addChild = createChild;

  // Switch active child
  const switchChild = useCallback((childId: string) => {
    const childExists = allChildren.some((c) => c.id === childId);
    if (!childExists) return;

    setActiveChildId(childId);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(ACTIVE_CHILD_KEY, childId);
    }
  }, [allChildren]);

  // Delete a child
  const deleteChild = useCallback(async (childId: string) => {
    const success = await deleteChildInAPI(childId);
    if (!success) return;

    setAllChildren((prev) => {
      const newChildren = prev.filter((c) => c.id !== childId);

      // If we deleted the active child, switch to another
      if (activeChildId === childId) {
        const newActiveId = newChildren.length > 0 ? newChildren[0].id : null;
        setActiveChildId(newActiveId);
        if (typeof window !== 'undefined') {
          if (newActiveId) {
            window.localStorage.setItem(ACTIVE_CHILD_KEY, newActiveId);
          } else {
            window.localStorage.removeItem(ACTIVE_CHILD_KEY);
          }
        }
      }

      return newChildren;
    });
  }, [activeChildId]);

  // Update active child
  const updateChild = useCallback(async (updates: Partial<Child>) => {
    if (!activeChildId) return;

    // Optimistic update
    setAllChildren((prev) =>
      prev.map((c) => (c.id === activeChildId ? { ...c, ...updates } : c))
    );

    // Sync to API
    await updateChildInAPI(activeChildId, updates);
  }, [activeChildId]);

  const addPoints = useCallback(async (points: number) => {
    if (!child) return;
    await updateChild({ points: child.points + points });
  }, [child, updateChild]);

  const updateStreak = useCallback(async () => {
    if (!child) return { newStreak: 0, streakBroken: false };

    const { newStreak, streakBroken } = calculateStreak(
      child.lastBrushDate,
      child.currentStreak
    );

    await updateChild({
      currentStreak: newStreak,
      longestStreak: Math.max(child.longestStreak, newStreak),
      lastBrushDate: getDateString(),
      totalBrushSessions: child.totalBrushSessions + 1,
    });

    return { newStreak, streakBroken };
  }, [child, updateChild]);

  const setCurrentStoryArc = useCallback(async (storyArc: StoryArc | null) => {
    await updateChild({ currentStoryArc: storyArc });
  }, [updateChild]);

  const completeChapter = useCallback(async (chapterIndex: number) => {
    if (!child?.currentStoryArc) return;

    const updatedChapters = child.currentStoryArc.chapters.map((ch, idx) =>
      idx === chapterIndex
        ? { ...ch, isRead: true, readAt: new Date().toISOString() }
        : ch
    );

    const isComplete = chapterIndex === child.currentStoryArc.totalChapters - 1;

    const updatedStoryArc: StoryArc = {
      ...child.currentStoryArc,
      chapters: updatedChapters,
      currentChapterIndex: isComplete ? chapterIndex : chapterIndex + 1,
      isComplete,
    };

    await updateChild({
      currentStoryArc: isComplete ? null : updatedStoryArc,
      completedStoryArcs: isComplete
        ? [...child.completedStoryArcs, child.currentStoryArc.id]
        : child.completedStoryArcs,
    });
  }, [child, updateChild]);

  // Update story images locally (don't persist data URLs to API)
  const updateStoryImages = useCallback((imageUrlMap: Map<string, string>) => {
    if (!activeChildId) return;

    setAllChildren((prev) =>
      prev.map((c) => {
        if (c.id !== activeChildId || !c.currentStoryArc) return c;

        const updatedChapters = c.currentStoryArc.chapters.map((chapter) => ({
          ...chapter,
          segments: chapter.segments.map((segment) => ({
            ...segment,
            imageUrl: imageUrlMap.get(segment.id) ?? segment.imageUrl,
          })),
        }));

        return {
          ...c,
          currentStoryArc: {
            ...c.currentStoryArc,
            chapters: updatedChapters,
          },
        };
      })
    );
  }, [activeChildId]);

  const unlockItem = useCallback(
    async (
      itemId: string,
      cost: number,
      unlockedKey: 'unlockedPets' | 'unlockedBrushes' | 'unlockedWorlds'
    ): Promise<boolean> => {
      if (!child || child.points < cost) return false;
      if (child[unlockedKey].includes(itemId)) return false;

      await updateChild({
        points: child.points - cost,
        [unlockedKey]: [...child[unlockedKey], itemId],
      });

      return true;
    },
    [child, updateChild]
  );

  const unlockPet = useCallback(
    async (petId: string) => {
      const pet = getPetById(petId);
      return pet ? unlockItem(petId, pet.unlockCost, 'unlockedPets') : false;
    },
    [unlockItem, getPetById]
  );

  const unlockBrush = useCallback(
    async (brushId: string) => {
      const brush = getBrushById(brushId);
      return brush ? unlockItem(brushId, brush.unlockCost, 'unlockedBrushes') : false;
    },
    [unlockItem]
  );

  const unlockWorld = useCallback(
    async (worldId: string) => {
      const world = getWorldById(worldId);
      return world ? unlockItem(worldId, world.unlockCost, 'unlockedWorlds') : false;
    },
    [unlockItem]
  );

  const updateCharacter = useCallback(async (characterId: string) => {
    await updateChild({ characterId });
  }, [updateChild]);

  const resetChild = useCallback(async () => {
    if (!child) return;
    await deleteChild(child.id);
  }, [child, deleteChild]);

  const resetAllData = useCallback(async () => {
    // Delete all children from database
    for (const c of allChildren) {
      await deleteChildInAPI(c.id);
    }

    setAllChildren([]);
    setActiveChildId(null);

    if (typeof window !== 'undefined') {
      window.localStorage.removeItem(ACTIVE_CHILD_KEY);
    }
  }, [allChildren]);

  return (
    <ChildContext.Provider
      value={{
        child,
        isNewUser,
        isLoading,
        allChildren,
        hasMultipleChildren,
        createChild,
        addChild,
        switchChild,
        deleteChild,
        updateChild,
        addPoints,
        updateStreak,
        setCurrentStoryArc,
        completeChapter,
        updateStoryImages,
        unlockPet,
        unlockBrush,
        unlockWorld,
        updateCharacter,
        resetChild,
        resetAllData,
        refreshChildren,
      }}
    >
      {children}
    </ChildContext.Provider>
  );
}

export function useChild() {
  const context = useContext(ChildContext);
  if (context === undefined) {
    throw new Error('useChild must be used within a ChildProvider');
  }
  return context;
}

export default ChildContext;
