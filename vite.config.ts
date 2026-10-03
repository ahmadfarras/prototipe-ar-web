import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig(({ mode }) => {
  const isHttps = mode === 'https'
  const proxy = {
    '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
  }

  return {
    plugins: [react(), tailwindcss(), ...(isHttps ? [basicSsl()] : [])],
    server: { host: isHttps, proxy },
    preview: { proxy },
    build: {
      // The scanner chunk bundles MindAR with TensorFlow.js; like the
      // model-viewer chunk it is lazy-loaded with its page.
      chunkSizeWarningLimit: 1300,
    },
    test: {
      projects: [
        {
          extends: true,
          test: {
            name: 'web',
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.mjs'],
          },
        },
        {
          test: {
            name: 'server',
            environment: 'node',
            include: ['server/src/**/*.test.ts'],
          },
        },
        {
          test: {
            name: 'server-db',
            environment: 'node',
            include: ['server/test/**/*.test.ts'],
            globalSetup: ['./server/test/globalSetup.ts'],
            // Every file resets the same database.
            fileParallelism: false,
          },
        },
      ],
    },
  }
})
