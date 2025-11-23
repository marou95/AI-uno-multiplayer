import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";

const port = Number(process.env.PORT || 2567);
const app = express();

// === MIDDLEWARE CORS MANUEL ===
// Cette approche contourne les potentiels problèmes de la librairie 'cors' derrière des proxys
app.use((req: any, res: any, next: express.NextFunction) => {
    const origin = req.headers.origin;

    // Liste des origines locales pour le dev
    const allowedOrigins = [
        "http://localhost:5173",
        "http://localhost:2567",
    ];

    let isAllowed = false;

    if (origin) {
        // 1. Autoriser localhost
        if (allowedOrigins.includes(origin)) {
            isAllowed = true;
        } 
        // 2. Autoriser TOUS les déploiements Vercel (.vercel.app)
        else if (origin.endsWith(".vercel.app")) {
            isAllowed = true;
        }
        // 3. Autoriser le serveur lui-même (self)
        else if (origin.includes("railway.app")) {
            isAllowed = true;
        }

        if (isAllowed) {
            // Utilisation de .set() au lieu de .setHeader() pour satisfaire les types Express
            res.set('Access-Control-Allow-Origin', origin);
        }
    }

    // En-têtes standards requis pour Colyseus et les requêtes AJAX
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.set('Access-Control-Allow-Headers', 'X-Requested-With, Content-Type, Authorization, Origin, Accept');
    res.set('Access-Control-Allow-Credentials', 'true');

    // Réponse immédiate aux requêtes PREFLIGHT (OPTIONS)
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }

    next();
});

app.use(express.json() as any);

app.get("/", (req, res) => {
  res.send("UNO Server Running! 🚀");
});

const server = http.createServer(app);

const gameServer = new Server({
  transport: new WebSocketTransport({
    server, 
  }),
});

gameServer.define("uno", UNORoom).enableRealtimeListing();

gameServer.listen(port);
console.log(`UNO server running on wss://0.0.0.0:${port}`);