import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// === CONFIGURATION CORS ROBUSTE ===
// Liste des origines explicitement autorisées
const allowedOrigins = [
  "http://localhost:5173", // Local frontend
  "http://localhost:2567", // Local backend
  "https://ai-uno-multiplayer-production.up.railway.app" // Self
];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // 1. Autoriser les requêtes sans origine (curl, postman, server-to-server)
    if (!origin) return callback(null, true);

    // 2. Vérifier si l'origine est dans la liste blanche exacte
    if (allowedOrigins.indexOf(origin) !== -1) {
      return callback(null, true);
    }

    // 3. AUTORISER DYNAMIQUEMENT TOUS LES SOUS-DOMAINES VERCEL
    // C'est crucial pour vos déploiements de preview et prod (ex: votre url spécifique)
    if (origin.endsWith(".vercel.app")) {
      return callback(null, true);
    }

    console.log("🚫 CORS Blocked Origin:", origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true, // INDISPENSABLE pour les sessions Colyseus
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
};

// Appliquer CORS immédiatement
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

app.get("/", (req, res) => {
  res.send("UNO Server Running! 🚀");
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server, 
  }),
});

gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port);
console.log(`UNO server running on wss://0.0.0.0:${port}`);