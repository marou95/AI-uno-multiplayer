import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT || 2567);
const app = express();

// === CORS CONFIGURATION ===
app.use(cors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.options('*', cors());

app.use(express.json() as express.RequestHandler);

// === COLYSEUS CONFLICT FIX ===
app.use('/matchmake', (req, res, next) => {
    return; 
});

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