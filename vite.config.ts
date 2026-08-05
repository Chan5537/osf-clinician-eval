import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub Pages serves a project site under /<repo>/, so the build must use a
// matching base path. CI passes VITE_BASE; the default matches the `osf-clinician-eval`
// repo for local production preview. Both slashes are required.
export default defineConfig({
  base: process.env.VITE_BASE ?? '/osf-clinician-eval/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
