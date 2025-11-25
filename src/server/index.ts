import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT) || 2567;
const app = express();

console.log('🚀 Starting UNO Server...');
console.log('📍 Port:', port);
console.log('🌍 Environment:', process.env.NODE_ENV || 'development');

app.set('trust proxy', 1);

// Standard CORS config - robust for Railway/Vercel
app.use(cors({
  origin: true, // Dynamically set Access-Control-Allow-Origin to the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Cast to any to avoid TypeScript overload error with Express types
app.use(express.json() as any);

// REMOVED: Manual /matchmake middleware which caused 405 errors by interfering with Colyseus routing.

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
    // Disable ping interval to prevent premature disconnects on proxies (Railway/Vercel)
    pingInterval: 0, 
    verifyClient: (info, next) => {
      // Allow all connections
      next(true);
    }
  }),
});

// Enable filterBy logic for strict Room Code matching
gameServer.define("uno", UNORoom)
  .filterBy(['roomCode'])
  .enableRealtimeListing();

gameServer.listen(port);
console.log(`✅ Server ready on port ${port}`);

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});