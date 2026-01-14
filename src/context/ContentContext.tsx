import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { StoryWorld, StoryTemplate } from '../types';
import { worlds as staticWorlds } from '../data/worlds';
import { storyTemplates as staticStoryTemplates } from '../data/starterStories';

interface ContentContextType {
  worlds: StoryWorld[];
  storyTemplates: Record<string, StoryTemplate[]>;
  loading: boolean;
  error: string | null;
  getWorldById: (id: string) => StoryWorld | undefined;
  getStoriesForWorld: (worldId: string) => StoryTemplate[];
  getStoryById: (storyId: string) => StoryTemplate | undefined;
}

const ContentContext = createContext<ContentContextType | null>(null);

export function ContentProvider({ children }: { children: ReactNode }) {
  const [worlds, setWorlds] = useState<StoryWorld[]>(staticWorlds);
  const [storyTemplates, setStoryTemplates] = useState<Record<string, StoryTemplate[]>>(staticStoryTemplates);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchContent() {
      try {
        const res = await fetch('/api/content');
        if (!res.ok) {
          throw new Error('Failed to fetch content');
        }
        const data = await res.json();

        // Merge database content with static content (database takes priority)
        if (data.worlds && data.worlds.length > 0) {
          // Create a map of database worlds by name
          const dbWorldsMap = new Map<string, StoryWorld>(
            data.worlds.map((w: StoryWorld) => [w.name, w])
          );

          // Merge: use database version if exists, otherwise keep static
          const mergedWorlds: StoryWorld[] = staticWorlds.map((staticWorld) => {
            const dbWorld = dbWorldsMap.get(staticWorld.name);
            return dbWorld || staticWorld;
          });

          // Add any new worlds from database that aren't in static
          for (const dbWorld of data.worlds as StoryWorld[]) {
            if (!staticWorlds.find((sw) => sw.name === dbWorld.name)) {
              mergedWorlds.push(dbWorld);
            }
          }

          setWorlds(mergedWorlds);
        }

        if (data.storyTemplates) {
          // Merge story templates similarly
          const mergedTemplates = { ...staticStoryTemplates };

          for (const [worldName, stories] of Object.entries(data.storyTemplates)) {
            if (!mergedTemplates[worldName]) {
              mergedTemplates[worldName] = [];
            }
            // Add database stories, avoiding duplicates by title
            for (const dbStory of stories as StoryTemplate[]) {
              const exists = mergedTemplates[worldName].find((s) => s.title === dbStory.title);
              if (!exists) {
                mergedTemplates[worldName].push(dbStory);
              }
            }
          }

          setStoryTemplates(mergedTemplates);
        }
      } catch (err) {
        console.warn('Failed to fetch content from API, using static data:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch content');
        // Keep using static data on error
      } finally {
        setLoading(false);
      }
    }

    fetchContent();
  }, []);

  const getWorldById = (id: string): StoryWorld | undefined => {
    return worlds.find((w) => w.id === id || w.name === id);
  };

  const getStoriesForWorld = (worldId: string): StoryTemplate[] => {
    const world = getWorldById(worldId);
    if (!world) return [];
    return storyTemplates[world.name] || [];
  };

  const getStoryById = (storyId: string): StoryTemplate | undefined => {
    for (const stories of Object.values(storyTemplates)) {
      const found = stories.find((s) => s.id === storyId);
      if (found) return found;
    }
    return undefined;
  };

  return (
    <ContentContext.Provider
      value={{
        worlds,
        storyTemplates,
        loading,
        error,
        getWorldById,
        getStoriesForWorld,
        getStoryById,
      }}
    >
      {children}
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error('useContent must be used within a ContentProvider');
  }
  return context;
}
