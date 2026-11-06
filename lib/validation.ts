// Input validation shared by the API functions.

/**
 * Ids and other values that end up inside a Vercel Blob key or a URL path.
 * UUIDs, slugs, and timestamps all match; path separators and dots do not,
 * so a caller cannot write outside the intended prefix or overwrite another
 * record's asset.
 */
export function isSafeKeyPart(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(value);
}

/** Hosts the server is allowed to fetch images from (for Gemini reference images). */
function allowedImageHosts(): string[] {
  const extra = (process.env.ALLOWED_IMAGE_HOSTS ?? '')
    .split(',')
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  return extra;
}

/**
 * True when the URL points at our Vercel Blob store (or a host listed in
 * ALLOWED_IMAGE_HOSTS). Everything else, including localhost and private
 * addresses, is refused so the generate endpoint cannot be used for SSRF.
 */
export function isAllowedImageUrl(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== 'https:') return false;
  const host = url.hostname.toLowerCase();
  if (host.endsWith('.public.blob.vercel-storage.com')) return true;
  return allowedImageHosts().includes(host);
}
