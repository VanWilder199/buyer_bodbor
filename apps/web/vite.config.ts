import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { defineConfig, type Plugin } from 'vite';

/** WEB-11: убрать MSW-воркер из прод-сборки (нужен только в dev с моками). */
function removeMockWorker(): Plugin {
  return {
    name: 'remove-mock-worker',
    apply: 'build',
    closeBundle() {
      const file = path.resolve(__dirname, 'dist/mockServiceWorker.js');
      if (fs.existsSync(file)) fs.rmSync(file, { force: true });
    },
  };
}

/** Короткий git sha для release в Sentry (WEB-15). */
function gitSha(): string {
  try {
    return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
  } catch {
    return 'dev';
  }
}

export default defineConfig({
  define: {
    __APP_RELEASE__: JSON.stringify(gitSha()),
  },
  plugins: [react(), tailwindcss(), removeMockWorker()],
  server: {
    port: 5173,
    proxy: {
      // Бэкенд на 8080: запросы фронта идут на /api/*, префикс срезается
      '/api': { target: 'http://localhost:8080', rewrite: (p) => p.replace(/^\/api/, '') },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});