# Collision-Agile Dynamic Workspace

A real-time collaborative logistics dashboard where multiple clients can drag cargo shipments into weight-limited containers. The workspace utilizes optimistic UI rendering, a custom backend concurrency mutex lock, and instant synchronization across clients via Socket.io.

---

## Technical Stack & Architecture

### Backend
- **Framework:** Node.js + Express
- **Real-time Sync:** Socket.io
- **Concurrency Locks:** Custom, in-memory double map (`containerLocks` & `shipmentLocks`) operating in-process. No third-party packages or databases.
- **State Store:** In-memory array models of containers and shipments, recalculating derived weights on mutation and load.
- **Simulator:** Background stream engine adjusting container capacity ($\pm$5-15%) and dynamic pricing ($\pm$10%) every 3 seconds.

### Frontend
- **Framework:** React 18 (Vite, JavaScript)
- **Drag-and-Drop:** `@dnd-kit/core` supporting pointer interaction and keyboard accessibility.
- **Animations:** `framer-motion` supporting entry states, progress bar resizing, and physical snap-back layout translations.
- **Styling:** Premium slate-space dark mode theme with glassmorphic cards and glowing highlights using vanilla CSS variables.

---

## Setup & Running the Project

### Prerequisites
- [Node.js](https://nodejs.org) (v18+ recommended)
- `npm` (packaged with Node)

### Installation

1. Clone or extract the project files into a directory.
2. Install server dependencies:
   ```bash
   cd server
   npm install
   ```
3. Install client dependencies:
   ```bash
   cd ../client
   npm install
   ```

### Running Locally

You must run the **Server** and the **Client** concurrently on separate ports:

1. **Start the Express + Socket.io Server (Port 3001):**
   ```bash
   cd server
   npm run dev
   ```
2. **Start the Vite React Client (Port 5173):**
   ```bash
   cd client
   npm run dev
   ```
3. Open `http://localhost:5173` in your browser. To test collaborative locks, open another window in incognito mode side-by-side.

---

## Self-Check (Requirement 8)

### (a) What Was Implemented

1. **Custom Concurrency Lock Engine:** Built `server/locks.js` using in-memory `Map` lookups. Check and acquisition happen in the same execution tick (synchronously) ensuring atomic locking behavior on Node's single-threaded event loop.
2. **Real Delayed Transaction Resolution:** Implemented a real 2500ms `setTimeout` on the backend for `/api/move` requests, allowing concurrent locks, race conditions, and capacity validations to happen realistically.
3. **Collision Detection Payload:** Computes and returns immediate conflict details containing actual runtime values (Date stamps, collision delay milliseconds, actual capacity gap missed, compute waste, and winner's request ID) without hardcoding or faking.
4. **Flicker-Free Client Reconciliation:** Implemented a custom state reconciler in the React client's dashboard reducer that maintains optimistic drops while merging background live-stream capacity and cost ticks, avoiding abrupt UI snaps.
5. **Layout-Preserving Snap-back Animation:** Shared a Framer Motion `layoutId` across cargo card lists and container chips. If a drop fails, the element physically slides back to its original slot.
6. **Demo Collision Tool:** Built a "Collision Engine Console" widget that lets the user choose a shipment and target container and dispatch two requests 10ms apart, printing the winner and the loser's full JSON collision response payload.

### (b) What Was Assumed

- **Workspace Boundaries:** Assumed shipments can be moved from the available pool into containers, between containers, or returned to the available pool by clicking the remove (`&times;`) button on container chips.
- **Lock Scope:** Assumed a move request locks both the target container (to prevent concurrent space allocation races) and the shipment card (to prevent double moves). Returning a shipment to the available pool only locks the shipment (since the available pool is infinite).
- **Socket Broadcasts:** Assumed that all other clients should receive visual `locked-by-other` greying states, locking out other drags on the same item. If a local user is actively dragging an item that becomes locked, the drag is aborted client-side and returned to its list.

### (c) Known Limitations

- **Process Memory Limit:** Since all data is stored in memory in a single Node process, state is lost upon server restart.
- **Client Networking:** If the WebSocket connection fails, live capacity and locked states will cease updating until the connection is re-established.
