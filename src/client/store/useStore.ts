import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../../server/schema/UNOState';

// En production sur Railway, on utilise wss://
// Colyseus.js gérera automatiquement la partie HTTP (https://) pour le matchmaking
const RAILWAY_BACKEND = 'wss://ai-uno-multiplayer-production.up.railway.app';

const getBackendUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL;
  }
  if (import.meta.env.PROD) {
    return RAILWAY_BACKEND;
  }
  // En local, on utilise le protocole ws:// sur le host actuel (qui est proxifié par Vite)
  return window.location.protocol.replace('http', 'ws') + '//' + window.location.host;
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
      console.log("Attempting to joinOrCreate 'uno'...");
      const room = (await get().client.joinOrCreate("uno", { name: get().nickname })) as Colyseus.Room<UNOState>;
      console.log("Room created successfully", room.id);
      get()._setupRoom(room);
    } catch (e: any) {
      console.error("Create Room Error:", e);
      set({ error: e.message || "Failed to create room. Check console/CORS." });
    }
  },

  joinRoom: async (code) => {
    try {
      set({ error: null });
      console.log("Attempting to join 'uno' with code:", code);
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