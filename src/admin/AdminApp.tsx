import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Lock } from 'lucide-react';
import { AdminDashboard } from './screens/AdminDashboard';
import { WorldEditor } from './screens/WorldEditor';
import { StoryEditor } from './screens/StoryEditor';
import { PetAudioManager } from './screens/PetAudioManager';

type AdminScreen = 'dashboard' | 'world-editor' | 'story-editor' | 'pet-audio';

interface AdminState {
  screen: AdminScreen;
  worldId?: string;
  storyId?: string;
}

function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'auth', password }),
      });

      if (res.ok) {
        localStorage.setItem('admin_auth', 'true');
        onLogin();
      } else {
        setError('Invalid password');
      }
    } catch {
      setError('Connection error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-800 flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-cyan-500/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Lock className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-bold text-white">BrushQuest Admin</h1>
          <p className="text-slate-400 mt-1">Content Management</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
              className="w-full px-4 py-3 bg-slate-700/50 border border-slate-600 rounded-xl text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
              autoFocus
            />
          </div>

          {error && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-red-400 text-sm text-center"
            >
              {error}
            </motion.p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-600 text-white font-medium rounded-xl transition-colors"
          >
            {loading ? 'Checking...' : 'Login'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}

export function AdminApp() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [adminState, setAdminState] = useState<AdminState>({ screen: 'dashboard' });

  useEffect(() => {
    // Check if already authenticated
    if (localStorage.getItem('admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
  };

  const navigateTo = (screen: AdminScreen, params?: { worldId?: string; storyId?: string }) => {
    setAdminState({ screen, ...params });
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900">
      <AnimatePresence mode="wait">
        {adminState.screen === 'dashboard' && (
          <motion.div
            key="dashboard"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AdminDashboard
              onSelectWorld={(worldId) => navigateTo('world-editor', { worldId })}
              onPetAudio={() => navigateTo('pet-audio')}
              onLogout={handleLogout}
            />
          </motion.div>
        )}

        {adminState.screen === 'world-editor' && adminState.worldId && (
          <motion.div
            key="world-editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <WorldEditor
              worldId={adminState.worldId}
              onBack={() => navigateTo('dashboard')}
              onSelectStory={(storyId) => navigateTo('story-editor', { storyId, worldId: adminState.worldId })}
            />
          </motion.div>
        )}

        {adminState.screen === 'story-editor' && adminState.storyId && (
          <motion.div
            key="story-editor"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <StoryEditor
              storyId={adminState.storyId}
              onBack={() => adminState.worldId ? navigateTo('world-editor', { worldId: adminState.worldId }) : navigateTo('dashboard')}
            />
          </motion.div>
        )}

        {adminState.screen === 'pet-audio' && (
          <motion.div
            key="pet-audio"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            <PetAudioManager onBack={() => navigateTo('dashboard')} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
