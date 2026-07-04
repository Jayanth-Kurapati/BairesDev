import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { CapacityBar } from "./CapacityBar";
import { ShipmentCard } from "./ShipmentCard";
import { DollarSign, Box } from "lucide-react";

export function ContainerSlot({ container, shipments, onRemoveShipment }) {
  const { setNodeRef, isOver } = useDroppable({
    id: container.id
  });

  const isNearingCapacity = container.currentWeightKg >= container.maxCapacityKg * 0.9;

  return (
    <div
      ref={setNodeRef}
      className={`container-slot-node ${isOver ? "active-drag-over" : ""} ${
        isNearingCapacity ? "nearing-capacity" : ""
      }`}
    >
      <div className="container-node-header">
        <div className="container-title-group">
          <Box size={18} className="container-box-icon" />
          <h3 className="container-title">{container.name}</h3>
        </div>
        <div className="container-cost-tag">
          <DollarSign size={14} />
          <span>{container.currentCostPerKg.toFixed(2)}/kg</span>
        </div>
      </div>

      <div className="container-node-body">
        {/* Dynamic Capacity Progress Bar */}
        <CapacityBar currentWeight={container.currentWeightKg} maxCapacity={container.maxCapacityKg} />

        {/* Assigned Shipments Chips List */}
        <div className="container-contents-box">
          <div className="contents-box-header">
            <span>Manifest</span>
            <span className="contents-box-weight mono-metric">
              Total: {container.currentWeightKg.toFixed(1)} kg
            </span>
          </div>
          {shipments.length === 0 ? (
            <div className="contents-box-empty">
              <span className="placeholder-text">Empty. Drag and drop cargo cards here.</span>
            </div>
          ) : (
            <div className="contents-box-chips">
              {shipments.map((shipment) => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  variant="chip"
                  onRemove={onRemoveShipment}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
