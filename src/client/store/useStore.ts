import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../../server/schema/UNOState';

const RAILWAY_BACKEND = 'wss://ai-uno-multiplayer-production.up.railway.app';

const getBackendUrl = () => {
  const meta = import.meta as any;
  const env = meta.env || {};
  if (env.VITE_SERVER_URL) return env.VITE_SERVER_URL;
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
     return RAILWAY_BACKEND;
  }
  const protocol = window.location.protocol.replace('http', 'ws');
  return `${protocol}//${window.location.host}`;
};

const SERVER_URL = getBackendUrl();
console.log("🔌 Connecting to Server:", SERVER_URL);

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
  catchUno: () => void;
  requestRestart: () => void;
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
    if (store.isConnecting || store.room) return;

    try {
      set({ error: null, isConnecting: true });
      const nickname = store.nickname.trim();
      if (!nickname) throw new Error("Nickname required");

      console.log(`🎮 Creating room on ${SERVER_URL}...`);
      const room = await store.client.create("uno", { name: nickname }) as Colyseus.Room<UNOState>;
      
      console.log("✅ Room Created (ID):", room.roomId);
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Create error:", e);
      set({ error: e.message || "Failed to create room", isConnecting: false });
    }
  },

  joinRoom: async (code) => {
    const store = get();
    if (store.isConnecting || store.room) return;

    try {
      set({ error: null, isConnecting: true });
      
      const nickname = store.nickname.trim();
      const roomCode = code.trim().toUpperCase();
      
      if (!nickname) throw new Error("Nickname required");
      if (roomCode.length !== 5) throw new Error("Code must be 5 letters");

      console.log(`🔍 Searching for room code: ${roomCode}...`);

      const httpUrl = SERVER_URL.replace('ws', 'http');
      const response = await fetch(`${httpUrl}/lookup/${roomCode}`);
      
      if (!response.ok) {
        throw new Error("Room not found or invalid code");
      }

      const data = await response.json();
      console.log(`✅ Room found! ID: ${data.roomId}. Joining...`);

      const room = await store.client.joinById(data.roomId, { name: nickname }) as Colyseus.Room<UNOState>;
      
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Join error:", e);
      let msg = e.message || "Unable to join room";
      set({ error: msg, isConnecting: false });
      get().addNotification("⚠️ " + msg);
    }
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) room.leave();
    set({ room: null, gameState: null, playerId: null, error: null, isConnecting: false });
  },

  _setupRoom: (room: Colyseus.Room<UNOState>) => {
    set({ room, playerId: room.sessionId, error: null });
    
    // Initial State
    set({ gameState: room.state });

    // Update on change
    room.onStateChange((state) => {
      // Force update en créant une nouvelle référence (shallow copy) pour que React réagisse
      // Note: Colyseus mute l'objet state, donc {...state} aide React à voir le changement
      set({ gameState: { ...state } as UNOState });
    });

    room.onMessage("notification", (msg) => get().addNotification(msg));
    room.onMessage("error", (msg) => get().addNotification("⚠️ " + msg));
    
    room.onLeave((code) => {
        set({ room: null, gameState: null, playerId: null, isConnecting: false });
        if (code !== 1000) get().addNotification(`⚠️ Disconnected (${code})`);
    });
  },

  toggleReady: () => get().room?.send("toggleReady"),
  startGame: () => get().room?.send("startGame"),
  playCard: (cardId, chooseColor) => get().room?.send("playCard", { cardId, chooseColor }),
  drawCard: () => get().room?.send("drawCard"),
  sayUno: () => get().room?.send("sayUno"),
  catchUno: () => get().room?.send("catchUno"),
  requestRestart: () => get().room?.send("restartGame"),

  addNotification: (msg) => {
    set(state => ({ notifications: [...state.notifications, msg] }));
    setTimeout(() => {
      set(state => ({ notifications: state.notifications.slice(1) }));
    }, 3000);
  }
}));