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

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Origin', 'X-Requested-With', 'Accept']
}));

// Safe type casting for express.json
app.use(express.json() as express.RequestHandler);

app.use('/matchmake/*', (req, res, next) => {
  res.header('Access-Control-Allow-Origin', req.headers.origin || "*");
  res.header('Access-Control-Allow-Credentials', 'true');
  next();
});

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
    // Enable default ping/pong to keep connections alive on Railway
    // Default is 3000ms check, 2 retries
    verifyClient: (info, next) => {
      // Allow all connections
      next(true);
    }
  }),
});

gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port);
console.log(`✅ Server ready on port ${port}`);

process.on('unhandledRejection', (reason) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
});