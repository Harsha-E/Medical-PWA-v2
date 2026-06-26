# MedCheck v3 Project Blueprint

## 1. Architectural Overview
MedCheck v3 is a lightweight, offline-first Progressive Web Application (PWA).
- **Core Principle**: Zero-framework Vanilla ES6 architecture. No build steps, bundlers, or Node.js dependencies for the UI layer.
- **Frontend Layer**: Native HTML5, Vanilla JavaScript classes/modules, CSS3 with Tailwind utility classes.
- **Data Persistence**: IndexedDB via Dexie.js wrapper.
- **Distributed Peer Layer**: WebRTC signaling mesh network via PeerJS, syncing data conflict-free using Y.js (CRDT).
- **Server Environment**: Local development runs via a standard Node.js static file server (`server.js`). Distributed backend utilizes n8n workflows, Supabase Edge Functions, and Groq API.

## 2. State Boundaries & File Paths

### Core Application
- **`index.html`**: The main app shell. Preloads CSS, injects standard libraries via CDN (PeerJS, jsPDF, TensorFlow.js, Tesseract.js), manages dynamic themes, and houses the routing viewport.
- **`app.js`**: Application entry point, router initialization, and splash screen coordinator.
- **`style.css`**: Global stylesheet housing the UI/UX variables, clay-glass panels, and hardware-accelerated animations.
- **`sw.js`**: Service Worker managing the offline precache manifest.

### Core Modules
- **`core/state.js`**: Global state management boundary.
- **`core/db.js`**: Dexie.js database singleton managing IndexedDB tables.

### Feature Views
- **`views/install.js`**: Manages the PWA native install flow.
- **`views/scan.js`**: OCR interface for prescription scanning.
- **`views/emergency.js`**: Hosts the emergency connection card and P2P connection QR logic.
- **`views/history.js`**: Medical document ledger history and search.

### Services & Workers
- **`services/PeerMesh.js`**: (Upcoming) WebRTC signaling, deterministic ID hashing, and WebAuthn gating.
- **`services/SyncBridge.js`**: (Upcoming) Y.js CRDT layer to bridge PeerJS data channels.
- **`services/VisionPipeline.js`**: (Upcoming) Coordinator for background worker processing of OCR.
- **`services/DocLedger.js`**: (Upcoming) SHA-256 document hashing and Fuse.js search indexing.
- **`workers/vision.worker.js`**: (Upcoming) Off-thread image processing using MediaPipe, OpenCV, and Tesseract.

## 3. The 6-Point Feature Specification Sheet

| Phase | Task Definition | Associated Files |
|-------|-----------------|------------------|
| **Task A** | **Native PWA Installation Lifecycle**: Wire `beforeinstallprompt` to trigger an OS-level WebAPK installation via a hidden overlay button. Skip if already in standalone mode. | `views/install.js` |
| **Task B** | **OCR to Database Pipeline**: Intercept OCR results from Tesseract, construct structured database records, and automatically add detected drugs to the medications table via Dexie. | `views/scan.js` |
| **Task C** | **Decentralized Mesh & WebAuthn**: Build a WebRTC service using a SHA-256 hashed UID. Incoming connections must be gated by a local biometric WebAuthn challenge. | `services/PeerMesh.js`<br>`views/emergency.js` |
| **Task D** | **Y.js CRDT Sync Layer**: Create a sync bridge linking Y.js CRDT docs to the PeerJS data channel to allow mathematical merging of medical profile changes. | `services/SyncBridge.js` |
| **Task E** | **Web Worker Vision Pipeline**: Move OpenCV, MediaPipe, Tesseract, and NLP regex processing off the main UI thread into a Web Worker to prevent UI freezing. | `workers/vision.worker.js`<br>`services/VisionPipeline.js` |
| **Task F** | **DocLedger Cryptography**: Compute SHA-256 hashes of all uploaded documents, save the cryptographic integrity to Dexie, and provide a Fuse.js fuzzy search interface. | `services/DocLedger.js`<br>`views/history.js` |

*(Task G adds the new vendor assets from Tasks A-F to the `sw.js` precache manifest).*
