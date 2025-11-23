import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT || 2567);
const app = express();

// === CORS CONFIGURATION CRITIQUE ===
// DOIT être configuré AVANT toute autre middleware
const corsOptions = {
    origin: function (origin: string | undefined, callback: Function) {
        // En production, toujours autoriser (Railway a besoin de ça)
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400,
    optionsSuccessStatus: 204
};

// IMPORTANT: CORS doit être le PREMIER middleware
app.use(cors(corsOptions));

// Gérer EXPLICITEMENT les preflight pour TOUTES les routes
app.options('*', cors(corsOptions));

app.use(express.json());

// Route de santé
app.get("/", (req, res) => {
    res.json({ 
        status: "ok", 
        message: "UNO Server Running! 🚀",
        port: port,
        timestamp: new Date().toISOString()
    });
});

app.get("/health", (req, res) => {
    res.json({ 
        status: "healthy",
        cors: "enabled",
        origin: req.headers.origin || "none"
    });
});

const server = http.createServer(app);

// === CONFIGURATION COLYSEUS ===
const gameServer = new Server({
    transport: new WebSocketTransport({
        server,
        pingInterval: 3000,
        pingMaxRetries: 3,
    }),
});

// Définir la room UNO
gameServer.define("uno", UNORoom)
    .enableRealtimeListing()
    .filterBy(['code']);

// CRITIQUE: Démarrer Colyseus AVANT d'écouter
gameServer.listen(port);

console.log(`✅ UNO server is running!`);
console.log(`📡 WebSocket: ws://0.0.0.0:${port}`);
console.log(`🌐 HTTP: http://0.0.0.0:${port}`);
console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🔓 CORS: Enabled for all origins`);

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});