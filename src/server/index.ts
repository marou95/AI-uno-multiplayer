// src/server/index.ts
import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";

const port = Number(process.env.PORT || 2567);
const app = express();

console.log('🚀 Starting UNO Server...');
console.log('📍 Port:', port);

// === CORS HEADERS ===
app.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Log pour debug
  if (origin) {
    console.log('Request from:', origin);
  }
  
  // Autoriser TOUTES les origines
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Répondre immédiatement aux OPTIONS
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
    return;
  }
  
  next();
});

app.use(express.json());

// Health check
app.get("/", (req, res) => {
  res.send("UNO Server Running! 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: port
  });
});

// Create HTTP server
const server = http.createServer(app);

// Create Colyseus server
const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server,
  }),
});

// Define rooms
console.log('📦 Defining UNO room...');
gameServer.define("uno", UNORoom).enableRealtimeListing();

// Start listening
gameServer.listen(port);

console.log('✅ UNO Server is ready!');
console.log(`🌐 HTTP: http://0.0.0.0:${port}`);
console.log(`📡 WebSocket: ws://0.0.0.0:${port}`);

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});