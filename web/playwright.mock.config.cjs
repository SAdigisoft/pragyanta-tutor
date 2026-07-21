const { defineConfig } = require('@playwright/test')

const port = Number(process.env.PW_WEB_PORT || 42733)
const url = `http://127.0.0.1:${port}`

module.exports = defineConfig({
  testDir: './e2e',
  testMatch: /mock-submission-capture\.spec\.cjs$/,
  timeout: 30_000,
  webServer: {
    command: `node node_modules/vite/bin/vite.js --host 127.0.0.1 --port ${port} --strictPort`,
    url,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      VITE_USE_MOCKS: 'true',
    },
  },
  use: {
    baseURL: url,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
})
