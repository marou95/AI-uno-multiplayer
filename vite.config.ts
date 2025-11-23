// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],

  server: {
    port: 5173,
    host: true, // important pour certains réseaux / mobiles

    proxy: {
      // 1. Proxy HTTP pour matchmake (joinOrCreate, list, etc.)
      "/matchmake": {
        target: "http://localhost:2567",
        changeOrigin: true,
        secure: false,
      },

      // 2. Proxy WebSocket pour les vraies connexions aux rooms
      // Colyseus utilise des paths comme : /uno/abc123
      "^/uno/[A-Z0-9]{5}$": {
        target: "ws://localhost:2567",
        ws: true,
        changeOrigin: true,
        secure: false,
      },

      // 3. Option alternative plus simple et plus sûre (recommandée)
      // Proxy TOUTES les connexions WebSocket vers le serveur Colyseus
      // (c’est ce que 99% des projets font)
      "^/ws": {
        target: "ws://localhost:2567",
        ws: true,
        changeOrigin: true,
        secure: false,
      },
    },
  },
});