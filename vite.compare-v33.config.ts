// TEMPORARY - side-by-side v33 comparison only. Safe to delete.
// Identical to vite.config.ts plus a private cacheDir, so this server's
// optimized-deps cache is not clobbered by the second server that shares
// this same node_modules via a symlink.
import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/osf-clinician-eval/',
  cacheDir: '/private/tmp/claude-501/-Users-chanyeong-Desktop-Research-UCLA-Health-Intelligence-Lab-sleep-foundation-model/b973e305-8ca7-4dd7-90c8-01f635592fad/scratchpad/cache-v33',
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
