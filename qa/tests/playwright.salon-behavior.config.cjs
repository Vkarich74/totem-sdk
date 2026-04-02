const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: '.',
  testMatch: [
    '**/salon-behavior-audit.spec.cjs',
    '**/salon-full-audit.spec.cjs'
  ],
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: 'line',
  use: {
    baseURL: process.env.TOTEM_QA_BASE || 'http://localhost:5173',
    browserName: 'chromium',
    channel: 'msedge',
    headless: true,
    trace: 'off',
    screenshot: 'off',
    video: 'off'
  }
});