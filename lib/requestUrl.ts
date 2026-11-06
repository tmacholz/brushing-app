import type { IncomingMessage } from 'node:http';

/**
 * Base URL for an API function to call another API function on the same
 * deployment. Uses VERCEL_URL on Vercel, otherwise the incoming Host header,
 * so it works under `vercel dev` (3000) and the Vite local runner (5173).
 */
export function getApiBaseUrl(req: Pick<IncomingMessage, 'headers'>): string {
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  const host = req.headers.host || 'localhost:5173';
  const proto = String(req.headers['x-forwarded-proto'] ?? 'http');
  return `${proto}://${host}`;
}
