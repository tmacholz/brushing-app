// Gemini model ids used by the API functions, in one place so the next
// deprecation is a one-line change.
// Deprecation schedule: https://ai.google.dev/gemini-api/docs/deprecations
//   gemini-2.0-flash-exp-image-generation  shut down 2025-11-14
//   gemini-2.0-flash                        shuts down 2026-06-01

export const GEMINI_TEXT_MODEL = 'gemini-2.5-flash';
export const GEMINI_IMAGE_MODEL = 'gemini-2.5-flash-image';

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

export const GEMINI_TEXT_URL = `${GEMINI_BASE}/${GEMINI_TEXT_MODEL}:generateContent`;
export const GEMINI_IMAGE_URL = `${GEMINI_BASE}/${GEMINI_IMAGE_MODEL}:generateContent`;
