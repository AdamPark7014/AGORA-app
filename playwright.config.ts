import { existsSync } from 'node:fs';

import { defineConfig, devices } from '@playwright/test';

/**
 * Pruebas de extremo a extremo contra la app real.
 *
 * No levanta servidores: se asume `pnpm dev` corriendo. Levantarlos aqui
 * duplicaria la base de datos de desarrollo y las pruebas dejarian de reflejar
 * lo que el usuario ve.
 *
 * El `.env` se carga aqui porque las pruebas calculan el hash del OTP con
 * SESSION_SECRET, y `npx playwright test` no hereda nada del `.env` del
 * proyecto: sin esto la suite falla segun desde donde la lances. No pisa lo
 * que ya venga en el entorno, asi que CI sigue mandando.
 */
if (existsSync('.env')) process.loadEnvFile('.env');
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [['list']],
  use: {
    baseURL: process.env.WEB_URL ?? 'http://localhost:3200',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
