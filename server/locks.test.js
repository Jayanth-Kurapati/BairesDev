// Unit tests for the custom in-memory concurrency locks manager

import { describe, it, expect, beforeEach } from "vitest";
import { tryAcquireLocks, releaseLocks, containerLocks, shipmentLocks } from "./locks.js";

describe("Locks Manager Unit Tests", () => {
  beforeEach(() => {
    // Clear shared maps between tests to ensure test isolation
    containerLocks.clear();
    shipmentLocks.clear();
  });

  it("1. Acquiring a lock on a free shipment+container succeeds (returns { collision: false })", () => {
    const result = tryAcquireLocks("shipment-1", "container-a", "req-1");
    expect(result).toEqual({ collision: false });
    expect(shipmentLocks.has("shipment-1")).toBe(true);
    expect(containerLocks.has("container-a")).toBe(true);
  });

  it("2. A second call for the same shipment while the first lock is still held returns collision on shipment", () => {
    const acquire1 = tryAcquireLocks("shipment-1", "container-a", "req-1");
    expect(acquire1.collision).toBe(false);

    const acquire2 = tryAcquireLocks("shipment-1", "container-b", "req-2");
    expect(acquire2.collision).toBe(true);
    expect(acquire2.conflictingResource).toBe("shipment");
    expect(acquire2.winningLock.requestId).toBe("req-1");
  });

  it("3. A second call for a different shipment but the same container while the first lock is held returns collision on container", () => {
    const acquire1 = tryAcquireLocks("shipment-1", "container-a", "req-1");
    expect(acquire1.collision).toBe(false);

    const acquire2 = tryAcquireLocks("shipment-2", "container-a", "req-2");
    expect(acquire2.collision).toBe(true);
    expect(acquire2.conflictingResource).toBe("container");
    expect(acquire2.winningLock.requestId).toBe("req-1");
  });

  it("4. After releaseLocks is called, a subsequent tryAcquireLocks for the same resources succeeds again", () => {
    tryAcquireLocks("shipment-1", "container-a", "req-1");
    releaseLocks("shipment-1", "container-a");

    const result = tryAcquireLocks("shipment-1", "container-a", "req-2");
    expect(result).toEqual({ collision: false });
  });

  it("5. Moving a shipment to 'available' (or null) does not require or check a container lock (since the available pool is unlimited)", () => {
    // Lock container-a with a different transaction
    tryAcquireLocks("shipment-2", "container-a", "req-1");

    // Try moving shipment-1 to "available" targeting container-a (should succeed because container lock isn't required/checked for 'available')
    const result1 = tryAcquireLocks("shipment-1", "available", "req-2");
    expect(result1).toEqual({ collision: false });

    // Also check moving targeting null container
    const result2 = tryAcquireLocks("shipment-3", null, "req-3");
    expect(result2).toEqual({ collision: false });
  });

  it("6. Two different shipments moving into two different containers simultaneously both succeed (no false-positive collision)", () => {
    const result1 = tryAcquireLocks("shipment-1", "container-a", "req-1");
    const result2 = tryAcquireLocks("shipment-2", "container-b", "req-2");
    expect(result1).toEqual({ collision: false });
    expect(result2).toEqual({ collision: false });
  });
});
