import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Loader2 } from 'lucide-react';
import { loginDevice, registerUnlockHandler } from '../../services/api';

// Shows a parent-password prompt whenever an API call is rejected because this
// device has not been unlocked yet. Mounted once at the app root.
export function UnlockGate() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const resolveRef = useRef<((ok: boolean) => void) | null>(null);

  useEffect(() => {
    registerUnlockHandler(
      () =>
        new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
          setPassword('');
          setError('');
          setOpen(true);
        })
    );
    return () => registerUnlockHandler(null);
  }, []);

  const finish = (ok: boolean) => {
    setOpen(false);
    resolveRef.current?.(ok);
    resolveRef.current = null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || busy) return;
    setBusy(true);
    setError('');
    try {
      const ok = await loginDevice(password);
      if (ok) {
        finish(true);
      } else {
        setError('That password is not right. Try again.');
      }
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-6"
        >
          <motion.form
            onSubmit={handleSubmit}
            initial={{ scale: 0.9, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.9, y: 20 }}
            className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-2xl"
          >
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-center text-text mb-1">Grown-ups only</h2>
            <p className="text-center text-text/60 text-sm mb-5">
              Enter the parent password once to set up BrushQuest on this device.
            </p>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Parent password"
              autoFocus
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none text-lg"
            />
            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
            <button
              type="submit"
              disabled={!password || busy}
              className="w-full mt-4 bg-primary text-white text-lg font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Unlock'}
            </button>
            <button
              type="button"
              onClick={() => finish(false)}
              className="w-full mt-2 text-text/50 text-sm py-2"
            >
              Not now
            </button>
          </motion.form>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
