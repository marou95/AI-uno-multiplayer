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

// Génère un ID unique pour le navigateur s'il n'existe pas
const getDeviceId = () => {
  let id = localStorage.getItem('uno_device_id');
  if (!id) {
    id = Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem('uno_device_id', id);
  }
  return id;
};

const SERVER_URL = getBackendUrl();
console.log("🔌 Connecting to Server:", SERVER_URL);

// Interface pour stocker les infos de session
interface PreviousSession {
  roomId: string;
  sessionId: string;
  roomCode: string;
}

interface StoreState {
  client: Colyseus.Client;
  room: Colyseus.Room<UNOState> | null;
  gameState: UNOState | null;
  playerId: string | null;
  nickname: string;
  error: string | null;
  notifications: string[];
  isConnecting: boolean;
  previousSession: PreviousSession | null; // NOUVEAU

  addBot: () => void;
  removeBot: (id: string) => void;
  setNickname: (name: string) => void;
  createRoom: () => Promise<void>;
  joinRoom: (code: string) => Promise<void>;
  leaveRoom: () => void;
  tryReconnect: () => Promise<void>;
  checkPreviousSession: () => void; // NOUVEAU
  reconnectToSession: () => Promise<void>; // NOUVEAU
  toggleReady: () => void;
  startGame: () => void;
  playCard: (cardId: string, color?: string) => void;
  drawCard: () => void;
  sayUno: () => void;
  catchUno: () => void;
  requestRestart: () => void;
  addNotification: (msg: string) => void;
  _setupRoom: (room: Colyseus.Room<UNOState>, knownCode?: string) => void; // Signature mise à jour
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
  previousSession: null, // Initialisation

  addBot: () => get().room?.send("addBot"),
  removeBot: (id) => get().room?.send("removeBot", id),

  setNickname: (name) => {
    localStorage.setItem('uno_nickname', name);
    set({ nickname: name });
    const room = get().room;
    if (room) room.send("setInfo", { name });
  },

  // Vérifie au chargement si une session existe en cache
  checkPreviousSession: () => {
    const saved = localStorage.getItem('uno_session');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        set({ previousSession: parsed });
      } catch (e) {
        localStorage.removeItem('uno_session');
      }
    }
  },

  createRoom: async () => {
    const store = get();
    if (store.isConnecting || store.room) return;

    try {
      set({ error: null, isConnecting: true });
      const nickname = store.nickname.trim();
      if (!nickname) throw new Error("Nickname required");

      console.log(`🎮 Creating room on ${SERVER_URL}...`);
      const room = await store.client.create("uno", { name: nickname, deviceId: getDeviceId() }) as Colyseus.Room<UNOState>;

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

      const httpUrl = SERVER_URL.replace('ws', 'http').replace(':2567', ':2567');
      const response = await fetch(`${httpUrl}/lookup/${roomCode}`);

      if (!response.ok) {
        throw new Error("Room not found or invalid code");
      }

      const data = await response.json();
      console.log(`✅ Room found! ID: ${data.roomId}. Joining...`);

      const room = await store.client.joinById(data.roomId, { name: nickname, deviceId: getDeviceId() }) as Colyseus.Room<UNOState>;

      store._setupRoom(room, roomCode);
      set({ isConnecting: false });

    } catch (e: any) {
      console.error("❌ Join error:", e);
      let msg = e.message || "Unable to join room";
      set({ error: msg, isConnecting: false });
      get().addNotification("⚠️ " + msg);
    }
  },

  tryReconnect: async () => {
    // Ancienne fonction conservée vide pour compatibilité
  },

  // Logique de reconnexion manuelle (Corrigée pour utiliser joinById)
  reconnectToSession: async () => {
    const store = get();
    const session = store.previousSession;
    if (!session) return;

    try {
      set({ isConnecting: true, error: null });
      console.log("♻️ Attempting smart rejoin to", session.roomId);

      // AU LIEU DE RECONNECT : On utilise joinById pour déclencher onJoin sur le serveur
      // Cela active la logique de récupération par nom (Name Matching)
      const room = await store.client.joinById(
        session.roomId,
        // Envoi du nom et deviceId (ajout du deviceId pour aider à l'identification du joueur côté serveur) pour la logique de reconnexion intelligente
        { name: store.nickname, deviceId: getDeviceId() }
      ) as Colyseus.Room<UNOState>;

      console.log("✅ Rejoined successfully!");
      store._setupRoom(room, session.roomCode);
      set({ isConnecting: false });

    } catch (e: any) {
      console.error("❌ Rejoin failed:", e);
      // Si la room n'existe plus, on nettoie
      if (e.message.includes("not found") || e.code === 4212) {
        localStorage.removeItem('uno_session');
        set({ previousSession: null });
      }
      set({
        isConnecting: false,
        error: "Unable to rejoin room (Game might be over)."
      });
    }
  },

  leaveRoom: () => {
    const { room } = get();
    if (room) room.leave();

    // Suppression explicite de la session lors d'un départ volontaire
    localStorage.removeItem('uno_session');

    set({ room: null, gameState: null, playerId: null, error: null, isConnecting: false, previousSession: null });
  },

  _setupRoom: (room: Colyseus.Room<UNOState>, knownCode?: string) => {

    // Sauvegarde des infos de session dès qu'on a le code
    room.onStateChange.once((state) => {
      set({ gameState: state as any });

      const code = knownCode || state.roomCode;
      if (code) {
        const sessionData = {
          roomId: room.roomId,
          sessionId: room.sessionId,
          roomCode: code
        };
        localStorage.setItem('uno_session', JSON.stringify(sessionData));
        set({ previousSession: sessionData });
      }
    });

    set({ room, playerId: room.sessionId, error: null });

    room.onStateChange((state) => {
      set({ gameState: state as any });
    });

    room.onMessage("notification", (msg) => get().addNotification(msg));
    room.onMessage("error", (msg) => get().addNotification("⚠️ " + msg));

    room.onLeave((code) => {
      set({ room: null, gameState: null, playerId: null, isConnecting: false });

      // Si déconnexion involontaire, on vérifie si on peut proposer la reconnexion
      if (code !== 1000) {
        get().addNotification(`⚠️ Disconnected (${code})`);
        get().checkPreviousSession();
      }
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