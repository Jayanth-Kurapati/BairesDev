import React from "react";
import { X, CheckCircle2, AlertTriangle, AlertOctagon, Info } from "lucide-react";

export function ToastContainer({ toasts, onClose }) {
  return (
    <div className="toast-container-wrapper">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast-item toast-${toast.type}`}
        >
          <div className="toast-icon-box">
            {toast.type === "success" && <CheckCircle2 className="icon-success" size={20} />}
            {toast.type === "error" && <AlertOctagon className="icon-error" size={20} />}
            {toast.type === "conflict" && <AlertTriangle className="icon-conflict" size={20} />}
            {toast.type === "info" && <Info className="icon-info" size={20} />}
          </div>
          <div className="toast-content">
            <div className="toast-title">{toast.title}</div>
            <div className="toast-desc">{toast.message}</div>
          </div>
          <button className="toast-close" onClick={() => onClose(toast.id)}>
            <X size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
