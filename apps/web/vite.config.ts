import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
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