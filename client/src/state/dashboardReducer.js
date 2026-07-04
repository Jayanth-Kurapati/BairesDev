// State machine reducer for client dashboard

function recalculateContainerWeights(containers, shipments) {
  return containers.map(container => {
    const currentWeightKg = container.contents.reduce((sum, shipId) => {
      const shipment = shipments.find(s => s.id === shipId);
      return sum + (shipment ? shipment.weightKg : 0);
    }, 0);
    return { ...container, currentWeightKg };
  });
}

export const initialState = {
  containers: [],
  shipments: [],
  pendingMoves: {}, // shipmentId -> { sourceContainerId, targetContainerId, requestId }
  conflictLogs: [], // List of recent collisions for the dev console feed
  loading: true
};

export function dashboardReducer(state, action) {
  switch (action.type) {
    case "INITIALIZE_STATE": {
      const { containers, shipments } = action.payload;
      return {
        ...state,
        containers: recalculateContainerWeights(containers, shipments),
        shipments: shipments.map(s => {
          // Double check server status. If it's in contents, ensure it's confirmed
          const isInContainer = containers.some(c => c.contents.includes(s.id));
          return {
            ...s,
            status: s.status === "locked" ? "locked" : (isInContainer ? "confirmed" : "available")
          };
        }),
        loading: false
      };
    }

    case "MOVE_OPTIMISTIC": {
      const { shipmentId, targetContainerId, sourceContainerId, requestId } = action.payload;

      // 1. Update shipment status to pending
      const updatedShipments = state.shipments.map(s => {
        if (s.id === shipmentId) {
          return { ...s, status: "pending" };
        }
        return s;
      });

      // 2. Adjust container contents list optimistically
      const updatedContainers = state.containers.map(c => {
        let contents = [...c.contents];
        // Remove from old container
        if (c.id === sourceContainerId) {
          contents = contents.filter(id => id !== shipmentId);
        }
        // Add to new container
        if (c.id === targetContainerId) {
          if (!contents.includes(shipmentId)) {
            contents.push(shipmentId);
          }
        }
        return { ...c, contents };
      });

      return {
        ...state,
        shipments: updatedShipments,
        containers: recalculateContainerWeights(updatedContainers, updatedShipments),
        pendingMoves: {
          ...state.pendingMoves,
          [shipmentId]: { sourceContainerId, targetContainerId, requestId }
        }
      };
    }

    case "MOVE_CONFIRMED": {
      const { shipmentId, containerId } = action.payload;

      // Update shipment status to confirmed
      const updatedShipments = state.shipments.map(s => {
        if (s.id === shipmentId) {
          return { ...s, status: containerId && containerId !== "available" ? "confirmed" : "available" };
        }
        return s;
      });

      // Clear from pending map
      const updatedPending = { ...state.pendingMoves };
      delete updatedPending[shipmentId];

      return {
        ...state,
        shipments: updatedShipments,
        pendingMoves: updatedPending
      };
    }

    case "MOVE_REJECTED": {
      const { shipmentId, sourceContainerId, targetContainerId } = action.payload;

      // Rollback shipment status
      const updatedShipments = state.shipments.map(s => {
        if (s.id === shipmentId) {
          return {
            ...s,
            status: sourceContainerId && sourceContainerId !== "available" ? "confirmed" : "available"
          };
        }
        return s;
      });

      // Rollback container contents
      const updatedContainers = state.containers.map(c => {
        let contents = [...c.contents];
        // Add back to source container
        if (c.id === sourceContainerId) {
          if (!contents.includes(shipmentId)) {
            contents.push(shipmentId);
          }
        }
        // Remove from failed target container
        if (c.id === targetContainerId) {
          contents = contents.filter(id => id !== shipmentId);
        }
        return { ...c, contents };
      });

      // Clear from pending map
      const updatedPending = { ...state.pendingMoves };
      delete updatedPending[shipmentId];

      return {
        ...state,
        shipments: updatedShipments,
        containers: recalculateContainerWeights(updatedContainers, updatedShipments),
        pendingMoves: updatedPending
      };
    }

    case "REMOTE_LOCK": {
      const { shipmentId } = action.payload;
      
      // If we are currently executing a move on this shipment, ignore remote lock
      if (state.pendingMoves[shipmentId]) {
        return state;
      }

      const updatedShipments = state.shipments.map(s => {
        if (s.id === shipmentId) {
          return { ...s, status: "locked" };
        }
        return s;
      });

      return {
        ...state,
        shipments: updatedShipments
      };
    }

    case "REMOTE_UNLOCK": {
      const { shipmentId } = action.payload;

      // Ignore if we have a pending local operation
      if (state.pendingMoves[shipmentId]) {
        return state;
      }

      // Check if it's currently inside a container
      const isInContainer = state.containers.some(c => c.contents.includes(shipmentId));

      const updatedShipments = state.shipments.map(s => {
        if (s.id === shipmentId) {
          return { ...s, status: isInContainer ? "confirmed" : "available" };
        }
        return s;
      });

      return {
        ...state,
        shipments: updatedShipments
      };
    }

    case "CONTAINER_UPDATED": {
      const serverContainer = action.payload;

      // RECONCILIATION: Rebuild container contents merging local pending updates with server state
      const updatedContainers = state.containers.map(c => {
        if (c.id !== serverContainer.id) {
          return c;
        }

        // Identify shipments that are optimistically being moved INTO or OUT OF this container
        const pendingInto = Object.keys(state.pendingMoves).filter(
          shipId => state.pendingMoves[shipId].targetContainerId === c.id
        );
        const pendingOut = Object.keys(state.pendingMoves).filter(
          shipId => state.pendingMoves[shipId].sourceContainerId === c.id
        );

        // Filter out shipments that we are moving OUT of this container, even if the server still lists them
        let contents = serverContainer.contents.filter(id => !pendingOut.includes(id));

        // Inject shipments that we are moving INTO this container, even if the server doesn't list them yet
        pendingInto.forEach(id => {
          if (!contents.includes(id)) {
            contents.push(id);
          }
        });

        return {
          ...c,
          maxCapacityKg: serverContainer.maxCapacityKg,
          currentCostPerKg: serverContainer.currentCostPerKg,
          contents
        };
      });

      return {
        ...state,
        containers: recalculateContainerWeights(updatedContainers, state.shipments)
      };
    }

    case "ADD_CONFLICT_LOG": {
      return {
        ...state,
        conflictLogs: [action.payload, ...state.conflictLogs].slice(0, 15) // Keep last 15
      };
    }

    default:
      return state;
  }
}
