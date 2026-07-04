// In-memory data store for shipments and containers

export const containers = [
  {
    id: "container-a",
    name: "Alpha Cargo Container",
    maxCapacityKg: 100,
    currentCostPerKg: 5.00,
    contents: [], // Array of shipment IDs
    currentWeightKg: 0
  },
  {
    id: "container-b",
    name: "Beta Freight Container",
    maxCapacityKg: 150,
    currentCostPerKg: 4.50,
    contents: [],
    currentWeightKg: 0
  },
  {
    id: "container-c",
    name: "Gamma Carrier Container",
    maxCapacityKg: 200,
    currentCostPerKg: 4.00,
    contents: [],
    currentWeightKg: 0
  }
];

export const shipments = [
  { id: "shipment-1", name: "Medical Supplies", weightKg: 20, status: "available" },
  { id: "shipment-2", name: "Consumer Electronics", weightKg: 35, status: "available" },
  { id: "shipment-3", name: "Industrial Generator", weightKg: 90, status: "available" },
  { id: "shipment-4", name: "Automotive Engines", weightKg: 50, status: "available" },
  { id: "shipment-5", name: "Organic Produce", weightKg: 15, status: "available" },
  { id: "shipment-6", name: "Textiles & Apparel", weightKg: 25, status: "available" },
  { id: "shipment-7", name: "Server Rack Modules", weightKg: 80, status: "available" },
  { id: "shipment-8", name: "Aviation Spares", weightKg: 45, status: "available" },
  { id: "shipment-9", name: "Scientific Lab Gear", weightKg: 30, status: "available" },
  { id: "shipment-10", name: "Chemical Drums", weightKg: 60, status: "available" },
  { id: "shipment-11", name: "Heavy Machining Tool", weightKg: 110, status: "available" },
  { id: "shipment-12", name: "Lithium Batteries", weightKg: 40, status: "available" }
];

// Helper to calculate and cache derived weights of all containers
export function recalculateWeights() {
  containers.forEach(container => {
    container.currentWeightKg = container.contents.reduce((sum, shipId) => {
      const shipment = shipments.find(s => s.id === shipId);
      return sum + (shipment ? shipment.weightKg : 0);
    }, 0);
  });
}

// Get full state
export function getState() {
  recalculateWeights();
  return {
    containers,
    shipments
  };
}

// Mutate a shipment's location (and optionally status)
// ASSUMPTION: If targetContainerId is null or "available", the shipment is returned to the available pool.
export function moveShipment(shipmentId, targetContainerId, status = "confirmed") {
  // 1. Remove shipment from its current container contents
  containers.forEach(container => {
    container.contents = container.contents.filter(id => id !== shipmentId);
  });

  const shipment = shipments.find(s => s.id === shipmentId);
  if (!shipment) return null;

  if (targetContainerId && targetContainerId !== "available") {
    const container = containers.find(c => c.id === targetContainerId);
    if (container) {
      if (!container.contents.includes(shipmentId)) {
        container.contents.push(shipmentId);
      }
      shipment.status = status;
    }
  } else {
    shipment.status = "available";
  }

  recalculateWeights();
  return shipment;
}
