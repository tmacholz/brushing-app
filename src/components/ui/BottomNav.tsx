import { motion } from 'framer-motion';
import { Home, PawPrint, ShoppingBag, Globe, Settings } from 'lucide-react';
import { useAudio } from '../../context/AudioContext';
import type { ScreenName } from '../../types';

interface BottomNavProps {
  currentScreen: ScreenName;
  onNavigate: (screen: ScreenName) => void;
}

interface NavItem {
  screen: ScreenName;
  icon: typeof Home;
  label: string;
}

const navItems: NavItem[] = [
  { screen: 'home', icon: Home, label: 'Home' },
  { screen: 'pet-select', icon: PawPrint, label: 'Pets' },
  { screen: 'shop', icon: ShoppingBag, label: 'Shop' },
  { screen: 'story-world-select', icon: Globe, label: 'Worlds' },
  { screen: 'settings', icon: Settings, label: 'Settings' },
];

export function BottomNav({ currentScreen, onNavigate }: BottomNavProps) {
  const { playSound } = useAudio();

  const handleNavigate = (screen: ScreenName) => {
    if (screen !== currentScreen) {
      playSound('tap');
      onNavigate(screen);
    }
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-2 pb-safe">
      <div className="flex items-center justify-around h-16">
        {navItems.map(({ screen, icon: Icon, label }) => {
          const isActive = currentScreen === screen;

          return (
            <motion.button
              key={screen}
              whileTap={{ scale: 0.9 }}
              onClick={() => handleNavigate(screen)}
              className={`flex flex-col items-center justify-center flex-1 h-full relative ${
                isActive ? 'text-primary' : 'text-gray-400'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="nav-indicator"
                  className="absolute -top-0.5 w-12 h-1 bg-primary rounded-full"
                  transition={{ type: 'spring', damping: 20, stiffness: 300 }}
                />
              )}
              <Icon
                className={`w-6 h-6 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.5]'}`}
              />
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                {label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNav;
