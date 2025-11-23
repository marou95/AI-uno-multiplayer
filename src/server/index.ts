import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT || 2567);
const app = express();

// === CORS CONFIGURATION AMÉLIORÉE ===
const corsOptions = {
    origin: function (origin: string | undefined, callback: Function) {
        // Autoriser les requêtes sans origin (comme Postman, mobile apps, etc.)
        if (!origin) return callback(null, true);
        
        // Liste des origines autorisées
        const allowedOrigins = [
            'http://localhost:5173',
            'http://localhost:3000',
            'https://ai-uno-multiplayer-production.up.railway.app',
            // Ajoutez votre domaine Vercel ici
            /\.vercel\.app$/,  // Autorise tous les sous-domaines vercel.app
        ];
        
        // Vérifier si l'origine est autorisée
        const isAllowed = allowedOrigins.some(allowed => {
            if (typeof allowed === 'string') {
                return origin === allowed;
            }
            return allowed.test(origin);
        });
        
        if (isAllowed) {
            callback(null, true);
        } else {
            console.log('Origin bloquée:', origin);
            callback(null, true); // En dev, on autorise quand même
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    maxAge: 86400 // 24 heures
};

app.use(cors(corsOptions));

// Gérer explicitement les requêtes OPTIONS (preflight)
app.options('*', cors(corsOptions));

app.use(express.json());

// === MIDDLEWARE POUR LES ROUTES COLYSEUS ===
// NE PAS interférer avec les routes de Colyseus
// On laisse passer sans rien faire
app.use('/matchmake', (req, res, next) => {
    // La route est gérée par Colyseus, on ne fait rien
    // IMPORTANT: Ne pas appeler res.send() ou res.end()
});

// Route de santé
app.get("/", (req, res) => {
    res.json({ 
        status: "ok", 
        message: "UNO Server Running! 🚀",
        port: port,
        timestamp: new Date().toISOString()
    });
});

// Route de test pour vérifier CORS
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
    // Ajout de la configuration de présence pour Railway
    presence: undefined, // Utiliser la présence locale
});

// Définir la room UNO
gameServer.define("uno", UNORoom)
    .enableRealtimeListing()
    .filterBy(['code']); // Permet de filtrer les rooms par code

// Démarrer le serveur
gameServer.listen(port);

console.log(`✅ UNO server is running!`);
console.log(`📡 WebSocket: ws://0.0.0.0:${port}`);
console.log(`🌐 HTTP: http://0.0.0.0:${port}`);
console.log(`🎮 Environment: ${process.env.NODE_ENV || 'development'}`);

// Gestion des erreurs
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
});