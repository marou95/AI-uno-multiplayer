import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../../server/schema/UNOState';

// URL du backend Railway (sans slash à la fin pour éviter les doubles slashes)
const RAILWAY_BACKEND = 'wss://ai-uno-multiplayer-production.up.railway.app';

const getBackendUrl = () => {
  // 1. Si une variable d'env est définie (priorité absolue)
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  
  // 2. En Production (Vercel, etc.) -> Utiliser Railway
  if (import.meta.env.PROD) {
    return RAILWAY_BACKEND;
  }
  
  // 3. En Local -> Utiliser le proxy Vite (ws://localhost:5173/uno -> ws://localhost:2567)
  // On utilise window.location.host pour garder le port du frontend (5173)
  const protocol = window.location.protocol.replace('http', 'ws');
  return `${protocol}//${window.location.host}`;
};

const SERVER_URL = getBackendUrl();

console.log("🔌 Connecting to Colyseus Server at:", SERVER_URL);

interface StoreState {
  client: Colyseus.Client;
  room: Colyseus.Room<UNOState> | null;
  gameState: UNOState | null;
  playerId: string | null;
  
  // Local UI State
  nickname: string;
  error: string | null;
  notifications: string[];
  
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

  setNickname: (name) => {
    localStorage.setItem('uno_nickname', name);
    set({ nickname: name });
    const room = get().room;
    if (room) {
      room.send("setInfo", { name });
    }
  },

  createRoom: async () => {
    try {
      set({ error: null });
      console.log(`Creating room 'uno' on ${SERVER_URL}...`);
      const room = (await get().client.joinOrCreate("uno", { name: get().nickname })) as Colyseus.Room<UNOState>;
      console.log("Room created successfully:", room.roomId);
      get()._setupRoom(room);
    } catch (e: any) {
      console.error("Create Room Error:", e);
      set({ error: "Failed to create room: " + (e.message || "Unknown error") });
    }
  },

  joinRoom: async (code) => {
    try {
      set({ error: null });
      console.log(`Joining room 'uno' with code ${code} on ${SERVER_URL}...`);
      const room = (await get().client.join("uno", { name: get().nickname, code })) as Colyseus.Room<UNOState>; 
      get()._setupRoom(room);
    } catch (e: any) {
      console.error("Join Room Error:", e);
      set({ error: "Could not join room. " + (e.message || "Unknown error") });
    }
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) room.leave();
    set({ room: null, gameState: null, playerId: null, error: null });
  },

  _setupRoom: (room: Colyseus.Room<UNOState>) => {
    set({ room, playerId: room.sessionId, error: null });

    room.onStateChange((state) => {
      set({ gameState: { ...state } as any });
    });

    room.onMessage("notification", (msg) => {
        get().addNotification(msg);
    });

    room.onMessage("error", (msg) => {
        get().addNotification("Error: " + msg);
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