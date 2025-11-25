import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT) || 2567;
const app = express();

console.log('🚀 Starting UNO Server...');
// ... (le reste de vos imports et configs express reste identique)

app.use(express.json() as any);

app.get("/", (req, res) => {
  res.send("UNO Server Running! 🚀");
});

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server,
    pingInterval: 0, 
    verifyClient: (info, next) => {
      next(true);
    }
  }),
});

gameServer.define("uno", UNORoom)
  .filterBy(['roomCode'])
  .enableRealtimeListing();

// --- AJOUTEZ CE BLOC ICI ---
// API pour résoudre Code -> RoomID côté serveur (plus fiable)
app.get("/lookup/:code", async (req, res) => {
  const code = req.params.code.toUpperCase();
  try {
    // On demande au MatchMaker toutes les salles "uno"
    const rooms = await gameServer.matchMaker.query({ name: "uno" });
    // On cherche celle qui a le bon code dans ses métadonnées
    const match = rooms.find((room) => room.metadata && room.metadata.roomCode === code);
    
    if (match) {
      res.json({ roomId: match.roomId });
    } else {
      res.status(404).json({ error: "Room not found" });
    }
  } catch (e) {
    console.error("Lookup error:", e);
    res.status(500).json({ error: "Server error" });
  }
});
// ---------------------------

gameServer.listen(port);
console.log(`✅ Server ready on port ${port}`);

// ... (reste du fichier process.on...)