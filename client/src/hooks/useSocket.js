// Custom hook to manage socket connections and event dispatching

import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import { SERVER_URL } from "../config";

let socketToastCounter = 0;

export function useSocket(dispatch, addToast) {
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const hasConnectedOnceRef = useRef(false);
  const wasConnectedRef = useRef(false);

  useEffect(() => {
    // Connect to the backend socket server using centralized config URL
    const socket = io(SERVER_URL);
    socketRef.current = socket;

    socket.on("connect", () => {
      console.log("WebSocket connected to server.");
      setIsConnected(true);

      // Trigger "connection restored" toast only if we were connected before and lost it
      if (hasConnectedOnceRef.current && !wasConnectedRef.current) {
        addToast({
          id: `reconnect-${socketToastCounter++}`,
          type: "success",
          title: "Back online",
          message: "Connection to the server has been restored. You're back in sync."
        });
      }
      hasConnectedOnceRef.current = true;
      wasConnectedRef.current = true;
    });

    socket.on("disconnect", () => {
      console.log("WebSocket disconnected from server.");
      setIsConnected(false);

      // Trigger connection lost toast exactly once, avoiding spam during reconnection retries
      if (wasConnectedRef.current) {
        addToast({
          id: `disconnect-${socketToastCounter++}`,
          type: "error",
          title: "Connection lost",
          message: "Lost connection to the server. Trying to reconnect automatically..."
        });
        wasConnectedRef.current = false;
      }
    });

    socket.on("connect_error", () => {
      setIsConnected(false);

      // Treat connection errors as disconnected
      if (wasConnectedRef.current) {
        addToast({
          id: `disconnect-${socketToastCounter++}`,
          type: "error",
          title: "Connection lost",
          message: "Lost connection to the server. Trying to reconnect automatically..."
        });
        wasConnectedRef.current = false;
      }
    });

    // Handle container stream simulator ticks
    socket.on("container:updated", (container) => {
      dispatch({ type: "CONTAINER_UPDATED", payload: container });
    });

    // Handle instant remote locks
    socket.on("shipment:locked", ({ shipmentId, containerId }) => {
      dispatch({ type: "REMOTE_LOCK", payload: { shipmentId, containerId } });
    });

    // Handle remote unlocks (rolls back locks)
    socket.on("shipment:unlocked", ({ shipmentId }) => {
      dispatch({ type: "REMOTE_UNLOCK", payload: { shipmentId } });
    });

    // Handle confirmed moves
    socket.on("shipment:confirmed", ({ shipmentId, containerId }) => {
      dispatch({ type: "MOVE_CONFIRMED", payload: { shipmentId, containerId } });
    });

    // Handle logs for concurrent collisions
    socket.on("conflict:logged", ({ shipmentId, containerId, requestId, payload }) => {
      dispatch({
        type: "ADD_CONFLICT_LOG",
        payload: {
          timestamp: Date.now(),
          shipmentId,
          containerId,
          requestId,
          details: payload
        }
      });

      addToast({
        id: `conflict-${socketToastCounter++}`,
        type: "conflict",
        title: "Collision detected",
        message: `Two users tried to move the same cargo at the same time. The first request went through, and the second was automatically rejected to prevent double-booking.`
      });
    });

    return () => {
      socket.disconnect();
    };
  }, [dispatch, addToast]);

  return isConnected;
}
