// fetch wrapper for the kid-facing app.
//
// The API requires a signed "device" cookie that is issued once per device
// with the parent password. When a request comes back 401, the unlock prompt
// (see UnlockGate) is shown, and the request is retried after a successful
// unlock. Several concurrent 401s share one prompt.

type UnlockHandler = () => Promise<boolean>;

let unlockHandler: UnlockHandler | null = null;
let pendingUnlock: Promise<boolean> | null = null;

export function registerUnlockHandler(handler: UnlockHandler | null) {
  unlockHandler = handler;
}

async function requestUnlock(): Promise<boolean> {
  if (!unlockHandler) return false;
  if (!pendingUnlock) {
    pendingUnlock = unlockHandler().finally(() => {
      pendingUnlock = null;
    });
  }
  return pendingUnlock;
}

export async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);
  if (res.status === 401) {
    const unlocked = await requestUnlock();
    if (unlocked) {
      res = await fetch(input, init);
    }
  }
  return res;
}

export async function loginDevice(password: string, scope: 'device' | 'admin' = 'device'): Promise<boolean> {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'login', password, scope }),
  });
  return res.ok;
}

export async function getAuthStatus(): Promise<{ admin: boolean; device: boolean }> {
  try {
    const res = await fetch('/api/auth');
    if (!res.ok) return { admin: false, device: false };
    return await res.json();
  } catch {
    return { admin: false, device: false };
  }
}

export async function logout(): Promise<void> {
  await fetch('/api/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'logout' }),
  });
}
