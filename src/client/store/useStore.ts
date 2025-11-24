/// <reference types="vite/client" />
import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../../server/schema/UNOState';

const RAILWAY_BACKEND = 'wss://ai-uno-multiplayer-production.up.railway.app';

const getBackendUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    console.log('Using VITE_SERVER_URL:', import.meta.env.VITE_SERVER_URL);
    return import.meta.env.VITE_SERVER_URL;
  }
  
  if (import.meta.env.PROD) {
    console.log('Production mode, using Railway');
    return RAILWAY_BACKEND;
  }
  
  const protocol = window.location.protocol.replace('http', 'ws');
  const url = `${protocol}//${window.location.host}`;
  console.log('Development mode, using proxy:', url);
  return url;
};

const SERVER_URL = getBackendUrl();
console.log("🔌 Server:", SERVER_URL);

interface StoreState {
  client: Colyseus.Client;
  room: Colyseus.Room<UNOState> | null;
  gameState: UNOState | null;
  playerId: string | null;
  nickname: string;
  error: string | null;
  notifications: string[];
  isConnecting: boolean;
  
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
    if (room) room.send("setInfo", { name });
  },

  createRoom: async () => {
    const store = get();
    if (store.isConnecting || store.room) {
      console.log('⚠️ Already connecting or in room');
      return;
    }

    try {
      set({ error: null, isConnecting: true });
      
      const nickname = store.nickname.trim();
      if (!nickname) throw new Error("Please enter a nickname");

      console.log(`🎮 Creating room on ${SERVER_URL}...`);
      
      const room = await store.client.joinOrCreate("uno", { name: nickname }) as Colyseus.Room<UNOState>;
      
      console.log("✅ Room Connected! Internal ID:", room.roomId);
      console.log("⏳ Waiting for game state (Room Code)...");
      
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Create error:", e);
      
      let errorMessage = "Failed to create room";
      if (e.message?.includes('1006')) errorMessage = "Connection Closed (1006) - Try again";
      else if (e.message?.includes('CORS')) errorMessage = "CORS error - Check server";
      else if (e.message?.includes('fetch')) errorMessage = "Cannot reach server";
      else if (e.message) errorMessage = e.message;
      
      set({ error: errorMessage, isConnecting: false });
      get().addNotification("❌ " + errorMessage);
    }
  },

  joinRoom: async (code) => {
    const store = get();
    if (store.isConnecting || store.room) {
      console.log('⚠️ Already connecting or in room');
      return;
    }

    try {
      set({ error: null, isConnecting: true });
      
      const nickname = store.nickname.trim();
      const roomCode = code.trim().toUpperCase();
      
      if (!nickname) throw new Error("Please enter a nickname");
      if (roomCode.length !== 5) throw new Error("Code must be 5 letters");

      console.log(`🎮 Joining room ${roomCode}...`);
      
      // We pass 'code' in options so the server can filter room candidates
      const room = await store.client.join("uno", { name: nickname, code: roomCode }) as Colyseus.Room<UNOState>;
      
      console.log("✅ Joined room (Internal ID):", room.roomId);
      
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Join error:", e);
      
      let errorMessage = "Could not join room";
      if (e.message?.includes('not found')) errorMessage = "Room not found";
      else if (e.message) errorMessage = e.message;
      
      set({ error: errorMessage, isConnecting: false });
      get().addNotification("❌ " + errorMessage);
    }
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) {
      console.log('👋 Leaving room');
      room.leave();
    }
    set({ room: null, gameState: null, playerId: null, error: null, isConnecting: false });
  },

  _setupRoom: (room: Colyseus.Room<UNOState>) => {
    console.log('🔧 Setup room listeners:', room.roomId);
    set({ room, playerId: room.sessionId, error: null });
    
    room.onStateChange.once((state) => {
      console.log('📊 Initial state received. Code:', state.roomCode);
      set({ gameState: state as any });
    });

    room.onStateChange((state) => {
      // Debug log every few updates or on status change
      if (get().gameState?.status !== state.status) {
         console.log('📊 State status update:', state.status);
      }
      set({ gameState: state as any });
    });

    room.onMessage("notification", (msg) => get().addNotification(msg));
    room.onMessage("error", (msg) => get().addNotification("⚠️ " + msg));
    
    room.onError((code, message) => {
      console.error('❌ Room error:', code, message);
      get().addNotification("❌ Error: " + message);
    });

    room.onLeave((code) => {
      console.log('👋 Connection Closed. Code:', code);
      if (code !== 1000) {
        get().addNotification("⚠️ Disconnected (" + code + ")");
        // If we disconnect abnormally, clear the state so UI returns to home
        set({ room: null, gameState: null, playerId: null, isConnecting: false, error: `Disconnected (${code})` });
      } else {
        set({ room: null, gameState: null, playerId: null, isConnecting: false });
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