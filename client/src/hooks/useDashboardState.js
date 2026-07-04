// Hook managing dashboard state, API actions, and drag-and-drop callbacks

import { useReducer, useEffect, useState, useCallback } from "react";
import { dashboardReducer, initialState } from "../state/dashboardReducer";
import { fetchState, moveShipment } from "../api/client";
import { useSocket } from "./useSocket";

// Incremental counter for generating guaranteed-unique toast notifications
let toastCounter = 0;

export function useDashboardState() {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  const [toasts, setToasts] = useState([]);
  const [activeId, setActiveId] = useState(null);

  // Helper to add toast notifications
  const addToast = useCallback((toast) => {
    setToasts((prev) => [...prev, toast]);
    // Auto-remove toast after 8000ms (polishing pass)
    setTimeout(() => {
      removeToast(toast.id);
    }, 8000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Connect to Socket.io, bind listeners, and capture connection status
  const isConnected = useSocket(dispatch, addToast);

  // Load initial state from server on mount
  useEffect(() => {
    let active = true;
    async function loadData() {
      try {
        const data = await fetchState();
        if (active) {
          dispatch({ type: "INITIALIZE_STATE", payload: data });
        }
      } catch (err) {
        if (active) {
          addToast({
            id: `load-error-${toastCounter++}`,
            type: "error",
            title: "Could not load data",
            message: "Something went wrong while connecting to the server. Please refresh the page and try again."
          });
        }
      }
    }
    loadData();
    return () => {
      active = false;
    };
  }, [addToast]);

  // Cancel local drag if the active item is locked remotely
  useEffect(() => {
    if (activeId) {
      const activeShipment = state.shipments.find((s) => s.id === activeId);
      if (activeShipment && activeShipment.status === "locked") {
        addToast({
          id: `cancel-${toastCounter++}`,
          type: "error",
          title: "Cargo is no longer available",
          message: "Another user just started moving this cargo. Your drag has been cancelled."
        });
        setActiveId(null);
      }
    }
  }, [state.shipments, activeId, addToast]);

  // Function to coordinate shipment moves
  const executeMove = useCallback(
    async (shipmentId, targetContainerId, sourceContainerId) => {
      if (targetContainerId === sourceContainerId) return;

      const requestId = `req-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

      // 1. Dispatch optimistic move (moves card and updates weight immediately)
      dispatch({
        type: "MOVE_OPTIMISTIC",
        payload: { shipmentId, targetContainerId, sourceContainerId, requestId }
      });

      // 2. Fire API call to backend (triggers 2.5s delay on server if successful lock)
      const res = await moveShipment(shipmentId, targetContainerId, requestId);

      if (res.status === "SUCCESS") {
        // Success!
        dispatch({ type: "MOVE_CONFIRMED", payload: { shipmentId, containerId: targetContainerId } });
        
        const containerName = targetContainerId === "available" 
          ? "Available Pool" 
          : state.containers.find(c => c.id === targetContainerId)?.name || "Container";

        addToast({
          id: `success-${toastCounter++}`,
          type: "success",
          title: "Cargo loaded successfully",
          message: `The cargo has been placed into ${containerName}.`
        });
      } else if (res.status === "REJECTED") {
        // Capacity rejected
        dispatch({
          type: "MOVE_REJECTED",
          payload: { shipmentId, sourceContainerId, targetContainerId }
        });

        const remainingSpace = res.availableCapacityKg !== undefined ? `${res.availableCapacityKg.toFixed(1)}kg` : "limited space";
        const cargoWeight = res.requiredKg !== undefined ? `${res.requiredKg.toFixed(1)}kg` : "cargo";

        addToast({
          id: `rejected-${toastCounter++}`,
          type: "error",
          title: "Not enough space",
          message: `This cargo weighs ${cargoWeight}, but the container only has ${remainingSpace} of space left. Try a different container.`
        });
      } else if (res.status === "CONFLICT") {
        // Collision conflict
        dispatch({
          type: "MOVE_REJECTED",
          payload: { shipmentId, sourceContainerId, targetContainerId }
        });
        // Note: The socket 'conflict:logged' will also show a toast detailing the collision.
        // We do not double-toast here, but we roll back the UI immediately.
      } else {
        // General error / Network down
        dispatch({
          type: "MOVE_REJECTED",
          payload: { shipmentId, sourceContainerId, targetContainerId }
        });

        addToast({
          id: `error-${toastCounter++}`,
          type: "error",
          title: "Something went wrong",
          message: "The server couldn't process this move. Please check your connection and try again."
        });
      }
    },
    [state.containers, addToast]
  );

  // Drag start handler
  const handleDragStart = useCallback((event) => {
    const { active } = event;
    const shipment = state.shipments.find((s) => s.id === active.id);
    // Only allow drag if not pending or locked
    if (shipment && shipment.status !== "pending" && shipment.status !== "locked") {
      setActiveId(active.id);
    }
  }, [state.shipments]);

  // Drag end handler
  const handleDragEnd = useCallback(
    (event) => {
      const { active, over } = event;
      setActiveId(null);

      if (!over) return;

      const shipmentId = active.id;
      const targetContainerId = over.id;

      // Determine shipment's current container
      const currentContainer = state.containers.find((c) => c.contents.includes(shipmentId));
      const sourceContainerId = currentContainer ? currentContainer.id : "available";

      // Guard: Cancel if shipment became locked during drag and give visual feedback (Issue 2)
      const shipment = state.shipments.find((s) => s.id === shipmentId);
      if (shipment && shipment.status === "locked") {
        addToast({
          id: `mid-drag-locked-${toastCounter++}`,
          type: "error",
          title: "Cargo is no longer available",
          message: "Another user grabbed this cargo while you were dragging it. Your action has been cancelled."
        });
        return;
      }

      if (targetContainerId !== sourceContainerId) {
        executeMove(shipmentId, targetContainerId, sourceContainerId);
      }
    },
    [state.containers, state.shipments, executeMove, addToast]
  );

  return {
    state,
    toasts,
    addToast,
    removeToast,
    activeId,
    handleDragStart,
    handleDragEnd,
    executeMove,
    isConnected
  };
}
