import { Server } from "socket.io";

let io = null;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Clean disconnects
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

/**
 * Broadcasts an event to all connected clients
 */
export function broadcast(event, data) {
  if (io) {
    io.emit(event, data);
  } else {
    console.warn("Socket.io is not initialized. Cannot broadcast event:", event);
  }
}
