/**
 * @fileoverview Scan Result Controller
 * Manages bottom sheet UI rendering, safety DDI warning dialogs,
 * manual corrections, and Dexie IndexedDB writes.
 */

import db from '../../core/db.js';
import state from '../../core/state.js';
import { StripDepthEstimator } from '../../services/reconstruction/StripDepthEstimator.js';
import { StripMeshBuilder } from '../../services/reconstruction/StripMeshBuilder.js';
import { StripSceneOrchestrator } from '../../services/reconstruction/StripSceneOrchestrator.js';

const SCHEDULE_INFO = {
  'H': { color: '#ef4444' },
  'H1': { color: '#f97316' },
  'X': { color: '#dc2626' },
  'G': { color: '#eab308' },
  'OTC': { color: '#10b981' }
};

export default class ScanResultController {
  /**
   * @param {Object} view - The main ScanView context
   */
  constructor(view) {
    this.view = view;
  }

  /**
   * Populates and displays the bottom results sheet.
   * @param {Object} data - Scanned match result
   */
  showResultSheet(data) {
    if (!data || !data.bestMatch) return;

    const drug = data.bestMatch;
    const sched = SCHEDULE_INFO[drug.schedule] || SCHEDULE_INFO['OTC'];

    // 1. Hierarchy Fix: Ensure Brand Name is primary, Generic is secondary
    const bName = (drug.brandNames && drug.brandNames[0]) || drug.brandName;
    const gName = drug.genericName || drug.name;
    
    if (this.view._resultName) {
      if (bName && bName.toLowerCase() !== gName.toLowerCase()) {
        this.view._resultName.innerHTML = `${bName} <div style="font-size: 14px; color: #a1a1aa; margin-top: 4px; font-weight: 500;">${gName}</div>`;
      } else {
        this.view._resultName.textContent = gName;
      }
    }

    if (this.view._resultSched) {
      this.view._resultSched.textContent = drug.schedule || 'OTC';
      this.view._resultSched.style.color = sched.color;
      this.view._resultSched.style.background = `${sched.color}22`;
    }

    const useContainer = this.view.container.querySelector('#sv-result-clinical-use');
    const useText = this.view.container.querySelector('#sv-result-use-text');
    if (useContainer && useText) {
      if (drug.patientFriendlyUse) {
        useContainer.style.display = 'flex';
        useText.textContent = drug.patientFriendlyUse;
      } else {
        useContainer.style.display = 'none';
      }
    }

    if (this.view._resultDosRow) {
      this.view._resultDosRow.innerHTML = '';
      if (data.dosage) {
        this.view._resultDosRow.innerHTML += `<div style="padding: 6px 12px; border-radius: 20px; background: rgba(255,184,140,0.12); color: #ffb88c; font-size: 12px; font-family: monospace;">💊 ${data.dosage}${data.unit}</div>`;
      }
      if (data.quantity) {
        this.view._resultDosRow.innerHTML += `<div style="padding: 6px 12px; border-radius: 20px; background: rgba(16,185,129,0.12); color: #10b981; font-size: 12px; font-family: monospace;">📦 QTY: ${data.quantity}</div>`;
      }

      // Removed inline 3D reconstruction viewport because it now renders full-screen behind the result sheet!

      // Add Visual Explainability Checklist with Dropdown Reasoning
      if (data.explainabilityDetails && data.explainabilityDetails.length > 0) {
        const explContainer = document.createElement('div');
        explContainer.style.cssText = `
          width: 100%; margin-top: 15px; border-top: 1px solid rgba(255,255,255,0.08);
          padding-top: 15px; display: flex; flex-direction: column; gap: 8px;
        `;
        explContainer.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" onclick="const l = this.nextElementSibling; l.style.display = l.style.display==='none'?'flex':'none';">
            <h4 style="font-size: 10px; font-weight: bold; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.05em; margin:0;">Why this result?</h4>
            <span style="color: rgba(255,255,255,0.4); font-size: 10px;">▼</span>
          </div>
          <ul style="list-style: none; margin: 0; padding: 0; display: none; flex-direction: column; gap: 5px;">
            ${data.explainabilityDetails.map(expl => `
              <li style="font-size: 11px; color: #10b981; display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                <span>${expl}</span>
              </li>
            `).join('')}
            ${data.diagnosticReport?.reasoning ? `
              <li style="font-size: 11px; color: #f43f5e; margin-top: 4px; padding-top: 4px; border-top: 1px dashed rgba(255,255,255,0.1);">
                ⚠ <strong>LOW CONFIDENCE:</strong> ${data.diagnosticReport.reasoning}
              </li>
            ` : ''}
          </ul>
        `;
        this.view._resultDosRow.appendChild(explContainer);
      }
    }

    if (this.view._resultSheet) {
      this.view._resultSheet.style.transform = 'translateY(0)';
    }
  }

  /**
   * Saves prescription logs and tracks corrections/DDI warnings in IndexedDB.
   * @param {Object} ocrResult
   */
  /**
   * Handles saving the scan results, prompts for corrections if low-confidence,
   * performs Drug-Drug Interaction checks, and commits to db.
   * @returns {Promise<void>}
   */
  async handleResultAdd() {
    const bestMatch = this.view.currentResults?.bestMatch || null;
    const ocrResult = {
      rawText: this.view.currentResults?.rawText || '',
      matchedDrugs: bestMatch ? [bestMatch.name] : [],
      capturedImageBlob: this.view.currentResults?.croppedBlob ?? null,
      drugInfo: bestMatch ? { [bestMatch.name]: bestMatch } : {}
    };

    const conf = this.view.currentResults?.confidence || 100;
    let finalDrugs = ocrResult.matchedDrugs;
    let isCorrected = false;

    if (conf < 75) {
       const userConfirmed = await this.showConfidenceValidationModal(finalDrugs, conf);
       if (!userConfirmed) return;
       if (JSON.stringify(userConfirmed) !== JSON.stringify(finalDrugs)) {
         isCorrected = true;
       }
       finalDrugs = userConfirmed;
    }
    ocrResult.matchedDrugs = finalDrugs;

    // Log correction to pipeline accuracy tracker
    this.view.pipeline.recordCorrection(
      this.view.pipeline.activeSessionId || 'default-session',
      finalDrugs,
      isCorrected,
      ocrResult.rawText,
      this.view.currentResults?.regions || []
    );

    if (finalDrugs.length > 0) {
       const activeMeds = await db.medications.filter(m => m.active && m.userId === state.user?.uid).toArray();
       const drugList = [...activeMeds.map(m => m.rxnormId || m.name), ...finalDrugs];
              if (drugList.length > 1) {
            let interactions = [];
            try {
                const { ApiClient } = await import('../../core/api.js');
                const data = await ApiClient.post('/api/v1/interactions', { medication_ids: drugList }, { timeout: 1500 });
                interactions = data?.interactions || [];
            } catch (e) {
                console.warn('[ScanResultController] DIC network error, switching to local NLP engine:', e.message);
                try {
                    const { MedicalNLPEngine } = await import('../../services/MedicalNLPEngine.js');
                    interactions = MedicalNLPEngine.checkLocalInteractions(drugList);
                } catch (nlpErr) {}
            }

            const critical = interactions.find(i => i.strength === 'HIGH' || i.strength === 'SEVERE');
            if (critical) {
                const mappedCritical = {
                    drug1: (critical.drugs && critical.drugs[0]) || drugList[0] || 'Med 1',
                    drug2: (critical.drugs && critical.drugs[1]) || drugList[1] || 'Med 2',
                    description: critical.effect || critical.type || 'Severe drug-drug interaction risk',
                    recommendation: critical.evidence && critical.evidence.length > 0 ? "FDA Warning Found" : "Consult Physician"
                };
                const override = await this.showDDIModal(mappedCritical);
                if (!override) return;
            }
        }
    }

    await this.navigateToAdd(ocrResult);
  }

  async navigateToAdd(ocrResult) {
    // Navigate directly to the Add Medication view with the extracted data in the URL
    // so the user can review and set schedules/frequencies.
    
    const primaryDrug = ocrResult.matchedDrugs?.[0];
    const rawName = primaryDrug || '';
    
    // We can also extract dosage & unit if they were passed in ocrResult
    const dosage = ocrResult.dosage || '';
    const unit = ocrResult.unit || 'mg';

    // Save the cropped image to sessionStorage so it can be previewed or saved later
    if (ocrResult.capturedImageBlob) {
        try {
            // Blob to Data URL for session storage
            const reader = new FileReader();
            reader.onloadend = () => {
                sessionStorage.setItem('medcare_scanned_image', reader.result);
            };
            reader.readAsDataURL(ocrResult.capturedImageBlob);
        } catch(e) {}
    }

    const params = new URLSearchParams();
    if (rawName) params.append('name', rawName);
    if (dosage) params.append('dosage', dosage);
    if (unit) params.append('unit', unit);
    
    this.view.destroy();
    window.location.hash = `#/add-medication?${params.toString()}`;
  }

  /**
   * Prompts verification modal for low-confidence scans.
   */
  showConfidenceValidationModal(drugs, confidence) {
    return new Promise((resolve) => {
      const div = document.createElement('div');
      const drugStr = drugs.join(', ');
      div.className = 'fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4';
      div.innerHTML = `
        <div class="bg-[var(--color-surface-elevated)]/60 backdrop-blur-2xl border border-[var(--color-border)] rounded-[2rem] p-6 w-full max-w-sm shadow-[0_8px_32px_rgba(0,0,0,0.7)]">
          <h2 class="text-xl font-display text-[var(--color-text-primary)] mb-2">Review Detections</h2>
          <p class="text-xs text-[#ffb88c] mb-6 font-mono uppercase tracking-widest">Scanner State: PROBABLE (${Math.floor(confidence)}%)</p>
          <div class="space-y-4">
            <div>
              <label class="text-xs text-[var(--color-text-secondary)] uppercase tracking-widest font-bold ml-2 mb-1 block">Detected Text</label>
              <input type="text" id="conf-val" value="${drugStr}" class="w-full bg-white/5 border border-[#7f2f5d]/50 rounded-xl px-4 md:px-8 lg:px-12 py-3 text-[var(--color-text-primary)] text-sm focus:outline-none focus:border-[#ffb88c]/50">
            </div>
          </div>
          <div class="flex gap-3 mt-8">
            <button id="conf-cancel" class="flex-1 py-3.5 rounded-xl border border-[#7f2f5d]/50 text-[var(--color-text-secondary)] font-bold uppercase text-xs tracking-widest hover:bg-white/5 transition-colors">Discard</button>
            <button id="conf-save" class="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] text-[var(--color-text-primary)] font-bold uppercase text-xs tracking-widest shadow-lg shadow-[#ca5229]/20 active:scale-95 transition-transform">Accept</button>
          </div>
        </div>
      `;
      document.body.appendChild(div);

      div.querySelector('#conf-cancel').onclick = () => {
        div.remove();
        resolve(null);
      };
      div.querySelector('#conf-save').onclick = () => {
        const val = div.querySelector('#conf-val').value.trim();
        div.remove();
        resolve(val ? val.split(',').map(s => s.trim()) : []);
      };
    });
  }

  /**
   * Prompts clinical warning dialog when a drug contraindication occurs.
   */
  showDDIModal(interaction) {
    return new Promise((resolve) => {
      window.medcareAlertLock = true;
      const div = document.createElement('div');
      div.className = 'fixed inset-0 z-[9999] bg-red-900/90 backdrop-blur-sm flex items-center justify-center p-4';
      div.setAttribute('role', 'alertdialog');
      div.setAttribute('aria-modal', 'true');
      div.innerHTML = `
        <div class="bg-[var(--color-surface-elevated)] border border-red-500/50 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
          <h2 class="text-xl font-display text-[var(--color-text-primary)] mb-2 flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            DANGEROUS INTERACTION
          </h2>
          <p class="text-xs text-red-400 mb-6 font-mono uppercase tracking-widest">Severe Contraindication</p>
          
          <div class="bg-red-500/10 p-4 rounded-xl border border-red-500/20 mb-6">
            <p class="text-sm font-bold text-[var(--color-text-primary)] mb-2">${interaction.drug1} + ${interaction.drug2}</p>
            <p class="text-xs text-red-200">${interaction.description}</p>
            <p class="text-xs text-red-400 mt-2 font-bold">${interaction.recommendation}</p>
          </div>

          <div class="flex flex-col gap-3">
            <button id="ddi-cancel" class="w-full py-3.5 rounded-xl bg-red-600 text-[var(--color-text-primary)] font-bold uppercase text-xs tracking-widest shadow-lg shadow-red-900/20 active:scale-95 transition-transform">Cancel Addition</button>
            <button id="ddi-override" class="w-full py-3.5 rounded-xl border border-red-500/30 text-red-400 font-bold uppercase text-xs tracking-widest hover:bg-red-500/10 transition-colors">Override & Add Anyway</button>
          </div>
        </div>
      `;
      document.body.appendChild(div);

      div.querySelector('#ddi-cancel').onclick = () => {
        window.medcareAlertLock = false;
        div.remove();
        resolve(false);
      };
      div.querySelector('#ddi-override').onclick = () => {
        window.medcareAlertLock = false;
        div.remove();
        resolve(true);
      };
    });
  }
}
