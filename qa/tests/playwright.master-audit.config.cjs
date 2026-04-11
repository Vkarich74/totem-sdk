const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: ['auth-flow.spec.cjs'],
  timeout: 60000,
  expect: {
    timeout: 10000,
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: {
    baseURL: process.env.TOTEM_QA_BASE || 'http://localhost:5173',
    headless: true,
    ignoreHTTPSErrors: true,
    viewport: { width: 1440, height: 1100 },
    actionTimeout: 15000,
    navigationTimeout: 30000,
    trace: 'off',
    screenshot: 'off',
    video: 'off',
  },
});