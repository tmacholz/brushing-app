import { createContext, useContext, useCallback, useMemo, type ReactNode } from 'react';
import type { Child, StoryArc } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { getStarterPets, getPetById } from '../data/pets';
import { getStarterBrushes, getBrushById } from '../data/brushes';
import { getStarterWorlds, getWorldById } from '../data/worlds';
import { calculateStreak, getDateString } from '../utils/streakCalculator';
import { generateUniqueId } from '../utils/storyGenerator';

// Storage structure for multiple children
interface AppData {
  children: Child[];
  activeChildId: string | null;
}

interface ChildContextType {
  // Current active child
  child: Child | null;
  isNewUser: boolean;

  // All children
  allChildren: Child[];
  hasMultipleChildren: boolean;

  // Child management
  createChild: (name: string, age: number, petId?: string, worldId?: string) => void;
  addChild: (name: string, age: number, petId?: string, worldId?: string) => void;
  switchChild: (childId: string) => void;
  deleteChild: (childId: string) => void;

  // Active child updates
  updateChild: (updates: Partial<Child>) => void;
  addPoints: (points: number) => void;
  updateStreak: () => { newStreak: number; streakBroken: boolean };
  setCurrentStoryArc: (storyArc: StoryArc | null) => void;
  completeChapter: (chapterIndex: number) => void;
  updateStoryImages: (imageUrlMap: Map<string, string>) => void;
  unlockPet: (petId: string) => boolean;
  unlockBrush: (brushId: string) => boolean;
  unlockWorld: (worldId: string) => boolean;
  resetChild: () => void;
  resetAllData: () => void;
}

const ChildContext = createContext<ChildContextType | undefined>(undefined);

const STORAGE_KEY = 'brushquest_data';
const OLD_STORAGE_KEY = 'brushquest_child';

// Strip large data URLs from app data before saving to localStorage
// Blob URLs are short and safe to store, but base64 data URLs are huge
const sanitizeForStorage = (data: AppData): AppData => {
  return {
    ...data,
    children: data.children.map((child) => ({
      ...child,
      currentStoryArc: child.currentStoryArc
        ? {
            ...child.currentStoryArc,
            chapters: child.currentStoryArc.chapters.map((chapter) => ({
              ...chapter,
              segments: chapter.segments.map((segment) => ({
                ...segment,
                // Only keep blob URLs, strip data URLs (they're too large)
                imageUrl: segment.imageUrl?.startsWith('data:') ? null : segment.imageUrl,
              })),
            })),
          }
        : null,
    })),
  };
};

const createDefaultChild = (name: string, age: number, petId?: string, worldId?: string): Child => {
  const starterPets = getStarterPets();
  const starterBrushes = getStarterBrushes();
  const starterWorlds = getStarterWorlds();

  return {
    id: generateUniqueId(),
    name,
    age,
    activePetId: petId ?? starterPets[0]?.id ?? '',
    activeBrushId: starterBrushes[0]?.id ?? '',
    activeWorldId: worldId ?? starterWorlds[0]?.id ?? '',
    points: 0,
    totalBrushSessions: 0,
    currentStreak: 0,
    longestStreak: 0,
    unlockedPets: starterPets.map((p) => p.id),
    unlockedBrushes: starterBrushes.map((b) => b.id),
    unlockedWorlds: starterWorlds.map((w) => w.id),
    currentStoryArc: null,
    completedStoryArcs: [],
    lastBrushDate: null,
    createdAt: new Date().toISOString(),
  };
};

const getInitialData = (): AppData => {
  // Check for old single-child data and migrate
  if (typeof window !== 'undefined') {
    const oldData = window.localStorage.getItem(OLD_STORAGE_KEY);
    if (oldData) {
      try {
        const oldChild = JSON.parse(oldData) as Child;
        // Remove old key
        window.localStorage.removeItem(OLD_STORAGE_KEY);
        // Return migrated data
        return {
          children: [oldChild],
          activeChildId: oldChild.id,
        };
      } catch {
        // Ignore parse errors
      }
    }
  }

  return {
    children: [],
    activeChildId: null,
  };
};

export function ChildProvider({ children }: { children: ReactNode }) {
  const [appData, setAppData, removeAppData] = useLocalStorage<AppData>(
    STORAGE_KEY,
    getInitialData(),
    sanitizeForStorage
  );

  // Get active child
  const child = useMemo(() => {
    if (!appData.activeChildId) return null;
    return appData.children.find((c) => c.id === appData.activeChildId) ?? null;
  }, [appData]);

  const allChildren = appData.children;
  const hasMultipleChildren = appData.children.length > 1;
  const isNewUser = appData.children.length === 0;

  // Create first child (used during onboarding)
  const createChild = useCallback(
    (name: string, age: number, petId?: string, worldId?: string) => {
      const newChild = createDefaultChild(name, age, petId, worldId);
      setAppData((prev) => ({
        children: [...prev.children, newChild],
        activeChildId: newChild.id,
      }));
    },
    [setAppData]
  );

  // Add additional child
  const addChild = useCallback(
    (name: string, age: number, petId?: string, worldId?: string) => {
      const newChild = createDefaultChild(name, age, petId, worldId);
      setAppData((prev) => ({
        children: [...prev.children, newChild],
        activeChildId: newChild.id,
      }));
    },
    [setAppData]
  );

  // Switch active child
  const switchChild = useCallback(
    (childId: string) => {
      setAppData((prev) => {
        const childExists = prev.children.some((c) => c.id === childId);
        if (!childExists) return prev;
        return { ...prev, activeChildId: childId };
      });
    },
    [setAppData]
  );

  // Delete a child
  const deleteChild = useCallback(
    (childId: string) => {
      setAppData((prev) => {
        const newChildren = prev.children.filter((c) => c.id !== childId);
        let newActiveId = prev.activeChildId;

        // If we deleted the active child, switch to another or null
        if (prev.activeChildId === childId) {
          newActiveId = newChildren.length > 0 ? newChildren[0].id : null;
        }

        return {
          children: newChildren,
          activeChildId: newActiveId,
        };
      });
    },
    [setAppData]
  );

  // Update active child
  const updateChild = useCallback(
    (updates: Partial<Child>) => {
      setAppData((prev) => {
        if (!prev.activeChildId) return prev;
        return {
          ...prev,
          children: prev.children.map((c) =>
            c.id === prev.activeChildId ? { ...c, ...updates } : c
          ),
        };
      });
    },
    [setAppData]
  );

  const addPoints = useCallback(
    (points: number) => {
      setAppData((prev) => {
        if (!prev.activeChildId) return prev;
        return {
          ...prev,
          children: prev.children.map((c) =>
            c.id === prev.activeChildId ? { ...c, points: c.points + points } : c
          ),
        };
      });
    },
    [setAppData]
  );

  const updateStreak = useCallback(() => {
    if (!child) return { newStreak: 0, streakBroken: false };

    const { newStreak, streakBroken } = calculateStreak(
      child.lastBrushDate,
      child.currentStreak
    );

    setAppData((prev) => {
      if (!prev.activeChildId) return prev;
      return {
        ...prev,
        children: prev.children.map((c) =>
          c.id === prev.activeChildId
            ? {
                ...c,
                currentStreak: newStreak,
                longestStreak: Math.max(c.longestStreak, newStreak),
                lastBrushDate: getDateString(),
                totalBrushSessions: c.totalBrushSessions + 1,
              }
            : c
        ),
      };
    });

    return { newStreak, streakBroken };
  }, [child, setAppData]);

  const setCurrentStoryArc = useCallback(
    (storyArc: StoryArc | null) => {
      setAppData((prev) => {
        if (!prev.activeChildId) return prev;
        return {
          ...prev,
          children: prev.children.map((c) =>
            c.id === prev.activeChildId ? { ...c, currentStoryArc: storyArc } : c
          ),
        };
      });
    },
    [setAppData]
  );

  const completeChapter = useCallback(
    (chapterIndex: number) => {
      setAppData((prev) => {
        if (!prev.activeChildId) return prev;

        return {
          ...prev,
          children: prev.children.map((c) => {
            if (c.id !== prev.activeChildId || !c.currentStoryArc) return c;

            const updatedChapters = c.currentStoryArc.chapters.map((ch, idx) =>
              idx === chapterIndex
                ? { ...ch, isRead: true, readAt: new Date().toISOString() }
                : ch
            );

            const isComplete =
              chapterIndex === c.currentStoryArc.totalChapters - 1;

            const updatedStoryArc: StoryArc = {
              ...c.currentStoryArc,
              chapters: updatedChapters,
              currentChapterIndex: isComplete ? chapterIndex : chapterIndex + 1,
              isComplete,
            };

            return {
              ...c,
              currentStoryArc: isComplete ? null : updatedStoryArc,
              completedStoryArcs: isComplete
                ? [...c.completedStoryArcs, c.currentStoryArc.id]
                : c.completedStoryArcs,
            };
          }),
        };
      });
    },
    [setAppData]
  );

  const updateStoryImages = useCallback(
    (imageUrlMap: Map<string, string>) => {
      setAppData((prev) => {
        if (!prev.activeChildId) return prev;

        return {
          ...prev,
          children: prev.children.map((c) => {
            if (c.id !== prev.activeChildId || !c.currentStoryArc) return c;

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
          }),
        };
      });
    },
    [setAppData]
  );

  const unlockItem = useCallback(
    (
      itemId: string,
      cost: number,
      unlockedKey: 'unlockedPets' | 'unlockedBrushes' | 'unlockedWorlds'
    ): boolean => {
      if (!child || child.points < cost) return false;
      if (child[unlockedKey].includes(itemId)) return false;

      setAppData((prev) => {
        if (!prev.activeChildId) return prev;
        return {
          ...prev,
          children: prev.children.map((c) =>
            c.id === prev.activeChildId
              ? {
                  ...c,
                  points: c.points - cost,
                  [unlockedKey]: [...c[unlockedKey], itemId],
                }
              : c
          ),
        };
      });

      return true;
    },
    [child, setAppData]
  );

  const unlockPet = useCallback(
    (petId: string) => {
      const pet = getPetById(petId);
      return pet ? unlockItem(petId, pet.unlockCost, 'unlockedPets') : false;
    },
    [unlockItem]
  );

  const unlockBrush = useCallback(
    (brushId: string) => {
      const brush = getBrushById(brushId);
      return brush
        ? unlockItem(brushId, brush.unlockCost, 'unlockedBrushes')
        : false;
    },
    [unlockItem]
  );

  const unlockWorld = useCallback(
    (worldId: string) => {
      const world = getWorldById(worldId);
      return world
        ? unlockItem(worldId, world.unlockCost, 'unlockedWorlds')
        : false;
    },
    [unlockItem]
  );

  // Reset current child (delete and switch)
  const resetChild = useCallback(() => {
    if (!child) return;
    deleteChild(child.id);
  }, [child, deleteChild]);

  // Reset all data
  const resetAllData = useCallback(() => {
    removeAppData();
  }, [removeAppData]);

  return (
    <ChildContext.Provider
      value={{
        child,
        isNewUser,
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
        resetChild,
        resetAllData,
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
