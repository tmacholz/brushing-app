// Server-side auth for the API functions.
//
// Two scopes, both unlocked with the parent password (ADMIN_PASSWORD):
//   - "device": the kid-facing app on a phone or tablet. Long-lived cookie set
//     once per device so children can brush without seeing a password prompt.
//   - "admin": the /admin content tools. Short-lived cookie.
// An admin cookie satisfies a device check. Tokens are HMAC-signed with a key
// derived from the password, so changing the password logs every device out.

import { createHmac, createHash, timingSafeEqual } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';

export type AuthScope = 'admin' | 'device';

const COOKIE_NAMES: Record<AuthScope, string> = {
  admin: 'bq_admin',
  device: 'bq_device',
};

const TOKEN_TTL_MS: Record<AuthScope, number> = {
  admin: 12 * 60 * 60 * 1000, // 12 hours
  device: 365 * 24 * 60 * 60 * 1000, // 1 year
};

type Req = Pick<IncomingMessage, 'headers'>;
type Res = Pick<ServerResponse, 'setHeader' | 'getHeader'> & {
  status: (code: number) => { json: (body: unknown) => unknown };
};

function getPassword(): string | null {
  const password = process.env.ADMIN_PASSWORD;
  return password && password.length > 0 ? password : null;
}

function getSigningKey(): Buffer | null {
  const password = getPassword();
  if (!password) return null;
  return createHash('sha256').update(`brushquest-auth:${password}`).digest();
}

function sign(payload: string, key: Buffer): string {
  return createHmac('sha256', key).update(payload).digest('base64url');
}

function parseCookies(req: Req): Record<string, string> {
  const header = req.headers.cookie;
  if (!header) return {};
  const out: Record<string, string> = {};
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    const value = part.slice(idx + 1).trim();
    if (name) out[name] = decodeURIComponent(value);
  }
  return out;
}

/** Constant-time password comparison. Returns false when no password is configured. */
export function checkPassword(candidate: unknown): boolean {
  const expected = getPassword();
  if (!expected || typeof candidate !== 'string') return false;
  const a = Buffer.from(candidate);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function createToken(scope: AuthScope): string | null {
  const key = getSigningKey();
  if (!key) return null;
  const exp = Date.now() + TOKEN_TTL_MS[scope];
  const payload = `${scope}.${exp}`;
  return `${payload}.${sign(payload, key)}`;
}

function verifyToken(token: string | undefined, scope: AuthScope): boolean {
  if (!token) return false;
  const key = getSigningKey();
  if (!key) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [tokenScope, expStr, sig] = parts;
  if (tokenScope !== scope) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  const expected = sign(`${tokenScope}.${expStr}`, key);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Scopes the request currently holds, from its cookies. */
export function getAuth(req: Req): { admin: boolean; device: boolean } {
  const cookies = parseCookies(req);
  const admin = verifyToken(cookies[COOKIE_NAMES.admin], 'admin');
  const device = admin || verifyToken(cookies[COOKIE_NAMES.device], 'device');
  return { admin, device };
}

function isLocalhost(req: Req): boolean {
  const host = String(req.headers.host ?? '');
  return host.startsWith('localhost') || host.startsWith('127.0.0.1');
}

function appendSetCookie(res: Res, cookie: string) {
  const existing = res.getHeader('Set-Cookie');
  const list = Array.isArray(existing) ? existing : existing ? [String(existing)] : [];
  res.setHeader('Set-Cookie', [...list, cookie]);
}

/** Issue a cookie for the scope. Returns false when ADMIN_PASSWORD is not configured. */
export function setAuthCookie(req: Req, res: Res, scope: AuthScope): boolean {
  const token = createToken(scope);
  if (!token) return false;
  const secure = isLocalhost(req) ? '' : '; Secure';
  const maxAge = Math.floor(TOKEN_TTL_MS[scope] / 1000);
  appendSetCookie(
    res,
    `${COOKIE_NAMES[scope]}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
  );
  return true;
}

export function clearAuthCookies(req: Req, res: Res) {
  const secure = isLocalhost(req) ? '' : '; Secure';
  for (const name of Object.values(COOKIE_NAMES)) {
    appendSetCookie(res, `${name}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`);
  }
}

/**
 * Guard a handler. Sends a 401 (or 503 when the server has no password set)
 * and returns false when the request is not allowed; otherwise returns true.
 */
export function requireAuth(req: Req, res: Res, scope: AuthScope): boolean {
  if (!getPassword()) {
    res.status(503).json({ error: 'ADMIN_PASSWORD is not configured on the server' });
    return false;
  }
  const auth = getAuth(req);
  const ok = scope === 'admin' ? auth.admin : auth.device;
  if (!ok) {
    res.status(401).json({ error: 'Unauthorized', scope });
    return false;
  }
  return true;
}

/** Cookie header to forward when an API function calls another API function. */
export function forwardAuthHeaders(req: Req): Record<string, string> {
  const cookie = req.headers.cookie;
  return cookie ? { cookie } : {};
}
