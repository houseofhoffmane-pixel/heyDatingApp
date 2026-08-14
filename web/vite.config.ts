import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  // Absolute base — SPA lives at the root of the domain, deep links like
  // /discover reload to Nest's SPA fallback and still need /assets/*.js.
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      // Proxy API + WS to the Nest backend during dev — no CORS pain.
      '/api': { target: 'http://localhost:3000', changeOrigin: true },
      '/rt':  { target: 'http://localhost:3000', changeOrigin: true, ws: true },
    },
  },
});
