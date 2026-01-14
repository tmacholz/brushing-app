import type { VercelRequest, VercelResponse } from '@vercel/node';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'brushquest-admin';

// POST /api/admin/auth - Verify admin password
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ error: 'Password required' });
  }

  if (password === ADMIN_PASSWORD) {
    return res.status(200).json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid password' });
}
