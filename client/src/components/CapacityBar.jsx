import React from "react";

export function CapacityBar({ currentWeight, maxCapacity }) {
  const percentage = Math.min(100, Math.max(0, (currentWeight / maxCapacity) * 100));
  
  // Dynamic color thresholding
  let barColor = "var(--success-color, #10b981)"; // Green
  
  if (percentage > 85) {
    barColor = "var(--error-color, #ef4444)"; // Red
  } else if (percentage > 60) {
    barColor = "var(--warning-color, #f59e0b)"; // Orange/yellow
  }

  return (
    <div className="capacity-bar-container">
      <div className="capacity-bar-labels">
        <span className="capacity-bar-percentage mono-metric">{percentage.toFixed(1)}% Full</span>
        <span className="capacity-bar-stats mono-metric">
          {currentWeight.toFixed(1)} / {maxCapacity.toFixed(1)} kg
        </span>
      </div>
      <div className="capacity-bar-track">
        <div
          className="capacity-bar-fill"
          style={{ backgroundColor: barColor, width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
