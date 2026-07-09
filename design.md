# Unified Morphism Design System & Screens

## Overview
This document defines the "Unified Morphism" design language and specifications for the **Clinical Ledger** and **Peer Hub** screens for a premium healthcare hackathon demo. 
The goal is to create a dynamic, highly polished, and confidence-inspiring medical interface that abandons sterile gray in favor of a deep, warm, and highly engaging aesthetic.

## Global Design Tokens

### Colors
- **Background (Base)**: `#0a0407` (Deep Warm/Near Black)
- **Primary Accent**: `#ffb88c` (Rose Gold)
- **Secondary Accent**: `#7f2f5d` (Burgundy)
- **Text (Primary)**: `rgba(255, 255, 255, 0.95)`
- **Text (Muted)**: `rgba(255, 255, 255, 0.4)`
- **Critical/Warning**: Red (`#ef4444`) with pulsing states

### Typography
- **Display/Headings**: Use a premium sans-serif (e.g., `Syne`, `Inter`, or `Outfit`). Large, tracking-tight, lightweight.
- **Micro-copy/Labels**: `monospace` (e.g., Fira Code, JetBrains Mono). Small, uppercase, tracking-widest (`0.2em` to `0.3em`).
- **Body**: Standard sans-serif (`font-sans`), highly readable, light font weights.

### Effects & Glassmorphism
- **um-card**:
  - Background: `rgba(127, 47, 93, 0.05)`
  - Backdrop Filter: `blur(20px)`
  - Border: `1px solid rgba(255, 184, 140, 0.1)`
  - Shadow: `inset 0 1px 1px rgba(255, 184, 140, 0.1), 0 8px 32px rgba(0, 0, 0, 0.6)`
  - Hover: Add a 3D lift (`transform: scale(1.02)`) and intensify shadow.
  
- **Gradients (um-hero-aura)**:
  - Radial gradient for critical focus areas: `radial-gradient(circle at center, rgba(127,47,93,0.3) 0%, rgba(255,184,140,0.1) 40%, rgba(10,4,7,0) 70%)`
  - Needs a slow breathing animation (`scale(0.95)` to `scale(1.05)`).

- **um-sync-ring**:
  - Spinning border ring for active loading/syncing states, utilizing Rose Gold top border.

---

## Screen 1: Clinical Ledger

**Philosophy**: A beautiful chronological timeline of health events. Moving away from messy graphs into a strictly ordered list.

### Layout Structure
- **Left Column (Timeline)**: Takes up 70% of space on desktop. Grouped by `TODAY`, `YESTERDAY`, `EARLIER`.
- **Right Column (Context Panel)**: Takes up 30%. Sticky positioning. Shows the patient's current state (Name, Blood type, Active Conditions).

### Components
- **Event Node**:
  - A `um-card` displaying the event.
  - Features an eyebrow label in monospace (e.g., `SURGERY`, `ROUTINE`).
  - Title and subtle description.
  - **Critical Events**: Feature a pulsing burgundy/rose-gold dot (`um-node-dot`) next to the card.
- **Attachments Button**:
  - Present inside event nodes if they have attached documents.
  - Rose gold text, subtle hover effects.

---

## Screen 2: Peer Hub

**Philosophy**: Shift the paradigm from a traditional "network map" to visualizing **ATTENTION**. Answer the question: *"Who needs me right now?"*

### Layout Structure
A vertical hierarchy based on urgency and priority.

1. **Focus Tier (Hero Moment)**:
   - Reserved for the single family member needing immediate attention (e.g., missing a medication, emergency).
   - Displayed massively in the center with the `um-hero-aura` background breathing behind them.
   - Includes a pill (`um-pill`) indicating the exact issue (e.g., "Needs medication in 20 minutes").
   - If no one needs attention, show a soft "All Clear" state.

2. **Monitoring Tier (Nearby)**:
   - For family members currently active or requiring minor observation.
   - Displayed as horizontal `um-card` elements.
   - Include an avatar circle with an optional spinning `um-sync-ring` around it if they are actively syncing.
   - Shows their Name, Status, and Role (e.g., `CAREGIVER`, `PATIENT`).

3. **Connected Tier (Idle)**:
   - For offline or fully healthy members requiring zero attention.
   - Visually de-emphasized: 40-60% opacity.
   - Small, simple rows docked near the bottom.

### Interactions
- Include hidden debug buttons (bottom right/left) to switch between 3 Mock Scenarios:
  - **A: Healthy Day** (No focus, everyone monitoring/idle)
  - **B: Routine Care** (Someone needs medication soon)
  - **C: Emergency** (Critical alert)
- The UI must dynamically shift its hierarchy and aura effects when scenarios change.
