import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../schema/UNOState';

const RAILWAY_BACKEND = 'wss://uno-server-0sb3.onrender.com';

const getBackendUrl = () => {
  const meta = import.meta as any;
  const env = meta.env || {};
  if (env.VITE_SERVER_URL) return env.VITE_SERVER_URL;

  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;

    if (hostname.includes('vercel.app')) {
      return RAILWAY_BACKEND;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.startsWith('192.168.')) {
      const protocol = window.location.protocol.replace('http', 'ws');
      return `${protocol}//${hostname}:2567`;
    }
  }

  const protocol = window.location.protocol.replace('http', 'ws');
  return `${protocol}//${window.location.host}:2567`;
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
  tryReconnect: () => Promise<void>;
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
      // SUPPRESSION: localStorage.setItem (Pas de persistance)

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

      const httpUrl = SERVER_URL.replace('ws', 'http').replace(':2567', ':2567');
      const response = await fetch(`${httpUrl}/lookup/${roomCode}`);

      if (!response.ok) {
        throw new Error("Room not found or invalid code");
      }

      const data = await response.json();
      console.log(`✅ Room found! ID: ${data.roomId}. Joining...`);

      const room = await store.client.joinById(data.roomId, { name: nickname }) as Colyseus.Room<UNOState>;

      // SUPPRESSION: localStorage.setItem (Pas de persistance)

      store._setupRoom(room);
      set({ isConnecting: false });

    } catch (e: any) {
      console.error("❌ Join error:", e);
      let msg = e.message || "Unable to join room";
      set({ error: msg, isConnecting: false });
      get().addNotification("⚠️ " + msg);
    }
  },

  tryReconnect: async () => {
    // FONCTIONVIDÉE : Plus de reconnexion automatique via localStorage
    // On garde la fonction vide pour ne pas casser les appels existants dans App.tsx
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) room.leave();
    set({ room: null, gameState: null, playerId: null, error: null, isConnecting: false });
    // SUPPRESSION: window.history (Pas de manipulation d'URL)
  },

  _setupRoom: (room: Colyseus.Room<UNOState>) => {
    set({ room, playerId: room.sessionId, error: null });

    room.onStateChange.once((state) => {
      set({ gameState: state as any });
      // SUPPRESSION: window.history (Pas de mise à jour de l'URL avec ?room=...)
    });

    room.onStateChange((state) => {
      set({ gameState: state as any });
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