import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { buildCsp } from './csp.js'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')
  return {
    plugins: [
      react(),
      // Production builds only (the dev server needs inline scripts for hot reload). Switch off with VITE_CSP=off.
      {
        name: 'civicconnect-csp',
        apply: 'build',
        transformIndexHtml() {
          if (String(env.VITE_CSP || '').toLowerCase() === 'off') return []
          const extraConnect = [env.VITE_CLIP_MODEL, env.VITE_CIVIC_MODEL_URL].filter((u) => /^https?:\/\//i.test(u || ''))
          const content = buildCsp({ apiUrl: env.VITE_API_URL || 'http://localhost:4000', extraConnect })
          return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content }, injectTo: 'head-prepend' }]
        },
      },
    ],
    // transformers.js loads its own WebAssembly runtime; letting Vite pre-bundle it breaks that loading.
    optimizeDeps: { exclude: ['@xenova/transformers'] },
  }
})
