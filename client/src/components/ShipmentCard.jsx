import React from "react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Lock, Weight } from "lucide-react";

export function ShipmentCard({ shipment, variant = "card", onRemove, isOverlay = false }) {
  const isPending = shipment.status === "pending";
  const isLocked = shipment.status === "locked";
  const isInteractive = shipment.status === "available" && !isOverlay;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: shipment.id,
    disabled: !isInteractive || isOverlay
  });

  // When using DragOverlay, the original element stays in place.
  const style = transform && !isDragging
    ? {
        transform: CSS.Transform.toString(transform),
        zIndex: 999,
        cursor: "grabbing"
      }
    : {
        cursor: isInteractive ? (isDragging ? "grabbing" : "grab") : "not-allowed"
      };

  // Visual classes
  const cardClass = `shipment-node ${variant}-variant status-${shipment.status} ${
    isDragging ? "dragging-active" : ""
  } ${isPending ? "status-pending" : ""} ${isLocked ? "status-locked" : ""}`;

  if (variant === "chip") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cardClass}
      >
        <div className="chip-details">
          <Weight size={12} className="chip-icon-weight" />
          <span className="chip-name">{shipment.name}</span>
          <span className="chip-weight mono-metric">{shipment.weightKg}kg</span>
        </div>

        <div className="chip-actions">
          {isLocked && <Lock size={12} className="lock-icon" />}
          {isPending && <span className="chip-pending-label">transferring...</span>}
          {shipment.status === "confirmed" && onRemove && (
            <button
              className="chip-remove-btn"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(shipment.id);
              }}
              title="Return shipment to available pool"
            >
              &times;
            </button>
          )}
        </div>
      </div>
    );
  }

  // Full Card Variant (for available shipments list)
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
      {...attributes}
      {...listeners}
    >
      <div className="card-header">
        <h4 className="card-title">{shipment.name}</h4>
        {isLocked && (
          <div className="card-status-flat locked-text" title="Locked by another user's request">
            <Lock size={11} />
            <span>LOCKED</span>
          </div>
        )}
        {isPending && (
          <div className="card-status-flat pending-text">
            <span>PENDING</span>
          </div>
        )}
        {isInteractive && (
          <div className="card-status-flat stable-text">
            <span className="stable-dot"></span>
            <span>STABLE</span>
          </div>
        )}
      </div>

      <div className="card-body">
        <div className="card-stat">
          <span className="stat-label">Weight Class:</span>
          <span className="stat-val mono-metric">{shipment.weightKg} kg</span>
        </div>
      </div>
    </div>
  );
}
