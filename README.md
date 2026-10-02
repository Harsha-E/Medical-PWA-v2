# MedCheck (Medical-PWA-v2)

A privacy-first, partially-offline Progressive Web Application (PWA) designed to safely digitize medicine cabinets and proactively warn patients of adverse drug interactions. 

MedCheck eliminates the need for expensive centralized servers by shifting computational intelligence to the edge. It combines a smart AI-driven vision pipeline with a highly optimized, locally cached Drug Intelligence Registry (compiled from OpenFDA and RxNorm).

## 🚀 Fully Developed Features

**1. Intelligent Vision Scanning (Zero Hallucination)**
*   **"No Hands" Image Stabilization:** Integrates **MediaPipe HandLandmarker** to lock the camera shutter if hands are detected, enforcing physical stability and preventing motion blur on small medicine bottles.
*   **LLaMA 3.3 Extraction:** Utilizes the **Groq API** (LLaMA-3.3-70b-versatile) paired with a local NLP dictionary (`ocr-error-map.js`) to extract structured medicine data (Brand, Generic, Dosage) accurately without AI hallucination.
*   **3D Sweep Fallback:** Includes a 180-degree camera sweep tutorial for complex packaging geometries when 2D scans fail.

**2. On-Device Drug Intelligence Engine**
*   **Sub-10ms Offline Checking:** A deterministic, O(1) hash-table lookup against a locally cached, compressed JSON registry (~8MB).
*   **6-Dimensional Safety Checks:** Instantly checks for direct Drug-Drug Interactions (DDIs), duplicate therapies, drug-condition contraindications, and drug-allergy risks based on FDA black-box data.
*   **Transitive Enzyme Reasoning:** Detects complex pharmacokinetic interactions (e.g., CYP3A4 inhibitors).

**3. Privacy-First Clinical Ledger**
*   **Zero-Transmission Storage:** All personal health records, conditions, and schedules are stored strictly on the user's device using **IndexedDB (Dexie.js)**.
*   **Cryptographic Integrity:** Every scanned record is hashed using SHA-256 (Web Crypto API) to ensure tamper-evident medical histories.

**4. Caregiver Access & Synchronization**
*   **Family Hub:** Role-based access allowing patients to generate scoped access tokens via QR-code (Direct Pairing Node).
*   Caregivers gain restricted read-only views of medication adherence and schedules without accessing sensitive handwritten notes.

**5. Emergency Hub & Adherence Tracking**
*   **Offline Identity Card:** Instant access to Blood Group, Systemic Conditions, and Agent Sensitivities.
*   **SOS Broadcast:** Immediate broadcast signal to listed primary responders.
*   **Health Calendar:** Tracks Optimal, Partial, and Missed adherence states dynamically.

**6. Hybrid Offline Architecture**
*   **100% Core UI Uptime:** Service Workers precache the entire application shell, ensuring access to the clinical ledger, medication schedules, and emergency hub without any internet connection.
*   *(Note: Network is dynamically leveraged only during the active scanning phase for Groq LLM extraction and Caregiver synchronization).*

## 🏗️ Architecture & Scalability

MedCheck is built for **exponential scalability with near-zero infrastructure cost**. 
*   **Decoupled Frontend:** A zero-framework Vanilla ES6 architecture styled with TailwindCSS. 
*   **Stateless Extraction:** The app uses stateless edge-inference (Groq) rather than maintaining heavy server-side GPU instances.
*   **Pre-compiled Intelligence:** Instead of querying a live database for every interaction check, a companion FastAPI backend pre-compiles the entire FDA/RxNorm dataset into static JSON indexes. These indexes are shipped to the client via CDN, allowing infinite user scaling without database bottlenecking.

## 💻 Tech Stack

*   **Frontend:** HTML5, Vanilla ES6 JavaScript, TailwindCSS, Dexie.js
*   **Computer Vision & NLP:** MediaPipe (Vision Tasks), Tesseract.js (Pre-pass), Groq API (LLaMA 3.3)
*   **Data Intelligence Ingestion:** Python 3, FastAPI, Uvicorn (used strictly for pre-compiling the local registry)

## ⚙️ Getting Started

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/Harsha-E/Medical-PWA-v2.git
   \`\`\`
2. **Serve locally:**
   Use any local web server (e.g., Live Server or Node's `http-server`) to serve the root directory.
   \`\`\`bash
   npx http-server .
   \`\`\`
3. **Configure API Keys:**
   Ensure your `ENV.GROQ_API_KEY` is configured in the environment variables for the extraction service to function.
