// Live stream simulator that periodically adjusts container attributes

import { containers, recalculateWeights } from "./state.js";
import { broadcast } from "./socket.js";

let intervalId = null;

export function startStreamSimulator() {
  if (intervalId) return;

  intervalId = setInterval(() => {
    recalculateWeights();

    containers.forEach(container => {
      // 1. Mutate capacity by ±5% to 15%
      const capPercent = 0.05 + Math.random() * 0.10; // 5% to 15%
      const capDirection = Math.random() < 0.5 ? -1 : 1;
      let newCap = container.maxCapacityKg * (1 + capDirection * capPercent);

      // Rule: Never drop below current committed weight
      if (newCap < container.currentWeightKg) {
        newCap = container.currentWeightKg;
      }
      
      // Keep within realistic bounds (e.g., minimum 50kg)
      if (newCap < 50) {
        newCap = 50;
      }

      container.maxCapacityKg = Math.round(newCap * 10) / 10;

      // 2. Mutate cost per kg by ±10%
      const costPercent = Math.random() * 0.10; // 0% to 10%
      const costDirection = Math.random() < 0.5 ? -1 : 1;
      let newCost = container.currentCostPerKg * (1 + costDirection * costPercent);

      // Keep within realistic bounds ($0.50 to $15.00)
      if (newCost < 0.50) newCost = 0.50;
      if (newCost > 15.00) newCost = 15.00;

      container.currentCostPerKg = Math.round(newCost * 100) / 100;

      // 3. Broadcast the container:updated event
      broadcast("container:updated", container);
    });
  }, 3000);

  console.log("Live stream simulator started (3000ms tick).");
}

export function stopStreamSimulator() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log("Live stream simulator stopped.");
  }
}
