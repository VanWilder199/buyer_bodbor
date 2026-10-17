import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
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

export default defineConfig({
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