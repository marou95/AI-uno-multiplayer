import express from "express";
import { Server } from "colyseus";
import { createServer } from "http";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT || 2567);
const app = express();

// In production, your frontend will be on a different domain (e.g. Vercel)
// We allow all CORS for simplicity in this demo, or you can restrict to your Vercel URL
app.use(cors());
// Fix TypeScript overload mismatch for express.json middleware
app.use(express.json() as any);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: createServer(app),
  }),
});

gameServer.define("uno", UNORoom);

gameServer.listen(port);
console.log(`Listening on ws://localhost:${port}`);