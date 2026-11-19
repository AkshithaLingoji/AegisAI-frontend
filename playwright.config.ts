import { defineConfig, devices } from '@playwright/test'

// By default Playwright uses its own downloaded Chromium (`pnpm exec playwright install chromium`).
// Set CHROME_PATH to use an installed Chrome instead. Set PW_NO_SANDBOX=1 only in
// containers/CI that cannot run Chrome's sandbox; it is off by default.
const executablePath = process.env.CHROME_PATH || undefined
const args = process.env.PW_NO_SANDBOX === '1' ? ['--no-sandbox'] : []

const MOCK_URL = 'http://127.0.0.1:5173'
const BACKEND_MODE_URL = 'http://127.0.0.1:5174'

export default defineConfig({
  testDir: 'tests/e2e',
  fullyParallel: true,
  reporter: [['list']],
  use: {
    launchOptions: { ...(executablePath ? { executablePath } : {}), args },
  },
  webServer: [
    {
      command: 'corepack pnpm@10 exec vite --host 127.0.0.1 --port 5173 --strictPort',      url: MOCK_URL,
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      // Same app, built to use the (not yet connected) backend adapters.
      command: 'corepack pnpm@10 exec vite --host 127.0.0.1 --port 5174 --strictPort',      url: BACKEND_MODE_URL,
      env: { VITE_AEGIS_SOURCE: 'backend' },
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
  projects: [
    {
      name: 'desktop',
      testIgnore: /backend-mode/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: MOCK_URL,
      },
    },
    {
      name: 'mobile',
      testIgnore: /backend-mode/,
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 390, height: 844 },
        baseURL: MOCK_URL,
      },
    },
    {
      name: 'backend-mode',
      testMatch: /backend-mode/,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
        baseURL: BACKEND_MODE_URL,
      },
    },
  ],
})
