<div align="center">
  <img src="https://raw.githubusercontent.com/Harsha-E/Medical-PWA-v2/main/icons/icon-512x512.png" alt="MedCheck Logo" width="120" onerror="this.src='https://img.icons8.com/color/120/000000/medical-doctor.png'">
  <h1>MedCheck (Medical-PWA-v2)</h1>
  <p><strong>Your Health. In Check.</strong></p>
  <p><i>A Privacy-First, Edge-Intelligent Drug Safety Application</i></p>

  <p>
    <img src="https://img.shields.io/badge/PWA-Ready-14B8A6?style=for-the-badge&logo=pwa&logoColor=white" alt="PWA Ready" />
    <img src="https://img.shields.io/badge/Vanilla_JS-ES6-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black" alt="Vanilla JS" />
    <img src="https://img.shields.io/badge/Tailwind-CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
    <img src="https://img.shields.io/badge/AI_Vision-MediaPipe-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="MediaPipe" />
    <img src="https://img.shields.io/badge/LLM-Groq_API-F55036?style=for-the-badge" alt="Groq API" />
  </p>
</div>

<br/>

MedCheck solves three converging problems in consumer digital health: the inability of patients to be automatically warned of drug-drug interactions at the point of receipt, the difficulty of managing fragmented medical histories, and the exclusion of offline users from digital health intelligence.

By eliminating heavy server-side processing and utilizing a **highly decoupled edge architecture**, MedCheck delivers lightning-fast, clinical-grade drug safety intelligence directly on your device.

---

## 🚀 Fully Developed Core Features

### 👁️ Intelligent Vision Scanning (Zero Hallucination)
- **"No Hands" Image Stabilization:** Integrates **MediaPipe HandLandmarker** to lock the camera shutter when human hands are detected in the frame. This enforces physical stability (e.g., placing the bottle on a table) and entirely eliminates motion blur on small medicine packages.
- **LLaMA Edge Extraction:** Utilizes the **Groq API** paired with a local `MedicalNLPEngine` dictionary to intelligently structure medication data (Brand, Generic, Dosage, Form) from images, guaranteeing hallucination-free JSON outputs.
- **3D Sweep Fallback:** Includes an interactive 180-degree camera sweep tutorial to overcome complex packaging geometries if a 2D scan yields low confidence.

### 🧠 On-Device Drug Intelligence Engine
- **Sub-10ms Offline Verification:** Performs deterministic, `O(1)` hash-table lookups against a localized, highly compressed JSON registry (~8MB) compiled from OpenFDA and RxNorm data.
- **6-Dimensional Safety Checks:** Instantly verifies direct Drug-Drug Interactions (DDIs), duplicate active therapies, drug-condition contraindications, and drug-allergy risks using FDA black-box regulatory evidence.
- **Transitive Enzyme Reasoning:** Maps and detects complex pharmacokinetic interactions (e.g., CYP3A4 inhibitors and substrates).

### 🔒 Privacy-First Clinical Ledger
- **Zero-Transmission Storage:** All personal health records, schedules, and clinical histories are securely persisted locally via **IndexedDB (Dexie.js)**. No sensitive medical data is ever uploaded to a central cloud database.
- **Cryptographic Integrity:** Every newly scanned medication is hashed using **SHA-256** (Web Crypto API) to ensure your health ledger remains completely tamper-evident.

### 👥 Caregiver Access & Family Hub
- **Direct Node Pairing:** Employs a secure, role-based permission system allowing patients to generate scoped access tokens via QR-code.
- **Restricted Telemetry:** Caregivers gain secure read-only access to medication adherence logs and upcoming schedules, while sensitive handwritten clinical notes remain isolated.

### 🆘 Emergency Hub & Adherence Tracking
- **Offline Identity Card:** Instant, unauthenticated emergency access to your Blood Group, Systemic Conditions, and Agent Sensitivities.
- **SOS Broadcast:** Rapidly broadcast distress signals to your listed primary responders.
- **Health Progress Calendar:** A dynamic dashboard visually tracking *Optimal*, *Partial*, and *Missed* adherence states.

---

## 🏗️ Architecture & Exponential Scalability

MedCheck is specifically engineered for **infinite horizontal scalability** with near-zero infrastructure operating costs.

1. **Decoupled Stateless Frontend:** Built with Zero-framework Vanilla ES6 and TailwindCSS, the Progressive Web App executes all state management locally. 
2. **Stateless AI Extraction:** Image processing relies on rapid, stateless edge-inference (via Groq API), bypassing the need to maintain heavy, expensive GPU clusters.
3. **Pre-compiled Intelligence:** Instead of querying a live relational database for every interaction check, our companion Python (FastAPI) ingestion engine pre-compiles the entire FDA and RxNorm datasets into static JSON indexes. These indexes are distributed via CDN, enabling the client device to perform all complex logic autonomously.

---

## 💻 Technology Stack

* **Frontend Engine:** HTML5, Vanilla ES6 JavaScript, TailwindCSS (v3.x)
* **Local Persistence:** Dexie.js (IndexedDB Wrapper), Web Crypto API (SHA-256)
* **Computer Vision & NLP:** MediaPipe (Vision Tasks), Tesseract.js (WASM Pre-pass), Groq API 
* **Data Intelligence Compiler:** Python 3, FastAPI, Uvicorn (Used strictly during build-time to compile the regulatory registry)

---

## ⚙️ Getting Started

To run MedCheck locally for development or demonstration:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Harsha-E/Medical-PWA-v2.git
   cd Medical-PWA-v2
   ```

2. **Configure Environment:**
   Ensure your `ENV.GROQ_API_KEY` is configured in `core/env.js` (or your local environment variables) to enable the AI Extraction Service.

3. **Serve Locally:**
   Because it is a Vanilla ES6 application, you only need a basic static web server. You can use the Node `http-server` package:
   ```bash
   npx http-server .
   ```
   *Navigate to `http://127.0.0.1:8080` in your browser.*

---
<div align="center">
  <i>Developed for the Community Project. Bridging the gap between digital health intelligence and offline accessibility.</i>
</div>
