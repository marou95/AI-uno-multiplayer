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

// Trust headers from Railway/Vercel proxies
app.set('trust proxy', 1);

// Middleware for CORS
app.use(cors({
  origin: true, // Allow any origin reflecting the request origin
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

app.use(express.json() as express.RequestHandler);

// Specialized middleware for Matchmaking to prevent 404s interfering with Colyseus
app.use('/matchmake/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || "*");
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Origin, X-Requested-With, Accept');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

app.get("/", (req, res) => {
  console.log('✅ Health check');
  res.send("UNO Server Running! 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: port
  });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server,
    pingInterval: 10000, // Increased to reduce aggressive timeouts
    pingMaxRetries: 5,
    verifyClient: (info, next) => {
      // Allow all connections in production to avoid strict Origin/Header blocks causing 1006
      next(true);
    }
  }),
});

console.log('📦 Defining UNO room...');
gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port);

console.log('✅ Server ready on port:', port);

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  // Do not exit immediately to keep server alive for other rooms if possible
});