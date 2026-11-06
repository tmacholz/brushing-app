# BrushQuest

Kids' toothbrushing app: a Vite + React frontend with Vercel serverless functions in `api/`.

## Setup

`npm install`, then create `.env.local` with:

| Variable | Required | Purpose |
| --- | --- | --- |
| `ADMIN_PASSWORD` | yes | Parent password. Unlocks the kid app on each device (long-lived cookie) and the `/admin` tools (12-hour cookie). The API refuses writes until it is set. |
| `DATABASE_URL` | yes | Neon Postgres connection string |
| `BLOB_READ_WRITE_TOKEN` | yes | Vercel Blob store for images and audio |
| `GEMINI_API_KEY` | for generation | Story text, images, and narration (text-to-speech) |
| `ELEVENLABS_API_KEY` | for music | Background music only |
| `GEMINI_TEXT_MODEL` | no | Override the story text model (default `gemini-2.5-flash-lite`; see `lib/models.ts`) |
| `GEMINI_TEXT_FALLBACK_MODEL` | no | Text model used if the primary returns 404 (default `gemini-3.1-flash-lite`) |
| `GEMINI_IMAGE_MODEL` | no | Override the image model (default `gemini-3.1-flash-lite-image`) |
| `GEMINI_TTS_MODEL` | no | Override the narration model (default `gemini-3.8-flash-tts`) |
| `GEMINI_TTS_VOICE` | no | Override the narration voice (default `Kore`) |
| `ALLOWED_IMAGE_HOSTS` | no | Comma-separated extra hosts the server may fetch reference images from (the Vercel Blob host is always allowed) |

`npm run dev` serves the app and the `api/` functions on http://localhost:5173 without a Vercel login.

Database changes live in `lib/migrations/` and are applied by hand (Neon SQL editor), in order. The latest is `012_child_progress_fields.sql`.

---

# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
