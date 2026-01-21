import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  BookOpen,
  PawPrint,
  Volume2,
  User,
  Image,
  Sticker,
  LogOut,
  ChevronDown,
  ChevronRight,
  Lock,
  Menu,
  X
} from 'lucide-react';

interface NavSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  items: NavItem[];
}

interface NavItem {
  label: string;
  path: string;
  icon?: React.ReactNode;
}

const navSections: NavSection[] = [
  {
    id: 'content',
    label: 'Content',
    icon: <BookOpen className="w-4 h-4" />,
    items: [
      { label: 'Worlds', path: '/admin/worlds', icon: <Globe className="w-4 h-4" /> },
    ],
  },
  {
    id: 'pets',
    label: 'Pets',
    icon: <PawPrint className="w-4 h-4" />,
    items: [
      { label: 'Manage Pets', path: '/admin/pets', icon: <PawPrint className="w-4 h-4" /> },
      { label: 'Pet Audio', path: '/admin/pets/audio', icon: <Volume2 className="w-4 h-4" /> },
    ],
  },
  {
    id: 'characters',
    label: 'Characters',
    icon: <User className="w-4 h-4" />,
    items: [
      { label: 'Pose Definitions', path: '/admin/characters/poses', icon: <User className="w-4 h-4" /> },
      { label: 'Sprites', path: '/admin/characters/sprites', icon: <Image className="w-4 h-4" /> },
    ],
  },
  {
    id: 'assets',
    label: 'Assets',
    icon: <Sticker className="w-4 h-4" />,
    items: [
      { label: 'Collectibles', path: '/admin/collectibles', icon: <Sticker className="w-4 h-4" /> },
    ],
  },
];

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

function NavSectionComponent({ section, isExpanded, onToggle }: {
  section: NavSection;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const location = useLocation();
  const isActive = section.items.some(item => location.pathname.startsWith(item.path));

  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors text-left ${
          isActive ? 'bg-slate-700/50 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}
      >
        {section.icon}
        <span className="flex-1 font-medium text-sm">{section.label}</span>
        {isExpanded ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pl-4 pt-1 space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                      isActive
                        ? 'bg-cyan-500/20 text-cyan-300'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                    }`
                  }
                >
                  {item.icon}
                  <span>{item.label}</span>
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function AdminLayout() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['content', 'pets', 'characters', 'assets']));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (localStorage.getItem('admin_auth') === 'true') {
      setIsAuthenticated(true);
    }
  }, []);

  // Auto-expand section based on current route
  useEffect(() => {
    const currentSection = navSections.find(section =>
      section.items.some(item => location.pathname.startsWith(item.path))
    );
    if (currentSection) {
      setExpandedSections(prev => new Set([...prev, currentSection.id]));
    }
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('admin_auth');
    setIsAuthenticated(false);
    navigate('/admin');
  };

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={() => setIsAuthenticated(true)} />;
  }

  return (
    <div className="min-h-screen bg-slate-900 flex">
      {/* Mobile sidebar toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-800 rounded-lg text-white"
      >
        {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            {/* Mobile overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/50 z-30"
              onClick={() => setSidebarOpen(false)}
            />

            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed lg:static inset-y-0 left-0 z-40 w-64 bg-slate-800/50 border-r border-slate-700/50 flex flex-col"
            >
              {/* Logo */}
              <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-xl flex items-center justify-center">
                    <Globe className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold text-white">BrushQuest</h1>
                    <p className="text-xs text-slate-400">Admin Panel</p>
                  </div>
                </div>
              </div>

              {/* Navigation */}
              <nav className="flex-1 p-3 overflow-y-auto">
                {navSections.map((section) => (
                  <NavSectionComponent
                    key={section.id}
                    section={section}
                    isExpanded={expandedSections.has(section.id)}
                    onToggle={() => toggleSection(section.id)}
                  />
                ))}
              </nav>

              {/* Footer */}
              <div className="p-3 border-t border-slate-700/50">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-slate-800/50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm">Logout</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main content */}
      <main className="flex-1 min-h-screen lg:ml-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
