// Move request controller

import { tryAcquireLocks, releaseLocks } from "./locks.js";
import { shipments, containers, moveShipment } from "./state.js";
import { broadcast } from "./socket.js";

/**
 * Handles the POST /api/move endpoint
 */
export function handleMoveShipment(req, res) {
  const { shipmentId, containerId, requestId } = req.body;

  // 0. Input validation
  if (!shipmentId || !requestId) {
    return res.status(400).json({ error: "Missing required fields: shipmentId, requestId" });
  }

  // Find the shipment in state
  const shipment = shipments.find(s => s.id === shipmentId);
  if (!shipment) {
    return res.status(404).json({ error: "Shipment not found" });
  }

  // Find container in state (if moving to a container)
  const isTargetingContainer = containerId && containerId !== "available";
  const container = isTargetingContainer ? containers.find(c => c.id === containerId) : null;
  if (isTargetingContainer && !container) {
    return res.status(404).json({ error: "Container not found" });
  }

  // Save the original status and container ID in case we need to roll back on rejection
  const originalStatus = shipment.status;
  const originalContainer = containers.find(c => c.contents.includes(shipmentId));
  const originalContainerId = originalContainer ? originalContainer.id : "available";

  // 1. Synchronously verify locks in the same event tick
  // If either the container or shipment is locked, this triggers an immediate collision.
  const lockResult = tryAcquireLocks(shipmentId, containerId, requestId);

  // 2. Genuine collision rejection payload (Instant return, no 2.5s delay)
  if (lockResult.collision) {
    const collisionTimestampMs = Date.now();
    const winningLock = lockResult.winningLock;
    const heldSinceMs = winningLock.lockedAt;
    const collisionDelayMs = collisionTimestampMs - heldSinceMs;

    // Fractional Capacity Missed: gap between weight and available capacity at collision time
    let fractionalCapacityMissed = shipment.weightKg;
    if (isTargetingContainer && container) {
      const remainingCapacity = Math.max(0, container.maxCapacityKg - container.currentWeightKg);
      const gap = shipment.weightKg - remainingCapacity;
      fractionalCapacityMissed = gap > 0 ? gap : 0;
    } else {
      // Moving back to available pool does not hit capacity constraints
      fractionalCapacityMissed = 0;
    }

    const payload = {
      status: "CONFLICT",
      collisionTimestampMs,
      heldSinceMs,
      collisionDelayMs,
      fractionalCapacityMissed: Math.round(fractionalCapacityMissed * 10) / 10,
      computeWasteMs: collisionDelayMs,
      conflictingResource: lockResult.conflictingResource,
      conflictWith: { requestId: winningLock.requestId }
    };

    // Log the conflict event to listeners for visual activity feeds
    broadcast("conflict:logged", {
      shipmentId,
      containerId,
      requestId,
      payload
    });

    return res.status(409).json(payload);
  }

  // Lock acquired successfully! 
  // Update shipment status to "locked" in server state for cold page load safety
  shipment.status = "locked";

  // 3. Broadcast shipment:locked event immediately to other clients
  broadcast("shipment:locked", { shipmentId, containerId });

  // 4. Start a real delay of exactly 2500ms
  setTimeout(() => {
    // 5. After delay, re-validate capacity
    if (isTargetingContainer && container) {
      // Verify if container has capacity
      const isAlreadyInside = container.contents.includes(shipmentId);
      const currentContainerWeightWithoutThis = container.currentWeightKg - (isAlreadyInside ? shipment.weightKg : 0);
      const requiredWeight = currentContainerWeightWithoutThis + shipment.weightKg;

      if (requiredWeight > container.maxCapacityKg) {
        // Revert shipment status and release locks
        shipment.status = originalStatus;
        releaseLocks(shipmentId, containerId);

        // Broadcast shipment:unlocked
        broadcast("shipment:unlocked", { shipmentId });

        // ASSUMPTION (Issue 5): Guard against dead client connections. State changes and broadcasts always
        // happen regardless of whether the original requester is still there to receive the HTTP response, 
        // since the transaction's effect on shared state is independent of one client's connection.
        if (!res.headersSent) {
          res.status(422).json({
            status: "REJECTED",
            reason: "CAPACITY_EXCEEDED",
            availableCapacityKg: Math.max(0, container.maxCapacityKg - currentContainerWeightWithoutThis),
            requiredKg: shipment.weightKg
          });
        }
        return;
      }
    }

    // Success! Mutate state and release locks
    moveShipment(shipmentId, containerId, "confirmed");
    releaseLocks(shipmentId, containerId);

    // Broadcast updates to all clients
    if (isTargetingContainer && container) {
      broadcast("container:updated", container);
    }
    
    // If the shipment was moved from another container, broadcast that container's update too
    if (originalContainerId !== "available" && originalContainerId !== containerId) {
      const oldContainer = containers.find(c => c.id === originalContainerId);
      if (oldContainer) {
        // Recalculate weights of containers since shipment has been moved
        const oldIndex = oldContainer.contents.indexOf(shipmentId);
        if (oldIndex > -1) {
          oldContainer.contents.splice(oldIndex, 1);
        }
        oldContainer.currentWeightKg = oldContainer.contents.reduce((sum, id) => {
          const s = shipments.find(x => x.id === id);
          return sum + (s ? s.weightKg : 0);
        }, 0);
        broadcast("container:updated", oldContainer);
      }
    }

    // Broadcast shipment:confirmed
    broadcast("shipment:confirmed", { shipmentId, containerId });

    // ASSUMPTION (Issue 5): Guard against dead client connections. State changes and broadcasts always
    // happen regardless of whether the original requester is still there to receive the HTTP response, 
    // since the transaction's effect on shared state is independent of one client's connection.
    if (!res.headersSent) {
      res.status(200).json({
        status: "SUCCESS",
        shipmentId,
        containerId
      });
    }
  }, 2500);
}
