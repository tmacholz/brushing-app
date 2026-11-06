import type { VercelRequest, VercelResponse } from '@vercel/node';
import { checkPassword, clearAuthCookies, getAuth, setAuthCookie, type AuthScope } from '../lib/auth.js';

// POST /api/auth { action: 'login', password, scope: 'device' | 'admin' }
// POST /api/auth { action: 'logout' }
// GET  /api/auth -> { admin, device }
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    return res.status(200).json(getAuth(req));
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action = 'login', password, scope = 'device' } = (req.body ?? {}) as {
    action?: string;
    password?: unknown;
    scope?: string;
  };

  if (action === 'logout') {
    clearAuthCookies(req, res);
    return res.status(200).json({ success: true });
  }

  if (action !== 'login') {
    return res.status(400).json({ error: 'Invalid action' });
  }

  if (scope !== 'admin' && scope !== 'device') {
    return res.status(400).json({ error: 'Invalid scope' });
  }

  if (!process.env.ADMIN_PASSWORD) {
    return res.status(503).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
  }

  if (!checkPassword(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // An admin login also unlocks the device so the same browser can run the kid app.
  const scopes: AuthScope[] = scope === 'admin' ? ['admin', 'device'] : ['device'];
  for (const s of scopes) setAuthCookie(req, res, s);

  return res.status(200).json({ success: true, ...getAuthAfterLogin(scopes) });
}

function getAuthAfterLogin(scopes: AuthScope[]) {
  return { admin: scopes.includes('admin'), device: true };
}
