import type { ToothBrush } from '../types';

export const brushes: ToothBrush[] = [
  {
    id: 'basic-brush',
    name: 'basic-brush',
    displayName: 'Basic Brush',
    description: 'A trusty blue toothbrush',
    imageUrl: '/brushes/basic.png',
    storyPower: 'reliable and steady',
    unlockCost: 0,
    isStarter: true,
  },
  {
    id: 'sparkle-brush',
    name: 'sparkle-brush',
    displayName: 'Sparkle Brush',
    description: 'Leaves a trail of stars',
    imageUrl: '/brushes/sparkle.png',
    storyPower: 'leaves trails of magical starlight',
    unlockCost: 50,
    isStarter: false,
  },
  {
    id: 'bubble-brush',
    name: 'bubble-brush',
    displayName: 'Bubble Brush',
    description: 'Makes magic bubbles',
    imageUrl: '/brushes/bubble.png',
    storyPower: 'creates floating magical bubbles',
    unlockCost: 50,
    isStarter: false,
  },
  {
    id: 'dino-brush',
    name: 'dino-brush',
    displayName: 'Dino Brush',
    description: 'Shaped like a T-Rex',
    imageUrl: '/brushes/dino.png',
    storyPower: 'roars with prehistoric power',
    unlockCost: 75,
    isStarter: false,
  },
  {
    id: 'rainbow-brush',
    name: 'rainbow-brush',
    displayName: 'Rainbow Brush',
    description: 'Paints rainbows as you brush',
    imageUrl: '/brushes/rainbow.png',
    storyPower: 'paints rainbows wherever it goes',
    unlockCost: 100,
    isStarter: false,
  },
];

export const getStarterBrushes = (): ToothBrush[] =>
  brushes.filter((brush) => brush.isStarter);

export const getBrushById = (id: string): ToothBrush | undefined =>
  brushes.find((brush) => brush.id === id);

export default brushes;
