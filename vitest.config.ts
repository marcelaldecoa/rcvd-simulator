import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: { alias: { '@core': resolve('src/core'), '@telemetry': resolve('src/telemetry') } },
  test: { include: ['src/**/*.test.ts'], environment: 'node' }
})
