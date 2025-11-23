import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/matchmake': {
        target: 'http://localhost:2567',
        changeOrigin: true,
        secure: false,
      },
      // Proxy WebSocket connections for room IDs (paths without dots/extensions)
      // This allows the client to connect to ws://localhost:5173/ROOM_ID -> ws://localhost:2567/ROOM_ID
      '^/[^.]+$': {
        target: 'ws://localhost:2567',
        ws: true,
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path // Keep the path intact
      }
    }
  }
});