// API client utility
import { API_URL } from "../config";

const BASE_URL = API_URL;

/**
 * Fetches the complete workspace state (containers and shipments)
 */
export async function fetchState() {
  const response = await fetch(`${BASE_URL}/state`);
  if (!response.ok) {
    throw new Error(`Failed to load initial state. HTTP status: ${response.status}`);
  }
  return response.json();
}

/**
 * Submits a shipment move request to the backend.
 * Handles HTTP 409 (Conflict) and HTTP 422 (Rejected) responses by parsing the JSON details.
 */
export async function moveShipment(shipmentId, containerId, requestId) {
  try {
    const response = await fetch(`${BASE_URL}/move`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        shipmentId,
        containerId: containerId === "available" ? null : containerId,
        requestId
      })
    });

    const data = await response.json();
    // Return parsed JSON payload (success, conflict, or capacity rejection)
    if (data && data.status) {
      return data;
    }

    return {
      status: "ERROR",
      message: data.error || `Server responded with status ${response.status}`
    };
  } catch (error) {
    return {
      status: "ERROR",
      message: error.message || "Network request failed. Please check backend connection."
    };
  }
}
