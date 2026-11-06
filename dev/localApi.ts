// Local runner for the /api functions, used only by `npm run dev`.
//
// On Vercel, every file in /api is deployed as a serverless function. Locally,
// running those functions normally needs `vercel dev`, which in turn needs the
// machine to be signed in to the Vercel account that owns the project. This
// Vite plugin serves the same /api files straight from the Vite dev server
// instead, so the app runs fully on any machine that has a .env.local.
//
// It is applied only to the dev server (`apply: 'serve'`), so production
// builds and Vercel deployments never include or use it.

import fs from 'node:fs';
import path from 'node:path';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { loadEnv, type Plugin, type ViteDevServer } from 'vite';

type Handler = (req: unknown, res: unknown) => unknown;

interface Route {
  file: string;
  pattern: RegExp;
  params: string[];
}

// Build a route table from the files in /api, mirroring Vercel's file routing:
// api/pets.ts -> /api/pets, api/admin/index.ts -> /api/admin,
// api/admin/worlds/[id].ts -> /api/admin/worlds/:id
function buildRoutes(apiDir: string): Route[] {
  const routes: Route[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!/\.(ts|js)$/.test(entry.name)) continue;
      const rel = path.relative(apiDir, full).replace(/\\/g, '/').replace(/\.(ts|js)$/, '');
      const segments = rel.split('/');
      if (segments[segments.length - 1] === 'index') segments.pop();
      const params: string[] = [];
      const regex = segments
        .map((seg) => {
          const m = seg.match(/^\[(.+)\]$/);
          if (m) {
            params.push(m[1]);
            return '([^/]+)';
          }
          return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        })
        .join('/');
      routes.push({ file: full, pattern: new RegExp(`^/api${regex ? '/' + regex : ''}/?$`), params });
    }
  };
  walk(apiDir);
  // Fixed paths win over [param] paths, as on Vercel.
  return routes.sort((a, b) => a.params.length - b.params.length);
}

function readBody(req: IncomingMessage): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c: Buffer) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function parseBody(raw: Buffer, contentType: string): unknown {
  if (raw.length === 0) return undefined;
  const text = raw.toString('utf8');
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  if (contentType.startsWith('text/')) return text;
  return raw;
}

// Add the Vercel-style helpers (status, json, send) to Node's response.
function decorateResponse(res: ServerResponse) {
  const r = res as ServerResponse & Record<string, unknown>;
  r.status = (code: number) => {
    res.statusCode = code;
    return r;
  };
  r.json = (data: unknown) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(data));
    return r;
  };
  r.send = (data: unknown) => {
    if (Buffer.isBuffer(data) || typeof data === 'string') {
      res.end(data);
    } else {
      (r.json as (d: unknown) => unknown)(data);
    }
    return r;
  };
  r.redirect = (a: number | string, b?: string) => {
    res.statusCode = typeof a === 'number' ? a : 307;
    res.setHeader('Location', typeof a === 'number' ? (b ?? '/') : a);
    res.end();
    return r;
  };
  return r;
}

export function localApi(): Plugin {
  let server: ViteDevServer;
  return {
    name: 'local-api',
    apply: 'serve',
    configureServer(s) {
      server = s;
      // Make .env, .env.local etc. visible to the functions as process.env,
      // the way Vercel provides them.
      const env = loadEnv(s.config.mode, s.config.root, '');
      for (const [k, v] of Object.entries(env)) {
        if (process.env[k] === undefined) process.env[k] = v;
      }

      const apiDir = path.join(s.config.root, 'api');

      s.middlewares.use(async (req, res, next) => {
        if (!req.url || !req.url.startsWith('/api')) return next();
        const url = new URL(req.url, 'http://localhost');
        const route = buildRoutes(apiDir).find((r) => r.pattern.test(url.pathname));
        if (!route) return next();

        try {
          const match = url.pathname.match(route.pattern)!;
          const query: Record<string, string | string[]> = {};
          for (const [k, v] of url.searchParams) {
            const prev = query[k];
            query[k] = prev === undefined ? v : Array.isArray(prev) ? [...prev, v] : [prev, v];
          }
          route.params.forEach((p, i) => {
            query[p] = decodeURIComponent(match[i + 1]);
          });

          const raw = await readBody(req);
          const vreq = Object.assign(req, {
            query,
            cookies: {},
            body: parseBody(raw, String(req.headers['content-type'] ?? '')),
          });
          const vres = decorateResponse(res);

          const mod = await server.ssrLoadModule(route.file);
          const handler = mod.default as Handler | undefined;
          if (typeof handler !== 'function') {
            res.statusCode = 500;
            res.end(`No default export in ${path.relative(s.config.root, route.file)}`);
            return;
          }
          await handler(vreq, vres);
        } catch (err) {
          server.ssrFixStacktrace(err as Error);
          console.error(`[local-api] ${req.method} ${url.pathname} failed:`, err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: (err as Error).message }));
          }
        }
      });
    },
  };
}
