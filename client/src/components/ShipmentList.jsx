import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { ShipmentCard } from "./ShipmentCard";

export function ShipmentList({ shipments }) {
  const { setNodeRef, isOver } = useDroppable({
    id: "available"
  });

  return (
    <div
      ref={setNodeRef}
      className={`shipment-list-panel ${isOver ? "active-drag-over" : ""}`}
    >
      <div className="panel-heading">
        <h3 className="panel-title">Available Cargo</h3>
        <span className="panel-badge">{shipments.length} Items</span>
      </div>
      
      <div className="panel-body">
        {shipments.length === 0 ? (
          <div className="empty-panel-prompt">
            <div className="empty-icon-box">📦</div>
            <h4>Cargo Pool Empty</h4>
            <p>Drag items back here to return them to the available pool.</p>
          </div>
        ) : (
          <div className="available-shipments-list">
            {shipments.map((shipment) => (
              <ShipmentCard key={shipment.id} shipment={shipment} variant="card" />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
