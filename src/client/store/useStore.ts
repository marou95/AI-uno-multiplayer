import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../../server/schema/UNOState';

// Configuration des URLs backend
const RAILWAY_BACKEND = 'wss://ai-uno-multiplayer-production.up.railway.app';
const LOCAL_BACKEND_WS = 'ws://localhost:2567';

const getBackendUrl = () => {
  // 1. Variable d'environnement (priorité la plus haute)
  if (import.meta.env.VITE_SERVER_URL) {
    console.log('Using VITE_SERVER_URL:', import.meta.env.VITE_SERVER_URL);
    return import.meta.env.VITE_SERVER_URL;
  }
  
  // 2. Production (détection automatique)
  if (import.meta.env.PROD) {
    console.log('Production mode detected, using Railway backend');
    return RAILWAY_BACKEND;
  }
  
  // 3. Développement local
  // En dev avec Vite, on peut utiliser soit le proxy, soit directement localhost
  const isDev = import.meta.env.DEV;
  if (isDev) {
    // Option A: Utiliser le proxy Vite (recommandé)
    // Utilise le même host que le site web, Vite fera le proxy
    const protocol = window.location.protocol.replace('http', 'ws');
    const proxyUrl = `${protocol}//${window.location.host}`;
    console.log('Development mode, using Vite proxy:', proxyUrl);
    return proxyUrl;
    
    // Option B: Se connecter directement au backend local (décommentez si nécessaire)
    // console.log('Development mode, connecting directly to:', LOCAL_BACKEND_WS);
    // return LOCAL_BACKEND_WS;
  }
  
  // Fallback
  return RAILWAY_BACKEND;
};

const SERVER_URL = getBackendUrl();

console.log("🔌 Colyseus Client Configuration:");
console.log("   - Server URL:", SERVER_URL);
console.log("   - Environment:", import.meta.env.MODE);
console.log("   - Production:", import.meta.env.PROD);

interface StoreState {
  client: Colyseus.Client;
  room: Colyseus.Room<UNOState> | null;
  gameState: UNOState | null;
  playerId: string | null;
  
  // Local UI State
  nickname: string;
  error: string | null;
  notifications: string[];
  isConnecting: boolean;
  
  // Actions
  setNickname: (name: string) => void;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => void;
  toggleReady: () => void;
  startGame: () => void;
  playCard: (cardId: string, color?: string) => void;
  drawCard: () => void;
  sayUno: () => void;
  addNotification: (msg: string) => void;
  _setupRoom: (room: Colyseus.Room<UNOState>) => void;
}

export const useStore = create<StoreState>((set, get) => ({
  client: new Colyseus.Client(SERVER_URL),
  room: null,
  gameState: null,
  playerId: null,
  nickname: localStorage.getItem('uno_nickname') || '',
  error: null,
  notifications: [],
  isConnecting: false,

  setNickname: (name) => {
    localStorage.setItem('uno_nickname', name);
    set({ nickname: name });
    const room = get().room;
    if (room) {
      room.send("setInfo", { name });
    }
  },

  createRoom: async () => {
    const store = get();
    
    // Prévenir les appels multiples
    if (store.isConnecting || store.room) {
      console.log('Already connecting or room exists, ignoring duplicate request');
      return;
    }

    try {
      set({ error: null, isConnecting: true });
      
      const nickname = store.nickname.trim();
      if (!nickname) {
        throw new Error("Please enter a nickname");
      }

      console.log(`🎮 Creating room 'uno' on ${SERVER_URL}...`);
      console.log(`   - Nickname: ${nickname}`);
      
      const room = await store.client.joinOrCreate("uno", { 
        name: nickname 
      }) as Colyseus.Room<UNOState>;
      
      console.log("✅ Room created successfully!");
      console.log("   - Room ID:", room.roomId);
      console.log("   - Session ID:", room.sessionId);
      
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Create Room Error:", e);
      console.error("   - Message:", e.message);
      console.error("   - Code:", e.code);
      
      let errorMessage = "Failed to create room";
      
      // Messages d'erreur plus explicites
      if (e.message?.includes('CORS')) {
        errorMessage = "Connection blocked by CORS policy. Check server configuration.";
      } else if (e.message?.includes('Failed to fetch')) {
        errorMessage = "Cannot reach server. Check your internet connection.";
      } else if (e.message?.includes('timeout')) {
        errorMessage = "Connection timeout. Server might be down.";
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      set({ 
        error: errorMessage,
        isConnecting: false 
      });
      
      // Ajouter une notification
      get().addNotification("❌ " + errorMessage);
    }
  },

  joinRoom: async (code) => {
    const store = get();
    
    // Prévenir les appels multiples
    if (store.isConnecting || store.room) {
      console.log('Already connecting or room exists, ignoring duplicate request');
      return;
    }

    try {
      set({ error: null, isConnecting: true });
      
      const nickname = store.nickname.trim();
      const roomCode = code.trim().toUpperCase();
      
      if (!nickname) {
        throw new Error("Please enter a nickname");
      }
      
      if (roomCode.length !== 5) {
        throw new Error("Room code must be 5 characters");
      }

      console.log(`🎮 Joining room 'uno' with code ${roomCode}...`);
      console.log(`   - Nickname: ${nickname}`);
      
      const room = await store.client.join("uno", { 
        name: nickname, 
        code: roomCode 
      }) as Colyseus.Room<UNOState>;
      
      console.log("✅ Room joined successfully!");
      console.log("   - Room ID:", room.roomId);
      
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Join Room Error:", e);
      console.error("   - Message:", e.message);
      
      let errorMessage = "Could not join room";
      
      if (e.message?.includes('CORS')) {
        errorMessage = "Connection blocked by CORS policy";
      } else if (e.message?.includes('Failed to fetch')) {
        errorMessage = "Cannot reach server";
      } else if (e.message?.includes('not found')) {
        errorMessage = "Room not found. Check the code.";
      } else if (e.message) {
        errorMessage = e.message;
      }
      
      set({ 
        error: errorMessage,
        isConnecting: false 
      });
      
      get().addNotification("❌ " + errorMessage);
    }
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) {
      console.log('👋 Leaving room...');
      room.leave();
    }
    set({ 
      room: null, 
      gameState: null, 
      playerId: null, 
      error: null,
      isConnecting: false 
    });
  },

  _setupRoom: (room: Colyseus.Room<UNOState>) => {
    console.log('🔧 Setting up room:', room.roomId);
    set({ room, playerId: room.sessionId, error: null });

    // Premier changement d'état (critique pour afficher le lobby)
    room.onStateChange.once((state) => {
      console.log('📊 Initial state:', state.status, state.roomCode);
      // Forcer la mise à jour immédiate
      set({ gameState: state as any });
    });

    // Changements d'état suivants
    room.onStateChange((state) => {
      console.log('📊 State update:', state.status);
      set({ gameState: state as any });
    });

    room.onMessage("notification", (msg) => {
      get().addNotification(msg);
    });

    room.onMessage("error", (msg) => {
      get().addNotification("⚠️ " + msg);
    });

    room.onError((code, message) => {
      console.error('❌ Room error:', code, message);
      get().addNotification("❌ Connection error: " + message);
    });

    room.onLeave((code) => {
      console.log('👋 Left room:', code);
      if (code !== 1000) {
        get().addNotification("⚠️ Disconnected from room");
      }
    });
  },

  toggleReady: () => get().room?.send("toggleReady"),
  startGame: () => get().room?.send("startGame"),
  playCard: (cardId, chooseColor) => get().room?.send("playCard", { cardId, chooseColor }),
  drawCard: () => get().room?.send("drawCard"),
  sayUno: () => get().room?.send("sayUno"),
  
  addNotification: (msg) => {
    set(state => ({ notifications: [...state.notifications, msg] }));
    setTimeout(() => {
      set(state => ({ notifications: state.notifications.slice(1) }));
    }, 3000);
  }
}));