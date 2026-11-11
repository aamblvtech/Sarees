import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000
      },
      '/uploads': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
        timeout: 120000,
        proxyTimeout: 120000
      }
    }
  }
});


