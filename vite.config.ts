import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { localApi } from './dev/localApi'

// https://vite.dev/config/
export default defineConfig({
  // localApi serves the /api functions during `npm run dev` only (see dev/localApi.ts).
  plugins: [react(), tailwindcss(), localApi()],
})
