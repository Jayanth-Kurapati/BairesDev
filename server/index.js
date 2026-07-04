// Express + Socket.io Server Entrypoint

import express from "express";
import http from "http";
import cors from "cors";
import { initSocket } from "./socket.js";
import { startStreamSimulator } from "./streamSimulator.js";
import { getState } from "./state.js";
import { handleMoveShipment } from "./moveHandler.js";

const app = express();

// Enable CORS for frontend client
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));
app.use(express.json());

// API Endpoints
app.get("/api/state", (req, res) => {
  try {
    const state = getState();
    res.json(state);
  } catch (error) {
    res.status(500).json({ error: "Failed to retrieve workspace state: " + error.message });
  }
});

app.post("/api/move", handleMoveShipment);

// Create HTTP and WebSocket server
const server = http.createServer(app);
initSocket(server);

// Start the 3-second capacity/cost simulation engine
startStreamSimulator();

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 Collision-Agile Logistics Server Running!`);
  console.log(`   HTTP: http://localhost:${PORT}/api/state`);
  console.log(`   Websocket: WS port ${PORT}`);
  console.log(`===================================================`);
});
