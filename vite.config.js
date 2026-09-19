import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://127.0.0.1:3001',
        ws: true,
      },
    },
  },
  define: {
    // Required for simple-peer and other Node-style packages in the browser
    global: 'globalThis',
  },
  build: {
    // Increase chunk size warning limit — simple-peer is large
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('simple-peer')) {
            return 'simple-peer';
          }
          if (id.includes('node_modules/react/') || id.includes('node_modules/react-dom/') || id.includes('node_modules/react-router-dom/')) {
            return 'react-vendor';
          }
        },
      },
    },
  },
});

