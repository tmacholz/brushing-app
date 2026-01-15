import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { StoryWorld, StoryTemplate } from '../types';

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
  // Start with empty content - all content comes from database
  const [worlds, setWorlds] = useState<StoryWorld[]>([]);
  const [storyTemplates, setStoryTemplates] = useState<Record<string, StoryTemplate[]>>({});
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

        // Use database content directly (no static fallback)
        console.log('[ContentContext] Received data:', data);
        if (data.worlds) {
          console.log('[ContentContext] Worlds:', data.worlds.length);
          setWorlds(data.worlds);
        }

        if (data.storyTemplates) {
          console.log('[ContentContext] Story templates:', data.storyTemplates);
          // Log background music URLs
          for (const stories of Object.values(data.storyTemplates)) {
            for (const story of stories as any[]) {
              console.log(`[ContentContext] Story "${story.title}" backgroundMusicUrl:`, story.backgroundMusicUrl);
            }
          }
          setStoryTemplates(data.storyTemplates);
        }
      } catch (err) {
        console.error('Failed to fetch content from API:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch content');
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
