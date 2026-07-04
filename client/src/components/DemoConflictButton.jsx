import React, { useState } from "react";
import { moveShipment } from "../api/client";
import { Play, Terminal } from "lucide-react";

export function DemoConflictButton({ shipments, containers, conflictLogs }) {
  const [selectedShipment, setSelectedShipment] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("");
  const [running, setRunning] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);

  // Filter out shipments that are not pending to keep options valid
  const availableShipmentOptions = shipments.filter(s => s.status !== "pending");

  const runCollisionTest = async () => {
    if (!selectedShipment || !selectedContainer) return;
    setRunning(true);
    setStatusMessage("Dispatching two concurrent requests...");

    const timestamp = Date.now();
    const req1Id = `WIN-REQ-${timestamp}`;
    const req2Id = `COLLISION-REQ-${timestamp}`;

    try {
      // Fire request 1 (will acquire locks and block for 2.5s)
      const p1 = moveShipment(selectedShipment, selectedContainer, req1Id);
      
      // Short delay of 10ms to ensure sequential TCP delivery to backend
      await new Promise(resolve => setTimeout(resolve, 10));

      // Fire request 2 (will fail immediately at 0ms because lock is already held)
      const p2 = moveShipment(selectedShipment, selectedContainer, req2Id);

      // Wait for both to complete
      const [res1, res2] = await Promise.all([p1, p2]);

      // Show a clean summary instead of raw JSON
      if (res1.status === "SUCCESS" && res2.status === "CONFLICT") {
        setStatusMessage(`Collision detected — Req 1 succeeded, Req 2 rejected in ${res2.collisionDelayMs || 0}ms.`);
      } else {
        setStatusMessage(`Req 1: ${res1.status} | Req 2: ${res2.status}`);
      }
    } catch (err) {
      setStatusMessage(`Error: ${err.message || "Simulated request failed."}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="demo-console-panel">
      <div className="console-header">
        <Terminal size={16} />
        <h4>Collision Engine Console</h4>
      </div>

      <div className="console-body">
        <div>
          <p className="console-tip">
            Simulate a concurrent race condition by firing two <code>/api/move</code> requests back-to-back.
          </p>

          <div className="console-selectors">
            <div className="selector-group">
              <label>Cargo:</label>
              <select
                value={selectedShipment}
                onChange={(e) => setSelectedShipment(e.target.value)}
                disabled={running}
              >
                <option value="">Select Cargo</option>
                {availableShipmentOptions.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.weightKg}kg)
                  </option>
                ))}
              </select>
            </div>

            <div className="selector-group">
              <label>Target:</label>
              <select
                value={selectedContainer}
                onChange={(e) => setSelectedContainer(e.target.value)}
                disabled={running}
              >
                <option value="">Select Container</option>
                {containers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            className="console-trigger-btn"
            disabled={running || !selectedShipment || !selectedContainer}
            onClick={runCollisionTest}
          >
            {running ? "Simulating..." : "Trigger Simulated Collision"}
            <Play size={14} style={{ marginLeft: "6px" }} />
          </button>

          {statusMessage && (
            <div className="console-status-line">{statusMessage}</div>
          )}
        </div>

        {/* Global Conflict Logs Feed */}
        {conflictLogs.length > 0 && (
          <div className="global-feed-box">
            <div className="feed-header">System Broadcast Feed</div>
            <div className="feed-list">
              {conflictLogs.slice(0, 5).map((log, idx) => (
                <div key={idx} className="feed-item">
                  <span className="feed-time">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                  <span>
                    Collision on {log.containerId ? log.containerId.replace("container-", "") : "available"}! Gap: {log.details.fractionalCapacityMissed}kg.
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
