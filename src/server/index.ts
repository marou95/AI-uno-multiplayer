import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// === CONFIGURATION CORS CRITIQUE ===
// Nous définissons une config unique pour l'appliquer PARTOUT (middleware + options)
const corsOptions = {
  // 'true' dit à cors de renvoyer exactement l'origine qui a fait la requête (ex: https://votre-app.vercel.app)
  // C'est indispensable quand credentials: true est activé.
  origin: true, 
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'x-client-id'],
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// 1. Appliquer CORS aux requêtes normales
app.use(cors(corsOptions));

// 2. Appliquer EXACTEMENT la même config aux requêtes OPTIONS (Preflight)
// C'est ici que ça bloquait : le preflight recevait une config par défaut incompatible.
app.options('*', cors(corsOptions));

app.get("/", (req, res) => {
  res.send("UNO Server Running! 🚀");
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server, // Utilise le serveur HTTP express configuré ci-dessus
  }),
});

gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port);
console.log(`UNO server running on wss://0.0.0.0:${port}`);
