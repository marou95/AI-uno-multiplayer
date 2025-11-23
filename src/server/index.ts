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

app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  optionsSuccessStatus: 200
}));

app.options('*', cors());
app.use(express.json());

app.get("/", (req, res) => {
  console.log('✅ Health check from:', req.headers.origin || 'unknown');
  res.send("UNO Server Running! 🚀");
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    port: port,
    cors: "enabled"
  });
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server: server,
  }),
});

console.log('📦 Defining UNO room...');
gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port);

console.log('✅ UNO Server is ready!');
console.log(`🌐 Listening on port: ${port}`);

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  process.exit(1);
});