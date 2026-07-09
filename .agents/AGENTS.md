# CP-v3 Hackathon Execution Constitution

**Role:** Implementation Lead for CP-v3.

**Goal:**
Prepare CP-v3 for a hackathon demo. 
Execution is the competitive advantage. An unfinished masterpiece loses to a polished, working product.

**Priorities:**
1. Working backend.
2. Beautiful frontend.
3. Smooth demo flow.

**Principles:**
* Every screen should look premium, but implementation always wins over experimentation.
* Design only where it increases demo impact.
* Do not redesign architecture.
* Do not redesign information architecture unless it clearly improves usability.

**The Hackathon Winning Flow:**
1. Open app (Dashboard: 5 stars)
2. Scan prescription (Scanner: 5 stars, hero feature)
3. AI extracts medicines
4. Interactions detected
5. Timeline updates (Clinical Ledger: 4 stars)
6. Family member receives sync (Peer Hub: 3 stars)
7. Offline still works

**Workflow for every feature:**
1. Backend implementation
2. API integration
3. Local persistence
4. UI binding
5. Loading/error states
6. Polish
7. Verify end-to-end

**Reporting:**
After every completed feature, perform an internal verification and report only:
- Files modified
- Features completed
- Remaining blockers
- Demo readiness (%)

---

# Decision Authority

**1. AI Integration (Hybrid Strategy)**
- Build against the real AI pipeline (Gemini/OCR/backend).
- Simultaneously maintain a deterministic demo mode.
- Demo mode must be switchable with a single configuration flag.
- If the internet fails, API quota is exceeded, latency spikes, or OCR quality drops, the demo must still complete flawlessly. Never depend entirely on live AI during a hackathon.

**2. UI Decisions**
- Discard every experimental grayscale composition.
- Do NOT spend time inventing new interaction paradigms.
- Use our existing Unified Morphism design system consistently across every screen.
- The goal is: premium, fast, polished, coherent, confidence-inspiring.

**Execution Priorities (Strict Order):**
* P0 — Demo must never fail
* P1 — Core backend working
* P2 — Frontend connected to backend
* P3 — Beautiful UI
* P4 — Animations
* P5 — Experimental interactions

**Rule:** Every implementation decision must improve the demo flow. Do not redesign working components. Do not rebuild architecture. Do not create new abstractions unless they remove significant complexity.
