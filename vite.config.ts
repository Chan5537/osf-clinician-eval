import path from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// GitHub Pages serves a project site under /<repo>/, so the build must use a
// matching base path. CI passes VITE_BASE; the default matches the `osf-clinician-eval`
// repo for local production preview. Both slashes are required.
// Strip the un-blinding key out of the CLINICIAN bundle.
//
// `responses[i].arm` says which system wrote each blinded letter. ArmBadge only
// renders it behind the dev reveal switch, but the VALUE still shipped inside
// demo-cases.generated.json — and this repo is public, so before this plugin the
// deployed bundle exposed the answer key to anyone who opened devtools.
//
// Removing it at build time makes the blinding structural rather than cosmetic.
// Safe to drop because attribution now lives server-side in batch_response
// (seeded from supabase/<batch>_arm_key.csv) — SEED THAT FIRST.
function stripArmKey(): Plugin {
  return {
    name: 'strip-arm-key',
    // 'pre' so this runs BEFORE Vite's builtin JSON plugin — the file is still raw
    // JSON at this point, not yet an ES module. Running after would mean parsing
    // whatever module form the bundler chose, which is brittle.
    enforce: 'pre',
    apply: 'build',
    transform(code, id) {
      if (process.env.VITE_APP_MODE !== 'clinician') return null
      if (!id.includes('demo-cases.generated.json')) return null
      const data = JSON.parse(code)
      let stripped = 0
      for (const c of data) {
        for (const r of c.responses ?? []) {
          if ('arm' in r) {
            delete r.arm
            stripped++
          }
        }
      }
      // Loud, because silence here means the answer key shipped.
      console.log(`[strip-arm-key] removed ${stripped} arm value(s) from the clinician bundle`)
      return { code: JSON.stringify(data), map: null }
    },
  }
}

export default defineConfig({
  base: process.env.VITE_BASE ?? '/osf-clinician-eval/',
  plugins: [react(), tailwindcss(), stripArmKey()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
