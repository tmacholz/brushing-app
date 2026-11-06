// Gemini model ids used by the API functions, in one place so the next
// deprecation or price change is a one-line change. Each can be overridden
// with an environment variable so a model can be swapped without a deploy.
//
// Pricing and deprecations (checked 2026-11-06):
//   https://ai.google.dev/gemini-api/docs/pricing
//   https://ai.google.dev/gemini-api/docs/deprecations
//
// Text (story/world/character JSON, a few thousand tokens per call):
//   gemini-2.5-flash-lite   $0.10 in / $0.40 out per 1M, thinking off by default
//   gemini-3.1-flash-lite   $0.25 / $1.50, shuts down 2027-05-07 -> 3.5-flash-lite
//   gemini-2.5-flash        $0.30 / $2.50 plus billed thinking tokens (previous default)
// Image (one picture per call, ~1K):
//   gemini-3.1-flash-lite-image  ~$0.034 per image; Google's named replacement for
//   gemini-2.5-flash-image       ~$0.039 per image, shuts down 2027-03-15

export const GEMINI_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL || 'gemini-2.5-flash-lite';
// Used once if the primary text model is not available to this API key
// (Google limits the 2.5 models to accounts that used them before).
export const GEMINI_TEXT_FALLBACK_MODEL =
  process.env.GEMINI_TEXT_FALLBACK_MODEL || 'gemini-3.1-flash-lite';
export const GEMINI_IMAGE_MODEL =
  process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-lite-image';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export function geminiGenerateUrl(model: string): string {
  return `${GEMINI_BASE}/${model}:generateContent`;
}

export const GEMINI_TEXT_URL = geminiGenerateUrl(GEMINI_TEXT_MODEL);
export const GEMINI_TEXT_FALLBACK_URL = geminiGenerateUrl(GEMINI_TEXT_FALLBACK_MODEL);
export const GEMINI_IMAGE_URL = geminiGenerateUrl(GEMINI_IMAGE_MODEL);

/**
 * Extra generationConfig for text calls. The 2.5 models accept a thinking
 * budget; 0 turns thinking off so we are not billed for reasoning tokens on
 * a children's story. Newer models use thinkingLevel and reject a budget, so
 * nothing is sent for them.
 */
export function geminiTextThinkingConfig(model: string): Record<string, unknown> {
  return model.startsWith('gemini-2.5-') ? { thinkingConfig: { thinkingBudget: 0 } } : {};
}
