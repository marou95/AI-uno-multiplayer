import express from "express";
import http from "http";
import { Server } from "colyseus";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { UNORoom } from "./UNORoom";
import cors from "cors";

const port = Number(process.env.PORT || 2567);
const app = express();

// === CORS CONFIGURATION ===
// Use the 'cors' package which is more robust than manual headers.
// origin: true reflects the request origin, allowing any domain to connect.
// credentials: true allows cookies/headers if needed.
app.use(cors({
    origin: true, 
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Handle Preflight requests explicitly (though cors() usually handles it)
app.options('*', cors());

app.use(express.json() as express.RequestHandler);

// === COLYSEUS CONFLICT FIX ===
// Colyseus attaches its own listener to the HTTP server for /matchmake routes.
// Express also listens. If Express doesn't find a route, it sends 404 and closes the request.
// This middleware detects /matchmake requests, lets the CORS headers be applied,
// and then STOPS Express from processing further (by NOT calling next()).
// This leaves the response open for the Colyseus listener to handle.
app.use('/matchmake', (req, res, next) => {
    // Do nothing and return. Do NOT call next().
    // This yields control to the parallel Colyseus listener.
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