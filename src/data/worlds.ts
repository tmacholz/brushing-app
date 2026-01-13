import type { StoryWorld } from '../types';

export const worlds: StoryWorld[] = [
  {
    id: 'magical-forest',
    name: 'magical-forest',
    displayName: 'Magical Forest',
    description: 'Talking trees and friendly creatures',
    theme: 'magical-forest',
    backgroundImageUrl: '/worlds/magical-forest.png',
    unlockCost: 0,
    isStarter: true,
  },
  {
    id: 'space-station',
    name: 'space-station',
    displayName: 'Space Station Omega',
    description: 'Adventures among the stars',
    theme: 'space',
    backgroundImageUrl: '/worlds/space-station.png',
    unlockCost: 0,
    isStarter: true,
  },
  {
    id: 'underwater-kingdom',
    name: 'underwater-kingdom',
    displayName: 'Underwater Kingdom',
    description: 'Mermaids and sunken treasure',
    theme: 'underwater',
    backgroundImageUrl: '/worlds/underwater.png',
    unlockCost: 100,
    isStarter: false,
  },
  {
    id: 'dinosaur-valley',
    name: 'dinosaur-valley',
    displayName: 'Dinosaur Valley',
    description: 'Time travel to prehistoric times',
    theme: 'dinosaurs',
    backgroundImageUrl: '/worlds/dinosaur.png',
    unlockCost: 150,
    isStarter: false,
  },
  {
    id: 'pirate-cove',
    name: 'pirate-cove',
    displayName: 'Pirate Cove',
    description: 'Treasure maps and sea adventures',
    theme: 'pirates',
    backgroundImageUrl: '/worlds/pirate.png',
    unlockCost: 150,
    isStarter: false,
  },
];

export const getStarterWorlds = (): StoryWorld[] =>
  worlds.filter((world) => world.isStarter);

export const getWorldById = (id: string): StoryWorld | undefined =>
  worlds.find((world) => world.id === id);

export default worlds;
