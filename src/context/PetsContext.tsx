import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { Pet } from '../types';
import { pets as staticPets } from '../data/pets';

interface PetsContextType {
  pets: Pet[];
  loading: boolean;
  error: string | null;
  getStarterPets: () => Pet[];
  getPetById: (id: string) => Pet | undefined;
  refetch: () => Promise<void>;
}

const PetsContext = createContext<PetsContextType | undefined>(undefined);

export function PetsProvider({ children }: { children: ReactNode }) {
  const [pets, setPets] = useState<Pet[]>(staticPets);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/pets');
      if (!res.ok) throw new Error('Failed to fetch pets');
      const data = await res.json();
      setPets(data.pets);
    } catch (err) {
      console.error('Error fetching pets, using static fallback:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch pets');
      // Keep using static pets as fallback
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPets();
  }, [fetchPets]);

  const getStarterPets = useCallback(() => {
    return pets.filter((pet) => pet.isStarter);
  }, [pets]);

  const getPetById = useCallback(
    (id: string) => {
      return pets.find((pet) => pet.id === id || pet.name === id);
    },
    [pets]
  );

  return (
    <PetsContext.Provider
      value={{
        pets,
        loading,
        error,
        getStarterPets,
        getPetById,
        refetch: fetchPets,
      }}
    >
      {children}
    </PetsContext.Provider>
  );
}

export function usePets() {
  const context = useContext(PetsContext);
  if (context === undefined) {
    throw new Error('usePets must be used within a PetsProvider');
  }
  return context;
}

export default PetsContext;
