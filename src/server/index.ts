import express from "express";
import { Server } from "colyseus";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT || 2567);
const app = express();

// Fix CORS: Allow dynamic origin with credentials
// This is critical for Vercel (frontend) to talk to Railway (backend)
app.use(cors({
  origin: true, // Reflects the request origin (e.g. your Vercel URL)
  credentials: true, // Allow cookies/headers needed by Colyseus
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
}));

app.use(express.json() as any);

// HEALTH CHECK: Important for Railway/Render to know the app is alive
app.get("/", (req, res) => {
  res.status(200).send("UNO Server is running! 🚀");
});

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app),
  }),
});

gameServer.define("uno", UNORoom);

// Bind to 0.0.0.0 to ensure external access in containerized environments (Railway/Docker)
gameServer.listen(port, "0.0.0.0");
console.log(`Listening on ws://0.0.0.0:${port}`);