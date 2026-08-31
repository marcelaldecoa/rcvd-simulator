/**
 * Browser-only dev server for the renderer, so the labs can be iterated on
 * without launching Electron. The docs folder is served statically to stand in
 * for the preload bridge.
 */
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: resolve('src/renderer'),
  publicDir: resolve('docs'),
  // Own cache dir so it never collides with electron-vite's pre-bundle.
  cacheDir: resolve('node_modules/.vite-web'),
  plugins: [react()],
  resolve: {
    alias: {
      '@': resolve('src/renderer/src'),
      '@core': resolve('src/core'),
      '@telemetry': resolve('src/telemetry')
    }
  },
  server: { port: 5199, strictPort: true }
})
