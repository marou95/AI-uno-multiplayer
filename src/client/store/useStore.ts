import { create } from 'zustand';
import * as Colyseus from 'colyseus.js';
import { UNOState } from '../../server/schema/UNOState';

// URL de votre Backend Railway (Production)
const RAILWAY_BACKEND = 'wss://ai-uno-multiplayer-production.up.railway.app';

const getBackendUrl = () => {
  const meta = import.meta as any;
  const env = meta.env || {};
  
  // 1. Force l'URL via variable d'env si définie
  if (env.VITE_SERVER_URL) return env.VITE_SERVER_URL;
  
  // 2. Si on est sur Vercel (Production Frontend), on DOIT utiliser Railway
  if (typeof window !== 'undefined' && window.location.hostname.includes('vercel.app')) {
     console.log('🚀 Detected Vercel deployment -> Connecting to Railway');
     return RAILWAY_BACKEND;
  }
  
  // 3. Fallback standard (Localhost)
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
      if (!nickname) throw new Error("Please enter a nickname");

      console.log(`🎮 Creating room on ${SERVER_URL}...`);
      const room = await store.client.create("uno", { name: nickname }) as Colyseus.Room<UNOState>;
      
      console.log("✅ Room Created:", room.roomId);
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Create error:", e);
      set({ error: e.message || "Failed to create room", isConnecting: false });
    }
  },

  // ---------------------------------------------------------
  // CORRECTION MAJEURE ICI : Recherche manuelle de la salle
  // ---------------------------------------------------------
joinRoom: async (code) => {
    const store = get();
    if (store.isConnecting || store.room) return;

    try {
      set({ error: null, isConnecting: true });
      
      const nickname = store.nickname.trim();
      const roomCode = code.trim().toUpperCase();
      
      if (!nickname) throw new Error("Pseudo requis");
      if (roomCode.length !== 5) throw new Error("Le code doit faire 5 lettres");

      console.log(`🔍 Recherche de la salle : ${roomCode}...`);

      // ASTUCE : On cast en 'any' car TypeScript peut ne pas voir la méthode getAvailableRooms
      // alors qu'elle existe bel et bien dans la librairie JS au runtime.
      const availableRooms = await (store.client as any).getAvailableRooms("uno");
      
      console.log("📋 Salles disponibles :", availableRooms.length);

      // On cherche manuellement la salle qui a le bon code dans ses métadonnées
      const match = availableRooms.find((room: any) => room.metadata && room.metadata.roomCode === roomCode);

      if (!match) {
        throw new Error(`Aucune salle trouvée avec le code ${roomCode}`);
      }

      console.log(`✅ Salle trouvée ! ID: ${match.roomId}. Connexion...`);

      // On se connecte DIRECTEMENT à l'ID unique de la salle (plus de filtrage flou)
      const room = await store.client.joinById(match.roomId, { name: nickname }) as Colyseus.Room<UNOState>;
      
      store._setupRoom(room);
      set({ isConnecting: false });
      
    } catch (e: any) {
      console.error("❌ Join error:", e);
      let msg = e.message || "Impossible de rejoindre";
      
      // Traduction des erreurs courantes
      if (msg.includes("not found")) msg = "Salle introuvable ou code invalide";
      
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
    
    room.onStateChange.once((state) => {
      set({ gameState: state as any });
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
  
  addNotification: (msg) => {
    set(state => ({ notifications: [...state.notifications, msg] }));
    setTimeout(() => {
      set(state => ({ notifications: state.notifications.slice(1) }));
    }, 3000);
  }
}));