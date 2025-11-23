import express from "express";
import cors from "cors";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { createServer } from "http";
import { UNORoom } from "./UNORoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// CORS ultra permissif mais sécurisé en prod
app.use(
  cors({
    origin: true,           // reflète l'origine de la requête (Vercel, localhost, etc.)
    credentials: true,      // indispensable pour Colyseus (sessionId dans cookie)
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "x-client-id",
    ],
  })
);

// Très important : Colyseus a besoin que le preflight passe AVANT son propre handler
// Donc on force la réponse OPTIONS ici
app.options("*", cors()); // répond 204 à tous les preflights

app.use(express.json());

// Health check pour Railway / Render
app.get("/", (req, res) => {
  res.send("UNO WebSocket Server Running!");
});

// Création du serveur HTTP
const httpServer = createServer(app);

// Transport WebSocket Colyseus
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: httpServer,
  }),
});

// === CRUCIAL : passe le middleware CORS au transport Colyseus ===
gameServer.transport.onConnection((connection) => {
  const httpUpgrade = connection.upgradeReq;
  if (httpUpgrade.headers.origin) {
    // Ajoute les headers CORS sur la réponse du handshake WebSocket
    connection.upgradeReq.headers.origin &&
      connection.setHeader?.(
        "Access-Control-Allow-Origin",
        httpUpgrade.headers.origin
      );
    connection.setHeader?.("Access-Control-Allow-Credentials", "true");
  }
});

gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port, "0.0.0.0");
console.log(`UNO server listening on ws://0.0.0.0:${port}`);