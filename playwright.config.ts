import { defineConfig, devices } from '@playwright/test'
import { E2E_DATABASE_URL } from './e2e/database.ts'

const PORT = 4173
const API_PORT = 3101
const API_URL = `http://127.0.0.1:${API_PORT}`

export default defineConfig({
  testDir: './e2e',
  globalSetup: './e2e/globalSetup.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'mobile', use: { ...devices['Pixel 7'] } }],
  webServer: [
    {
      command: 'node server/src/main.ts',
      url: `${API_URL}/api/v1/health`,
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        PORT: String(API_PORT),
        COOKIE_SECURE: 'false',
      },
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
      url: `http://localhost:${PORT}`,
      env: { API_PROXY_TARGET: API_URL },
      reuseExistingServer: !process.env.CI,
    },
  ],
})
