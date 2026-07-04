import React from "react";
import { DndContext, useSensor, useSensors, PointerSensor, KeyboardSensor, DragOverlay } from "@dnd-kit/core";
import { useDashboardState } from "../hooks/useDashboardState";
import { ShipmentList } from "./ShipmentList";
import { ContainerSlot } from "./ContainerSlot";
import { ToastContainer } from "./Toast";
import { DemoConflictButton } from "./DemoConflictButton";
import { ShieldCheck, WifiOff } from "lucide-react";
import { ShipmentCard } from "./ShipmentCard";

export default function Dashboard() {
  const {
    state,
    toasts,
    removeToast,
    handleDragStart,
    handleDragEnd,
    executeMove,
    isConnected,
    activeId
  } = useDashboardState();

  // Configure pointer and keyboard DND sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5 // avoids accidentally dragging when clicking
      }
    }),
    useSensor(KeyboardSensor)
  );

  // Loading state — plain CSS progress bar, no Framer Motion
  if (state.loading) {
    return (
      <div className="dashboard-loading-overlay">
        <h2>Configuring Collaborative Sandbox...</h2>
        <div className="loading-progress-bar">
          <div className="loading-progress-bar-fill" />
        </div>
        <p>Syncing in-memory state registers via HTTP & WebSockets</p>
      </div>
    );
  }

  // Identify cargo in the available pool
  const availableShipments = state.shipments.filter(
    (s) => !state.containers.some((c) => c.contents.includes(s.id))
  );

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="dashboard-app-container">
        {/* Main Navigation Header */}
        <header className="dashboard-app-header">
          <div className="brand-group">
            <h1>COLLISION-AGILE WORKSPACE</h1>
            <p>Real-Time Distributed Logistics Dispatch Console</p>
          </div>
          
          <div className={`status-badge-group ${isConnected ? "connected" : "disconnected"}`}>
            {isConnected ? (
              <>
                <ShieldCheck size={14} className="status-icon" />
                <span>SOCKETS ONLINE</span>
                <span className="pulse-indicator"></span>
              </>
            ) : (
              <>
                <WifiOff size={14} className="status-icon" />
                <span>SOCKETS OFFLINE</span>
              </>
            )}
          </div>
        </header>

        {/* Dashboard Grid Workspace */}
        <main className="dashboard-app-main">
          <div className="layout-left-panel">
            <ShipmentList shipments={availableShipments} />
          </div>

          <div className="layout-right-panel">
            <div className="containers-flex-row">
              {state.containers.map((container) => {
                const assignedCargo = state.shipments.filter((s) =>
                  container.contents.includes(s.id)
                );
                return (
                  <ContainerSlot
                    key={container.id}
                    container={container}
                    shipments={assignedCargo}
                    onRemoveShipment={(shipmentId) =>
                      executeMove(shipmentId, "available", container.id)
                    }
                  />
                );
              })}
            </div>
          </div>
        </main>

        {/* Docked Control Console */}
        <footer className="dashboard-app-footer">
          <DemoConflictButton
            shipments={state.shipments}
            containers={state.containers}
            conflictLogs={state.conflictLogs}
          />
        </footer>

        {/* DragOverlay for smooth cross-container dragging */}
        <DragOverlay dropAnimation={null}>
          {activeId ? (
            <ShipmentCard
              shipment={state.shipments.find((s) => s.id === activeId)}
              variant={availableShipments.some((s) => s.id === activeId) ? "card" : "chip"}
              isOverlay={true}
            />
          ) : null}
        </DragOverlay>

        {/* Toast Notification Layer */}
        <ToastContainer toasts={toasts} onClose={removeToast} />
      </div>
    </DndContext>
  );
}
