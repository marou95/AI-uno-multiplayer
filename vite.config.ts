// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true, 

    proxy: {
      // Proxy pour les requêtes HTTP de matchmaking (AJAX)
      "/matchmake": {
        target: "http://localhost:2567",
        changeOrigin: true,
        secure: false,
      },

      // Proxy générique pour WebSocket
      // Capture tout ce qui commence par /uno (ex: /uno/HGS72)
      "/uno": {
        target: "ws://localhost:2567",
        ws: true,
        changeOrigin: true,
        secure: false,
      }
    },
  },
});