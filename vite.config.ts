import tailwindcss from '@tailwindcss/vite'
import basicSsl from '@vitejs/plugin-basic-ssl'
import react from '@vitejs/plugin-react'
import type { Connect, Plugin } from 'vite'
import { defineConfig } from 'vitest/config'

// Vite's static server does not know .usdz; AR Quick Look expects this type.
// deploy/nginx.conf does the same in production.
const setUsdzType: Connect.NextHandleFunction = (request, response, next) => {
  if (request.url?.split('?')[0].endsWith('.usdz')) {
    response.setHeader('Content-Type', 'model/vnd.usdz+zip')
  }
  next()
}

const usdzContentType: Plugin = {
  name: 'usdz-content-type',
  configureServer: (server) => void server.middlewares.use(setUsdzType),
  configurePreviewServer: (server) => void server.middlewares.use(setUsdzType),
}

export default defineConfig(({ mode }) => {
  const isHttps = mode === 'https'
  const proxy = {
    '/api': process.env.API_PROXY_TARGET ?? 'http://localhost:3000',
  }

  return {
    plugins: [
      react(),
      tailwindcss(),
      usdzContentType,
      ...(isHttps ? [basicSsl()] : []),
    ],
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
