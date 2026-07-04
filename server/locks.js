// In-memory concurrency locks manager

export const containerLocks = new Map(); // containerId -> { requestId, lockedAt, shipmentId }
export const shipmentLocks  = new Map(); // shipmentId  -> { requestId, lockedAt, containerId }

/**
 * Checks if a resource is currently locked.
 * Returns the lock details if locked, or null otherwise.
 */
export function getContainerLock(containerId) {
  if (!containerId || containerId === "available") return null;
  return containerLocks.get(containerId) || null;
}

export function getShipmentLock(shipmentId) {
  return shipmentLocks.get(shipmentId) || null;
}

/**
 * Synchronously checks and acquires locks for both shipment and container in one event loop tick.
 * If either is locked, returns the active lock details to indicate a collision.
 * Otherwise, acquires the lock(s) and returns null (indicating success).
 */
export function tryAcquireLocks(shipmentId, containerId, requestId) {
  const isTargetingContainer = containerId && containerId !== "available";

  const sLock = getShipmentLock(shipmentId);
  const cLock = isTargetingContainer ? getContainerLock(containerId) : null;

  // Collision detected
  if (sLock || cLock) {
    return {
      collision: true,
      winningLock: sLock || cLock,
      conflictingResource: sLock ? "shipment" : "container"
    };
  }

  // No collision - acquire locks synchronously in the same tick
  const lockedAt = Date.now();
  shipmentLocks.set(shipmentId, { requestId, lockedAt, containerId });
  if (isTargetingContainer) {
    containerLocks.set(containerId, { requestId, lockedAt, shipmentId });
  }

  return {
    collision: false
  };
}

/**
 * Releases both shipment and container locks for a request.
 */
export function releaseLocks(shipmentId, containerId) {
  shipmentLocks.delete(shipmentId);
  if (containerId && containerId !== "available") {
    containerLocks.delete(containerId);
  }
}
