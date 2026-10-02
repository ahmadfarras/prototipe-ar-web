import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const isHttps = mode === 'https'

  return {
    plugins: [react(), tailwindcss(), ...(isHttps ? [basicSsl()] : [])],
    server: { host: isHttps },
    build: {
      // model-viewer bundles three.js; it is lazy-loaded with the product page.
      chunkSizeWarningLimit: 1100,
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
    },
  }
})
