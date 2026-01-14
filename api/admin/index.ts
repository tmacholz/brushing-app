import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './lib/db.js';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'brushquest-admin';

// Static data for migration
const worlds = [
  { name: 'magical-forest', displayName: 'Magical Forest', description: 'Talking trees and friendly creatures', theme: 'magical-forest', unlockCost: 0, isStarter: true },
  { name: 'space-station', displayName: 'Space Station Omega', description: 'Adventures among the stars', theme: 'space', unlockCost: 0, isStarter: true },
  { name: 'underwater-kingdom', displayName: 'Underwater Kingdom', description: 'Mermaids and sunken treasure', theme: 'underwater', unlockCost: 100, isStarter: false },
  { name: 'dinosaur-valley', displayName: 'Dinosaur Valley', description: 'Time travel to prehistoric times', theme: 'dinosaurs', unlockCost: 150, isStarter: false },
  { name: 'pirate-cove', displayName: 'Pirate Cove', description: 'Treasure maps and sea adventures', theme: 'pirates', unlockCost: 150, isStarter: false },
];

// POST /api/admin - auth or migrate based on action
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { action, password } = req.body;

  // Auth action
  if (action === 'auth' || !action) {
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }
    if (password === ADMIN_PASSWORD) {
      return res.status(200).json({ success: true });
    }
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Migrate action
  if (action === 'migrate') {
    const sql = getDb();
    try {
      const results = { worlds: 0 };
      for (const world of worlds) {
        try {
          await sql`
            INSERT INTO worlds (name, display_name, description, theme, unlock_cost, is_starter, is_published)
            VALUES (${world.name}, ${world.displayName}, ${world.description}, ${world.theme}, ${world.unlockCost}, ${world.isStarter}, true)
            ON CONFLICT (name) DO NOTHING
          `;
          results.worlds++;
        } catch (err) {
          console.log(`World ${world.name} error:`, err);
        }
      }
      return res.status(200).json({ success: true, results });
    } catch (error) {
      return res.status(500).json({ error: 'Migration failed', details: String(error) });
    }
  }

  return res.status(400).json({ error: 'Invalid action' });
}
