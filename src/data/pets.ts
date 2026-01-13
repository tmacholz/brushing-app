import type { Pet } from '../types';

export const pets: Pet[] = [
  {
    id: 'sparkle',
    name: 'sparkle',
    displayName: 'Sparkle',
    description: 'A cheerful star who fell from the sky',
    imageUrl: '/pets/sparkle.png',
    storyPersonality: 'brave and optimistic',
    unlockCost: 0,
    isStarter: true,
  },
  {
    id: 'bubbles',
    name: 'bubbles',
    displayName: 'Bubbles',
    description: 'A giggly fish who learned to float in air',
    imageUrl: '/pets/bubbles.png',
    storyPersonality: 'silly and curious',
    unlockCost: 0,
    isStarter: true,
  },
  {
    id: 'cosmo',
    name: 'cosmo',
    displayName: 'Cosmo',
    description: 'A mini robot from the future',
    imageUrl: '/pets/cosmo.png',
    storyPersonality: 'smart and helpful',
    unlockCost: 75,
    isStarter: false,
  },
  {
    id: 'fern',
    name: 'fern',
    displayName: 'Fern',
    description: 'A tiny forest dragon',
    imageUrl: '/pets/fern.png',
    storyPersonality: 'shy but fierce',
    unlockCost: 100,
    isStarter: false,
  },
  {
    id: 'captain-whiskers',
    name: 'captain-whiskers',
    displayName: 'Captain Whiskers',
    description: 'A cat who dreams of sailing',
    imageUrl: '/pets/captain-whiskers.png',
    storyPersonality: 'dramatic and bold',
    unlockCost: 150,
    isStarter: false,
  },
];

export const getStarterPets = (): Pet[] => pets.filter((pet) => pet.isStarter);

export const getPetById = (id: string): Pet | undefined =>
  pets.find((pet) => pet.id === id);

export default pets;
