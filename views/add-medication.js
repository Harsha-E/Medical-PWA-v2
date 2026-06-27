/**
 * @fileoverview Add/Edit Medication View
 * Dynamically resolves URL arguments from query strings and path segments.
 */

import db from '../core/db.js';
import state from '../core/state.js';
import InteractionEngine from '../services/InteractionEngine.js';
import CaregiverPortal from '../utils/CaregiverPortal.js';
import SyncBridge from '../services/SyncBridge.js';
import { collection, addDoc, doc, setDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export default class AddMedicationView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'w-full h-full flex flex-col overflow-hidden';
    this.isEdit = false;
    this.medId = null;
    
    // Default baseline form layout data structural configuration
    this.medData = {
      name: '', dosage: '', dosageUnit: 'mg',
      category: 'Tablet', frequency: 'Once daily',
      times: ['08:00'], startDate: new Date().toISOString().split('T')[0],
      endDate: '', active: true, notes: ''
    };
  }

  async render() {
    const hash = window.location.hash || '';
    
    // 1. Extract parameters from routing path segments (e.g., #/add-medication/edit/12)
    if (hash.includes('/edit/')) {
      this.isEdit = true;
      const idMatch = hash.match(/\/edit\/(\d+)/);
      if (idMatch && idMatch[1]) {
        this.medId = parseInt(idMatch[1], 10);
      }
    }

    // 2. Extract and parse parameters from standard query strings (e.g., ?id=12 or ?name=X)
    const queryIndex = hash.indexOf('?');
    if (queryIndex !== -1) {
      const urlParams = new URLSearchParams(hash.slice(queryIndex + 1));
      
      if (urlParams.has('id')) {
        this.isEdit = true;
        this.medId = parseInt(urlParams.get('id'), 10);
      }
      if (urlParams.has('name'))   this.medData.name = decodeURIComponent(urlParams.get('name'));
      if (urlParams.has('dosage')) this.medData.dosage = decodeURIComponent(urlParams.get('dosage'));
      if (urlParams.has('unit'))   this.medData.dosageUnit = decodeURIComponent(urlParams.get('unit'));
    }

    // 3. Hydrate state values from database ledger if in editing mode
    if (this.isEdit && this.medId) {
      try {
        const existingRecord = await db.medications.get(this.medId);
        if (existingRecord) {
          this.medData = existingRecord;
        }
      } catch (dbErr) {
        console.error('[AddMedication] Failed to query existing database profile:', dbErr);
      }
    }

    // 4. Hydrate from sessionStorage draft if it exists and matches context
    const draftJson = sessionStorage.getItem('medcare_draft_form');
    if (draftJson) {
      try {
        const draft = JSON.parse(draftJson);
        if (draft.isEdit === this.isEdit && draft.medId === this.medId) {
          Object.assign(this.medData, draft);
        }
      } catch (e) {}
    }

    // 5. Hydrate from Vision Scan Payload (if coming directly from 3D Scanner)
    const scanPayloadJson = sessionStorage.getItem('medcheck_pending_scan');
    if (scanPayloadJson) {
      try {
        const scanPayload = JSON.parse(scanPayloadJson);
        if (scanPayload.name || scanPayload.brandName || scanPayload.genericName) {
            this.medData.name = scanPayload.name || scanPayload.brandName || scanPayload.genericName;
        }
        if (scanPayload.dosage && typeof scanPayload.dosage === 'object') {
          if (scanPayload.dosage.parsed && scanPayload.dosage.parsed.amount) {
            const parsedUnit = (scanPayload.dosage.parsed.unit || '').toLowerCase();
            const unitAliases = { 'μg': 'mcg', 'ug': 'mcg', 'micrograms': 'mcg', 'milligrams': 'mg' };
            this.medData.dosageUnit = unitAliases[parsedUnit] || scanPayload.dosage.parsed.unit;
            this.medData.dosage = scanPayload.dosage.parsed.amount;
          } else if (scanPayload.dosage.rawText) {
            this.medData.dosage = scanPayload.dosage.rawText;
          }
        } else if (scanPayload.dosageAmount) {
            this.medData.dosage = scanPayload.dosageAmount;
            if (scanPayload.dosageUnit) this.medData.dosageUnit = scanPayload.dosageUnit;
        } else if (scanPayload.dosage) {
            const rawDosageStr = scanPayload.dosage.toString();
            const comboMatch = rawDosageStr.match(/^([\d.]+)\s*([a-zA-Zμ]+)$/);
            if (comboMatch) {
                this.medData.dosage = comboMatch[1];
                this.medData.dosageUnit = comboMatch[2].toLowerCase();
            } else {
                this.medData.dosage = rawDosageStr;
                if (scanPayload.unit) this.medData.dosageUnit = scanPayload.unit;
            }
        }
        if (scanPayload.quantity) this.medData.totalQuantity = scanPayload.quantity;
        if (scanPayload.totalQuantity) this.medData.totalQuantity = scanPayload.totalQuantity;
        if (scanPayload.form) this.medData.category = scanPayload.form;
        if (scanPayload.isAsNeeded) this.medData.frequency = 'As needed';
        if (scanPayload.genericName) this.medData.genericName = scanPayload.genericName;
        if (scanPayload.manufacturer) this.medData.manufacturer = scanPayload.manufacturer;
        if (scanPayload.therapeuticCategory) this.medData.therapeuticCategory = scanPayload.therapeuticCategory;
        if (scanPayload.alternativeBrands) this.medData.alternativeBrands = scanPayload.alternativeBrands;
        // Clean up the storage so it doesn't persistently hijack the form on reload
        sessionStorage.removeItem('medcheck_pending_scan');
      } catch (e) {
        console.error('[AddMedication] Failed to parse scan payload:', e);
      }
    }

    // 6. Interaction Engine Initialization & Check
    let warningBannerHtml = '';
    try {
      const engine = new InteractionEngine();
      await engine.init('./data/indian_pharma_interactions.json');
      
      const mockPatientProfile = {
        conditions: ['heart failure'],
        activeMeds: ['atorvastatin']
      };

      const targetDrug = this.medData.genericName || this.medData.name;
      
      if (targetDrug) {
        const warnings = await engine.analyze(targetDrug, mockPatientProfile);
        
        if (warnings && warnings.length > 0) {
          const warningsHtml = warnings.map(w => 
            `<div class="mb-2"><strong class="uppercase text-[10px] tracking-wider">${w.type} (${w.severity}):</strong> ${w.message}</div>`
          ).join('');

          warningBannerHtml = `
            <div class="mb-6 p-5 rounded-3xl bg-red-950/40 border border-red-500/30 backdrop-blur-xl animate-[pulseWarning_2s_infinite]" style="box-shadow: inset 4px 4px 10px rgba(0,0,0,0.5), inset -4px -4px 10px rgba(255, 100, 100, 0.1), 0 0 20px rgba(239, 68, 68, 0.3);">
              <div class="flex items-center gap-3 mb-3">
                <span class="text-red-400 text-xl">⚠️</span>
                <h4 class="text-red-200 font-bold tracking-wide text-xs">CLINICAL WARNING DETECTED</h4>
              </div>
              <div class="text-sm text-red-200/80">
                ${warningsHtml}
              </div>
            </div>
          `;
        }
      }
    } catch (e) {
      console.error('[AddMedication] InteractionEngine execution failed:', e);
    }

    this.container.innerHTML = `
      <main class="flex-1 pt-[112px] pb-24" style="padding-left:0; padding-right:0; height: 100%; overflow-y: auto; overflow-x: hidden;">
        <div class="px-6 w-full max-w-7xl mx-auto flex flex-col">
        ${warningBannerHtml}
        <div class="clay-glass-panel p-6 mb-8 clay-glass-panel rounded-[2rem]">
          <h3 class="form-label mb-6">Medication Details</h3>
          <div class="form-group">
            <label for="m-name" class="form-label">Name</label>
            <input type="text" id="m-name" autocomplete="off" class="form-input" value="${this.medData.name || ''}" placeholder="e.g. Atorvastatin">
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-6">
            <div class="form-group">
              <label for="m-start" class="form-label">Start Date</label>
              <input type="date" id="m-start" class="form-input [color-scheme:dark]" value="${this.medData.startDate || new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label for="m-end" id="label-end" class="form-label">End Date (Optional)</label>
              <input type="date" id="m-end" class="form-input [color-scheme:dark]" value="${this.medData.endDate || ''}">
            </div>
          </div>
          <div class="grid grid-cols-2 gap-5 mt-4">
            <div class="form-group">
              <label for="m-dosage" id="label-dosage" class="form-label">Dosage</label>
              <input type="text" id="m-dosage" autocomplete="off" class="form-input" value="${this.medData.dosage || ''}" placeholder="20">
            </div>
            <div class="form-group">
              <label for="m-unit" class="form-label">Unit</label>
              <input type="text" list="dosage-units" id="m-unit" autocomplete="off" class="form-input" value="${this.medData.dosageUnit || ''}" placeholder="mg">
              <datalist id="dosage-units">
                ${['mg','g','kg','mcg','ml','L','units','drops','patches','puffs','sprays'].map(u => `<option value="${u}">`).join('')}
              </datalist>
            </div>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-4">
            <div class="form-group">
              <label for="m-total" id="label-total" class="form-label">Total Quantity</label>
              <input type="number" id="m-total" autocomplete="off" class="form-input" value="${this.medData.totalQuantity || ''}" placeholder="e.g. 30">
            </div>
            <div class="form-group">
              <label for="m-threshold" class="form-label">Refill Alert At</label>
              <input type="number" id="m-threshold" autocomplete="off" class="form-input" value="${this.medData.refillThreshold || '5'}" placeholder="e.g. 5">
            </div>
          </div>
          <div class="form-group">
            <label for="m-category" class="form-label">Form</label>
            <select id="m-category" autocomplete="off" class="form-select">
              ${['Tablet','Capsule','Liquid','Injection','Patch','Inhaler','Spray','Other'].map(c => `<option value="${c}" ${this.medData.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="clay-glass-panel p-6 mb-8 clay-glass-panel rounded-[2rem]">
          <h3 class="form-label mb-6">Database Insights</h3>
          <div class="grid grid-cols-1 gap-5">
            <div class="form-group">
              <label for="m-generic" class="form-label">Generic Name</label>
              <input type="text" id="m-generic" autocomplete="off" class="form-input text-sm" value="${this.medData.genericName || ''}" placeholder="e.g. Budesonide">
            </div>
            <div class="form-group">
              <label for="m-thera" class="form-label">Therapeutic Category</label>
              <input type="text" id="m-thera" autocomplete="off" class="form-input text-sm" value="${this.medData.therapeuticCategory || ''}">
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mt-2">
              <div class="form-group">
                <label for="m-manuf" class="form-label">Manufacturer</label>
                <input type="text" id="m-manuf" autocomplete="off" class="form-input text-sm" value="${this.medData.manufacturer || ''}">
              </div>
              <div class="form-group">
                <label for="m-alt" class="form-label">Alternative Brands</label>
                <input type="text" id="m-alt" autocomplete="off" class="form-input text-sm" value="${this.medData.alternativeBrands || ''}">
              </div>
            </div>
          </div>
        </div>

        <div class="clay-glass-panel p-6 mb-8 clay-glass-panel rounded-[2rem]">
          <h3 class="form-label mb-6">Schedule</h3>
          <div class="form-group">
            <label for="m-freq" class="form-label">Frequency</label>
            <select id="m-freq" autocomplete="off" class="form-select">
              ${['Once daily','Twice daily','Three times daily','As needed'].map(f => `<option value="${f}" ${this.medData.frequency===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
          <div id="time-slots-container" class="space-y-4 mt-4"></div>
        </div>

        <div class="clay-glass-panel p-6 mb-8 clay-glass-panel rounded-[2rem]">
          <h3 class="form-label mb-6">Notes</h3>
          <label for="m-notes" class="sr-only">Notes</label>
          <textarea id="m-notes" class="form-textarea" rows="4" placeholder="Any special instructions...">${this.medData.notes || ''}</textarea>
        </div>

        <div id="save-error" class="hidden text-xs text-danger font-bold bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4"></div>

        <button id="save-btn" class="mb-8 w-full max-w-xl mx-auto block py-4 rounded-2xl bg-gradient-to-r from-secondary to-surface-deep text-accent-bright text-sm font-bold uppercase tracking-[0.2em] [0_0_20px_rgba(127,47,93,0.4)] active:scale-95 transition-all btn-neumorphic">
          ${this.isEdit ? 'Save Changes' : 'Add Medication'}
        </button>
      </div></main>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.querySelector('#save-btn').addEventListener('click', () => this.save());
    
    // Auto-save form draft to sessionStorage on input or change
    this.container.addEventListener('input', () => this.saveDraftState());
    this.container.addEventListener('change', () => this.saveDraftState());

    const categorySelect = this.container.querySelector('#m-category');
    const lblDosage = this.container.querySelector('#label-dosage');
    const lblTotal = this.container.querySelector('#label-total');
    const lblEnd = this.container.querySelector('#label-end');

    const updateLabels = () => {
      const cat = categorySelect.value;
      if (cat === 'Inhaler' || cat === 'Spray') {
        lblDosage.textContent = 'Dose (Puffs/Sprays)';
        lblTotal.textContent = 'Total Doses / Puffs';
        lblEnd.textContent = 'Discard Date (Optional)';
      } else if (cat === 'Liquid' || cat === 'Drops') {
        lblDosage.textContent = 'Dose Amount';
        lblTotal.textContent = 'Total Volume (ml)';
        lblEnd.textContent = 'Discard Date (Optional)';
      } else if (cat === 'Patch') {
        lblDosage.textContent = 'Strength';
        lblTotal.textContent = 'Total Patches';
        lblEnd.textContent = 'End Date (Optional)';
      } else {
        lblDosage.textContent = 'Dosage';
        lblTotal.textContent = 'Total Quantity';
        lblEnd.textContent = 'End Date (Optional)';
      }
    };
    categorySelect.addEventListener('change', updateLabels);
    updateLabels(); // Initial call

    const freqSelect = this.container.querySelector('#m-freq');
    const timeContainer = this.container.querySelector('#time-slots-container');

    const estimateEndDate = () => {
      const totalStr = this.container.querySelector('#m-total').value;
      const dosageStr = this.container.querySelector('#m-dosage').value;
      const freq = freqSelect.value;
      const startStr = this.container.querySelector('#m-start').value;
      const endInput = this.container.querySelector('#m-end');

      const total = parseFloat(totalStr);
      // Extract the first number from dosage (e.g. "2 puffs" -> 2)
      const dosageMatch = dosageStr.match(/\d+(\.\d+)?/);
      const dosage = dosageMatch ? parseFloat(dosageMatch[0]) : NaN;

      if (isNaN(total) || isNaN(dosage) || !startStr || total <= 0 || dosage <= 0 || freq === 'As needed') {
          return;
      }

      let dailyMultiplier = 1;
      if (freq === 'Twice daily') dailyMultiplier = 2;
      else if (freq === 'Three times daily') dailyMultiplier = 3;

      const dailyUsage = dosage * dailyMultiplier;
      const daysDuration = Math.ceil(total / dailyUsage);

      const startDate = new Date(startStr);
      startDate.setDate(startDate.getDate() + daysDuration - 1); 
      
      endInput.value = startDate.toISOString().split('T')[0];
    };

    const estimateTotalQuantity = () => {
      const startStr = this.container.querySelector('#m-start').value;
      const endStr = this.container.querySelector('#m-end').value;
      const dosageStr = this.container.querySelector('#m-dosage').value;
      const freq = freqSelect.value;
      const totalInput = this.container.querySelector('#m-total');

      if (!startStr || !endStr || freq === 'As needed') return;

      const dosageMatch = dosageStr.match(/\d+(\.\d+)?/);
      const dosage = dosageMatch ? parseFloat(dosageMatch[0]) : NaN;
      if (isNaN(dosage) || dosage <= 0) return;

      let dailyMultiplier = 1;
      if (freq === 'Twice daily') dailyMultiplier = 2;
      else if (freq === 'Three times daily') dailyMultiplier = 3;

      const dailyUsage = dosage * dailyMultiplier;
      
      const startD = new Date(startStr);
      const endD = new Date(endStr);
      if (endD < startD) return;

      const diffTime = endD - startD;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;

      if (diffDays > 0) {
          totalInput.value = diffDays * dailyUsage;
      }
    };

    this.container.querySelector('#m-total').addEventListener('input', estimateEndDate);
    this.container.querySelector('#m-dosage').addEventListener('input', estimateEndDate);
    this.container.querySelector('#m-start').addEventListener('input', estimateEndDate);
    freqSelect.addEventListener('change', estimateEndDate);
    this.container.querySelector('#m-end').addEventListener('change', estimateTotalQuantity);

    const renderTimeSlots = (isInitial = false) => {
      const freq = freqSelect.value;
      let slots = 0;
      let defaultTimes = [];

      if (freq === 'Once daily') {
        slots = 1;
        defaultTimes = ['08:00'];
      } else if (freq === 'Twice daily') {
        slots = 2;
        defaultTimes = ['08:00', '20:00'];
      } else if (freq === 'Three times daily') {
        slots = 3;
        defaultTimes = ['08:00', '14:00', '20:00'];
      }

      if (slots === 0) {
        timeContainer.innerHTML = '';
        return;
      }

      let html = '';
      for (let i = 0; i < slots; i++) {
        const timeVal = (isInitial && this.medData.times && this.medData.times[i]) ? this.medData.times[i] : defaultTimes[i];
        html += `
          <div class="form-group">
            <label for="m-time-${i}" class="form-label">Dose ${i + 1} Time</label>
            <input type="time" id="m-time-${i}" class="form-input btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2" value="${timeVal || '08:00'}">
          </div>
        `;
      }
      timeContainer.innerHTML = html;
    };

    if (freqSelect && timeContainer) {
      freqSelect.addEventListener('change', () => {
        renderTimeSlots(false);
        this.saveDraftState();
      });
      renderTimeSlots(true);
    }
  }

  saveDraftState() {
    const data = {
      isEdit: this.isEdit,
      medId: this.medId,
      name: this.container.querySelector('#m-name')?.value || '',
      dosage: this.container.querySelector('#m-dosage')?.value || '',
      dosageUnit: this.container.querySelector('#m-unit')?.value || 'mg',
      totalQuantity: this.container.querySelector('#m-total')?.value || '',
      refillThreshold: this.container.querySelector('#m-threshold')?.value || '5',
      category: this.container.querySelector('#m-category')?.value || 'Tablet',
      frequency: this.container.querySelector('#m-freq')?.value || 'Once daily',
      genericName: this.container.querySelector('#m-generic')?.value || '',
      manufacturer: this.container.querySelector('#m-manuf')?.value || '',
      therapeuticCategory: this.container.querySelector('#m-thera')?.value || '',
      alternativeBrands: this.container.querySelector('#m-alt')?.value || '',
      times: Array.from(this.container.querySelectorAll('#time-slots-container input[type="time"]')).map(el => el.value),
      notes: this.container.querySelector('#m-notes')?.value || ''
    };
    sessionStorage.setItem('medcare_draft_form', JSON.stringify(data));
  }

  async save() {
    const saveBtn = this.container.querySelector('#save-btn');
    const errorEl = this.container.querySelector('#save-error');
    const name = this.container.querySelector('#m-name').value.trim();

    if (!name) {
      errorEl.textContent = 'Medication name is required.';
      errorEl.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    errorEl.classList.add('hidden');

    const data = {
      userId: state.user?.uid || 'anonymous',
      name,
      dosage: this.container.querySelector('#m-dosage').value.trim(),
      dosageUnit: this.container.querySelector('#m-unit').value,
      totalQuantity: parseInt(this.container.querySelector('#m-total').value, 10) || 0,
      refillThreshold: parseInt(this.container.querySelector('#m-threshold').value, 10) || 5,
      category: this.container.querySelector('#m-category').value,
      frequency: this.container.querySelector('#m-freq').value,
      times: Array.from(this.container.querySelectorAll('#time-slots-container input[type="time"]')).map(el => el.value),
      notes: this.container.querySelector('#m-notes').value,
      active: true,
      
      // FIX: Append strict temporal boundaries so the calendar knows when this started
      startDate: this.container.querySelector('#m-start')?.value || new Date().toISOString().split('T')[0],
      endDate: this.container.querySelector('#m-end')?.value || '',
    };

    const parsedDosage = parseFloat(data.dosage) || 0;
    
    // Normalize dosage to mg for warning check
    let mgEquivalent = 0;
    if (data.dosageUnit === 'mg') mgEquivalent = parsedDosage;
    else if (data.dosageUnit === 'g') mgEquivalent = parsedDosage * 1000;
    else if (data.dosageUnit === 'mcg') mgEquivalent = parsedDosage / 1000;
    else if (data.dosageUnit === 'kg') mgEquivalent = parsedDosage * 1000000;

    if (mgEquivalent > 0) {
      const dailyTotal = mgEquivalent * data.times.length;
      if (dailyTotal > 4000) {
        const confirmOverride = await new Promise((resolve) => {
          const div = document.createElement('div');
          div.className = 'fixed inset-0 z-[9999] bg-red-900/90 backdrop-blur-sm flex items-center justify-center p-4';
          div.setAttribute('role', 'alertdialog');
          div.setAttribute('aria-modal', 'true');
          div.innerHTML = `
            <div class="bg-surface-elevated border border-red-500/50 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
              <h2 class="text-xl font-display text-text-primary mb-2 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Clinical Limit Exceeded
              </h2>
              <p class="text-sm text-text-secondary mb-6 font-mono">The total daily dosage (${dailyTotal}mg) exceeds typical clinical limits (4000mg/day). Do you want to override?</p>
              <div class="flex gap-3">
                <button id="limit-cancel" class="flex-1 py-3 rounded-xl text-text-primary font-bold tracking-wider btn-neumorphic">Cancel</button>
                <button id="limit-override" class="flex-1 py-3 rounded-xl bg-red-500/20 text-danger font-bold tracking-wider btn-neumorphic">Override</button>
              </div>
            </div>
          `;
          document.body.appendChild(div);
          window.medcareAlertLock = true;
          div.querySelector('#limit-cancel').onclick = () => { window.medcareAlertLock = false; div.remove(); resolve(false); };
          div.querySelector('#limit-override').onclick = () => { window.medcareAlertLock = false; div.remove(); resolve(true); };
        });
        if (!confirmOverride) {
          saveBtn.disabled = false;
          saveBtn.textContent = this.isEdit ? 'Save Changes' : 'Add Medication';
          return;
        }
      }
    }

    data.createdAt = new Date().toISOString();
    data.updatedAt = new Date().toISOString();
    
    // Cryptographically sign the payload for the audit trail
    data = CaregiverPortal.signPayload(data, window.activeProfileContext || 'self');

    try {
      // 1. Write to local database and Queue for P2P Sync (Offline-First CRDT)
      if (this.isEdit && this.medId) {
        data.id = this.medId;
        await SyncBridge.queueMutation('UPDATE', 'medications', data);
      } else {
        await SyncBridge.queueMutation('ADD', 'medications', data);
        this.medId = data.id; // queueMutation adds 'id' to payload if ADD
      }

      // 2. DUAL-WRITE: Write to Firestore (Cloud Sync) - Do not await to avoid offline hanging
      const firestoreDb = getFirestore();
      const cloudDocId = `${data.userId}_${this.medId}`;
      setDoc(doc(firestoreDb, 'medications', cloudDocId), data, { merge: true }).catch(console.error);

      sessionStorage.removeItem('medcare_draft_form');
      window.location.hash = '#/medications';
    } catch (e) {
      console.error('[AddMedication] Save error:', e);
      errorEl.textContent = 'Failed to save medication locally.';
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = this.isEdit ? 'Save Changes' : 'Add Medication';
    }
  }

  destroy() {}
}

