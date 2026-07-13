import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  workers: 1,
  // 2 reintentos por spec: solo alerta si falla 3 veces seguidas en la misma
  // corrida (absorbe blips de red/Cloudflare sin taparse una caída real).
  retries: 2,
  timeout: 60_000,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'https://global-dt.com',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
