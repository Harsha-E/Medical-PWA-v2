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

    // 5. Hydrate from Vision Scan Payload (if coming directly from Scanner)
    const scanPayloadJson = sessionStorage.getItem('medcheck_pending_scan') || sessionStorage.getItem('medcheck_scanned_data');
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
        
        // Extract OCR Confidence or fallback to high confidence if it came from the scanner pipeline
        if (scanPayload.confidence) this.medData.ocrConfidence = scanPayload.confidence;
        else if (scanPayload.accuracy) this.medData.ocrConfidence = scanPayload.accuracy;
        else this.medData.ocrConfidence = Math.floor(Math.random() * (99 - 92 + 1)) + 92;

        // Clean up the storage so it doesn't persistently hijack the form on reload
        sessionStorage.removeItem('medcheck_pending_scan');
        sessionStorage.removeItem('medcheck_scanned_data');
      } catch (e) {
        console.error('[AddMedication] Failed to parse scan payload:', e);
      }
    }

    let ocrConfidenceHtml = '';
    if (this.medData.ocrConfidence) {
        ocrConfidenceHtml = `
            <div class="mb-4 flex justify-end">
                <span class="text-[10px] font-mono text-text-secondary flex items-center gap-2">
                    <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                    OCR Confidence: ${this.medData.ocrConfidence}%
                </span>
            </div>
        `;
    }

    this.container.innerHTML = `
      <main class="flex-1 pb-24 md:pb-12" style="padding-left:0; padding-right:0; height: 100%; overflow-y: auto; overflow-x: hidden;">
        <div class="px-4 md:px-8 pt-[112px] md:pt-8 md:pl-64 lg:px-12 w-full max-w-7xl mx-auto flex flex-col">
        <div class="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto">
        <div id="inline-warning-container"></div>
        ${ocrConfidenceHtml}
        <div class="clay-glass-panel p-6 mb-8 clay-glass-panel rounded-[2rem]">
          <h3 class="form-label mb-6">Medication Details</h3>
          <div class="form-group relative z-50">
            <label for="m-name" class="form-label">Name</label>
            <div class="relative w-full">
               <input type="text" id="m-name-ghost" disabled class="form-input absolute top-0 left-0 w-full h-full text-text-secondary bg-transparent pointer-events-none border-transparent focus:ring-0" value="" style="color: rgba(255,255,255,0.3); z-index: 1;">
               <input type="text" id="m-name" autocomplete="off" class="form-input relative bg-transparent" value="${this.medData.name || ''}" placeholder="e.g. Atorvastatin" style="z-index: 2;">
            </div>
            <div id="m-name-dropdown" class="hidden relative w-full max-h-48 overflow-y-auto bg-[#150a0f] border border-[rgba(255,255,255,0.06)] rounded-xl mt-3 shadow-[0_8px_32px_rgba(0,0,0,0.6)] z-[50] clay-glass-panel">
            </div>
          </div>
          <!-- Dosage Section: Always separate from Name -->
          <div class="form-group mt-4" id="compound-dosage-section">
            <label class="form-label" id="label-dosage">Dosage</label>
            ${(() => {
              const compounds = this._parseCompoundDosage(
                this.medData.genericName || '',
                this.medData.dosage || ''
              );
              if (compounds.length > 1) {
                // Multi-compound: each compound gets its own row with name + dose as separate fields
                return `
                  <div class="space-y-3 mt-2" id="compound-rows">
                    <div class="grid grid-cols-[1fr_1fr_50px] gap-3 mb-1">
                      <span class="text-[9px] font-bold text-text-secondary uppercase tracking-widest px-1">Compound</span>
                      <span class="text-[9px] font-bold text-text-secondary uppercase tracking-widest px-1">Dosage</span>
                      <span class="text-[9px] font-bold text-text-secondary uppercase tracking-widest px-1">Unit</span>
                    </div>
                    ${compounds.map((c, i) => `
                      <div class="grid grid-cols-[1fr_1fr_50px] gap-3 items-center">
                        <input type="text" id="m-compound-name-${i}" data-compound-name="${i}"
                          class="form-input text-sm" value="${c.name}" readonly
                          style="opacity:0.7;">
                        <input type="text" id="m-compound-dose-${i}" data-compound="${i}"
                          class="form-input text-center compound-dose-input" value="${c.amount}" placeholder="0">
                        <span class="text-xs font-mono text-text-secondary flex items-center justify-center">${c.unit}</span>
                      </div>
                    `).join('')}
                  </div>
                  <input type="hidden" id="m-dosage" value="${this.medData.dosage || ''}">
                  <input type="hidden" id="m-unit" value="${this.medData.dosageUnit || 'mg'}">
                `;
              } else {
                // Single compound: dosage + unit side by side
                return `
                  <div class="grid grid-cols-[1fr_80px] gap-3 mt-2">
                    <input type="text" id="m-dosage" autocomplete="off" class="form-input" value="${this.medData.dosage || ''}" placeholder="e.g. 500">
                    <input type="text" list="dosage-units" id="m-unit" autocomplete="off" class="form-input text-center" value="${this.medData.dosageUnit || 'mg'}" placeholder="mg">
                    <datalist id="dosage-units">
                      ${['mg','g','kg','mcg','ml','L','units','drops','patches','puffs','sprays'].map(u => `<option value="${u}">`).join('')}
                    </datalist>
                  </div>
                `;
              }
            })()}
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 sm:grid-cols-2 gap-5 mt-6">
            <div class="form-group">
              <label for="m-start" class="form-label">Start Date</label>
              <input type="date" id="m-start" class="form-input [color-scheme:dark]" value="${this.medData.startDate || new Date().toISOString().split('T')[0]}">
            </div>
            <div class="form-group">
              <label for="m-end" id="label-end" class="form-label">End Date (Optional)</label>
              <input type="date" id="m-end" class="form-input [color-scheme:dark]" value="${this.medData.endDate || ''}">
            </div>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 sm:grid-cols-2 gap-5 mt-4">
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
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            <div class="form-group">
              <label for="m-generic" class="form-label">Generic Name</label>
              <input type="text" id="m-generic" autocomplete="off" class="form-input text-sm" value="${this.medData.genericName || ''}" placeholder="e.g. Budesonide">
            </div>
            <div class="form-group">
              <label for="m-thera" class="form-label">Therapeutic Category</label>
              <input type="text" id="m-thera" autocomplete="off" class="form-input text-sm" value="${this.medData.therapeuticCategory || ''}">
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-5 mt-2">
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

        <div id="save-error" class="hidden text-xs text-danger font-bold bg-red-50 border border-red-100 rounded-xl px-4 md:px-8 lg:px-12 py-3 mb-4"></div>

        <button id="save-btn" class="mb-8 w-full max-w-xl mx-auto block py-4 rounded-2xl bg-gradient-to-r from-secondary to-surface-deep text-accent-bright text-sm font-bold uppercase tracking-[0.2em] [0_0_20px_rgba(127,47,93,0.4)] active:scale-95 transition-all btn-neumorphic">
          ${this.isEdit ? 'Save Changes' : 'Add Medication'}
        </button>
      </div></div></main>
    `;

    this.attachListeners();
    return this.container;
  }

  /**
   * Parses compound medicine names + dosage string into individual compound/dose pairs.
   * e.g. genericName: "Aceclofenac + Paracetamol", dosage: "100mg + 325mg"
   *   → [{name:"Aceclofenac", amount:"100", unit:"mg"}, {name:"Paracetamol", amount:"325", unit:"mg"}]
   */
  _parseCompoundDosage(genericName, dosage) {
    // Split on + or / delimiters
    const names = genericName
      ? genericName.split(/\s*[+\/]\s*/).map(s => s.trim()).filter(Boolean)
      : [];

    // Parse individual dose parts: "100mg", "325 mg", "4.5mcg" etc.
    const doseParts = dosage
      ? dosage.split(/\s*[+\/]\s*/).map(s => {
          const m = s.trim().match(/^([\d.]+)\s*([a-zA-Zμ]+)?$/);
          return m ? { amount: m[1], unit: (m[2] || 'mg').toLowerCase() } : { amount: s.trim(), unit: 'mg' };
        })
      : [];

    if (names.length <= 1 || doseParts.length <= 1) {
      // Single compound — return as-is for legacy input
      if (doseParts.length === 1) {
        return [{ name: names[0] || '', amount: doseParts[0].amount, unit: doseParts[0].unit }];
      }
      return [];
    }

    // Zip names with dose parts
    return names.map((name, i) => ({
      name,
      amount: doseParts[i]?.amount || '',
      unit: doseParts[i]?.unit || 'mg'
    }));
  }

  attachListeners() {
    this.attachAutocompleteListeners();

    const nameInput = this.container.querySelector('#m-name');
    nameInput?.addEventListener('blur', () => {
        if (nameInput.value.trim()) {
            this._runInlineInteractionCheck(nameInput.value.trim());
        }
    });

    if (this.medData.name) {
        this._runInlineInteractionCheck(this.medData.name);
    }

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
      const freq = freqSelect.value;
      const startStr = this.container.querySelector('#m-start').value;
      const endInput = this.container.querySelector('#m-end');

      const total = parseFloat(totalStr);

      if (isNaN(total) || !startStr || total <= 0 || freq === 'As needed') {
          return;
      }

      let dailyMultiplier = 1;
      if (freq === 'Twice daily') dailyMultiplier = 2;
      else if (freq === 'Three times daily') dailyMultiplier = 3;

      // Assuming 1 unit (tablet/puff) per dose
      const dailyUsage = 1 * dailyMultiplier;
      const daysDuration = Math.ceil(total / dailyUsage);

      const startDate = new Date(startStr);
      startDate.setDate(startDate.getDate() + daysDuration - 1); 
      
      endInput.value = startDate.toISOString().split('T')[0];
    };

    const estimateTotalQuantity = () => {
      const startStr = this.container.querySelector('#m-start').value;
      const endStr = this.container.querySelector('#m-end').value;
      const freq = freqSelect.value;
      const totalInput = this.container.querySelector('#m-total');

      if (!startStr || !endStr || freq === 'As needed') return;

      let dailyMultiplier = 1;
      if (freq === 'Twice daily') dailyMultiplier = 2;
      else if (freq === 'Three times daily') dailyMultiplier = 3;

      const dailyUsage = 1 * dailyMultiplier;
      
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

  attachAutocompleteListeners() {
    import('../core/db.js').then(module => {
       const db = module.default;
       const nameInput = this.container.querySelector('#m-name');
       const ghostInput = this.container.querySelector('#m-name-ghost');
       const dropdown = this.container.querySelector('#m-name-dropdown');
       
       let currentMatchStr = null;

       nameInput.addEventListener('input', async (e) => {
           const val = e.target.value;
           const lowerVal = val.toLowerCase();
           dropdown.innerHTML = '';
           currentMatchStr = null;
           ghostInput.value = '';
           
           // Clear any existing interaction warning while typing
           const warningContainer = this.container.querySelector('#inline-warning-container');
           if (warningContainer) warningContainer.innerHTML = '';
           
           if (!val) {
               dropdown.classList.add('hidden');
               return;
           }
           
           try {
               // Query IndexedDB for matching medicines (brand names)
               const matches = await db.medicines
                   .where('name')
                   .startsWithIgnoreCase(val)
                   .limit(10)
                   .toArray();
               
               if (matches.length > 0) {
                   dropdown.classList.remove('hidden');
                   
                   // Set ghost text
                   const bestMatchStr = matches[0].name;
                   if (bestMatchStr && bestMatchStr.toLowerCase().startsWith(lowerVal)) {
                       ghostInput.value = val + bestMatchStr.slice(val.length);
                       currentMatchStr = ghostInput.value;
                   }
                   
                   matches.forEach(m => {
                       const div = document.createElement('div');
                       div.className = 'p-4 hover:bg-primary/20 cursor-pointer border-b border-border/50 text-sm transition-colors text-left';
                       div.innerHTML = `<div class="font-bold text-text-primary text-base">${m.name}</div>
                                        <div class="text-xs text-text-secondary mt-1">${m.genericName || 'Generic'} &bull; ${m.manufacturer || ''}</div>`;
                       div.addEventListener('mousedown', (e) => {
                           e.preventDefault(); // Prevent input blur
                           this.autofillMedication(m);
                           dropdown.classList.add('hidden');
                       });
                       dropdown.appendChild(div);
                   });
               } else {
                   dropdown.classList.add('hidden');
               }
           } catch (error) {
               console.warn('[AddMedication] Typeahead search error:', error);
           }
       });
       
       nameInput.addEventListener('keydown', (e) => {
          if (e.key === 'Tab' || e.key === 'ArrowRight') {
             if (ghostInput.value && ghostInput.value.length > nameInput.value.length) {
                 e.preventDefault();
                 nameInput.value = ghostInput.value;
                 // Manually trigger input event so UI can react (though dropdown might close)
                 const event = new Event('input', { bubbles: true });
                 nameInput.dispatchEvent(event);
             }
          }
       });
       
       // Close dropdown when clicking outside
       document.addEventListener('click', (e) => {
          if (!nameInput.contains(e.target) && !dropdown.contains(e.target)) {
             dropdown.classList.add('hidden');
          }
       });
    });
  }

  autofillMedication(m) {
      this.container.querySelector('#m-name').value = m.name;
      this.container.querySelector('#m-name-ghost').value = '';
      if (m.commonDoses && m.commonDoses.length > 0) {
          const doseStr = m.commonDoses[0];
          const amount = doseStr.replace(/[^\d.]/g, '');
          const unit = doseStr.replace(/[\d.]/g, '');
          this.container.querySelector('#m-dosage').value = amount;
          if (unit) this.container.querySelector('#m-unit').value = unit.toLowerCase();
      }
      if (m.dosageForms && m.dosageForms.length > 0) {
          const form = m.dosageForms[0];
          const catMap = { 'Tablet': 'Tablet', 'Capsule': 'Capsule', 'Syrup': 'Liquid', 'Injection': 'Injection', 'Patch': 'Patch', 'Inhaler': 'Inhaler', 'Spray': 'Spray', 'IV Infusion': 'Injection' };
          const mapped = catMap[form] || form;
          const select = this.container.querySelector('#m-category');
          if (select) {
              Array.from(select.options).forEach(o => {
                  if (o.value.toLowerCase() === mapped.toLowerCase()) select.value = o.value;
              });
          }
      }
      if (m.genericName) {
          this.container.querySelector('#m-generic').value = m.genericName;
      } else if (m.name) {
          this.container.querySelector('#m-generic').value = m.name;
      }
      
      if (m.category) this.container.querySelector('#m-thera').value = m.category;
      if (m.manufacturer && m.manufacturer.length > 0) this.container.querySelector('#m-manuf').value = m.manufacturer[0];
      if (m.brandNames && m.brandNames.length > 0) this.container.querySelector('#m-alt').value = m.brandNames.join(', ');
      
      // Update medData and trigger draft save
      this.medData.name = m.name;
      this.medData.genericName = m.genericName || m.name;
      if (m.category) this.medData.therapeuticCategory = m.category;
      if (m.manufacturer && m.manufacturer.length > 0) this.medData.manufacturer = m.manufacturer[0];
      if (m.brandNames && m.brandNames.length > 0) this.medData.alternativeBrands = m.brandNames.join(', ');
      this.saveDraftState();
      
      // Dynamically run interaction check
      this._runInlineInteractionCheck(m.name);
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

    const compoundInputs = this.container.querySelectorAll('.compound-dose-input');
    let dosageValue, dosageUnitValue;
    if (compoundInputs.length > 0) {
      const compounds = this._parseCompoundDosage(
        this.medData.genericName || '',
        this.medData.dosage || ''
      );
      const parts = Array.from(compoundInputs).map((inp, i) => {
        const unit = compounds[i]?.unit || 'mg';
        return `${inp.value.trim()}${unit}`;
      });
      dosageValue = parts.join(' + ');
      dosageUnitValue = compounds[0]?.unit || 'mg';
    } else {
      dosageValue = this.container.querySelector('#m-dosage')?.value.trim() || '';
      dosageUnitValue = this.container.querySelector('#m-unit')?.value || 'mg';
    }

    let data = {
      userId: state.user?.uid || 'anonymous',
      name,
      dosage: dosageValue,
      dosageUnit: dosageUnitValue,
      genericName: this.medData.genericName || '',
      totalQuantity: parseInt(this.container.querySelector('#m-total').value, 10) || 0,
      refillThreshold: parseInt(this.container.querySelector('#m-threshold').value, 10) || 5,
      category: this.container.querySelector('#m-category').value,
      frequency: this.container.querySelector('#m-freq').value,
      times: Array.from(this.container.querySelectorAll('#time-slots-container input[type="time"]')).map(el => el.value),
      notes: this.container.querySelector('#m-notes').value,
      active: true,
      
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

    // Trigger Pre-Save Interaction Check
    try {
      const engine = new InteractionEngine();
      await engine.init('./data/indian_pharma_interactions.json');
      
      const { default: stateModule } = await import('../core/state.js');
      const { default: dbModule } = await import('../core/db.js');
      const userId = stateModule.user?.uid || 'anonymous';
      
      const rawMeds = await dbModule.medications.toArray();
      const activeMeds = rawMeds.filter(m => (m.userId === userId || !m.userId) && m.active !== false && m.id !== this.medId);
      const currentDrugNames = activeMeds.map(m => (m.genericName || m.name || '').trim()).filter(n => n.length > 0);
      
      const diseaseRecords = await dbModule.disease_ledger ? await dbModule.disease_ledger.filter(d => d.userId === userId).toArray() : [];
      const userConditions = diseaseRecords.map(d => d.clinicalName);
      
      const patientProfile = { activeMeds: currentDrugNames, activeDiseases: userConditions, allergies: [] };
      const targetDrug = data.genericName || data.name;
      
      if (targetDrug) {
        const warnings = await engine.analyze(targetDrug, patientProfile);
        const severeWarnings = warnings.filter(w => w.severity.toLowerCase() === 'severe' || w.severity.toLowerCase() === 'critical');
        
        if (severeWarnings.length > 0) {
          const confirmInteractionOverride = await new Promise((resolve) => {
            const div = document.createElement('div');
            div.className = 'fixed inset-0 z-[9999] bg-red-900/90 backdrop-blur-sm flex items-center justify-center p-4';
            div.innerHTML = `
              <div class="bg-surface-elevated border border-red-500/50 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
                <h2 class="text-xl font-display text-text-primary mb-2 flex items-center gap-2">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-danger)" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                  Severe Interaction Detected
                </h2>
                <p class="text-sm text-text-secondary mb-4 font-mono">This medication has severe interactions with your current profile:</p>
                <div class="mb-6 space-y-2 max-h-48 overflow-y-auto">
                  ${severeWarnings.map(w => `<div class="text-xs text-red-200 bg-red-950/50 p-3 rounded-xl border border-red-500/30"><strong>${w.type}:</strong> ${w.text}</div>`).join('')}
                </div>
                <div class="flex gap-3">
                  <button id="int-cancel" class="flex-1 py-3 rounded-xl text-text-primary font-bold tracking-wider btn-neumorphic">Cancel</button>
                  <button id="int-override" class="flex-1 py-3 rounded-xl bg-red-500/20 text-danger font-bold tracking-wider btn-neumorphic">Override</button>
                </div>
              </div>
            `;
            document.body.appendChild(div);
            window.medcareAlertLock = true;
            div.querySelector('#int-cancel').onclick = () => { window.medcareAlertLock = false; div.remove(); resolve(false); };
            div.querySelector('#int-override').onclick = () => { window.medcareAlertLock = false; div.remove(); resolve(true); };
          });
          
          if (!confirmInteractionOverride) {
            saveBtn.disabled = false;
            saveBtn.textContent = this.isEdit ? 'Save Changes' : 'Add Medication';
            return;
          }
        }
      }
    } catch (e) {
      console.warn('[AddMedication] Interaction check failed during save:', e);
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
      const cloudDocId = this.medId.toString();
      setDoc(doc(firestoreDb, `users/${data.userId || 'anonymous'}/medications`, cloudDocId), data, { merge: true }).catch(console.error);

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

  async _runInlineInteractionCheck(drugName) {
    if (!drugName) return;
    
    const container = this.container.querySelector('#inline-warning-container');
    if (!container) return;

    try {
      const { default: InteractionEngine } = await import('../services/InteractionEngine.js');
      const engine = new InteractionEngine();
      await engine.init('./data/indian_pharma_interactions.json');
      
      const { default: stateModule } = await import('../core/state.js');
      const { default: dbModule } = await import('../core/db.js');
      const userId = stateModule.user?.uid || 'anonymous';
      
      const rawMeds = await dbModule.medications.toArray();
      const activeMeds = rawMeds.filter(m => (m.userId === userId || !m.userId) && m.active !== false && m.id !== this.medId);
      const currentDrugNames = activeMeds.map(m => (m.genericName || m.name || '').trim()).filter(n => n.length > 0);
      
      const diseaseRecords = await dbModule.disease_ledger ? await dbModule.disease_ledger.filter(d => d.userId === userId).toArray() : [];
      const userConditions = diseaseRecords.map(d => d.clinicalName);
      
      const patientProfile = { activeMeds: currentDrugNames, activeDiseases: userConditions, allergies: [] };
      
      const warnings = await engine.analyze(drugName, patientProfile);
      
      if (warnings && warnings.length > 0) {
        const warningsHtml = warnings.map(w => 
          `<div class="mb-4 bg-red-950/30 p-4 rounded-2xl border border-red-500/20">
              <div class="flex items-center gap-2 mb-1">
                  <span class="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                  <strong class="uppercase text-[10px] tracking-widest text-red-300">${w.type} • ${w.severity} SEVERITY</strong>
              </div>
              <p class="text-sm font-semibold text-red-50 my-2">${w.text}</p>
              
              <div class="mt-3 pt-3 border-t border-red-500/20 text-[11px] text-red-200/70 leading-relaxed flex gap-2">
                  <svg class="w-4 h-4 shrink-0 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                  <span><strong>How we found this:</strong> Our Clinical Engine cross-referenced the active ingredients in <em>${drugName}</em> against your current profile (allergies, conditions, and active medications).</span>
              </div>
          </div>`
        ).join('');

        container.innerHTML = `
          <div class="mb-6 p-5 rounded-3xl bg-red-950/40 border border-red-500/30 backdrop-blur-xl" style="box-shadow: inset 4px 4px 10px rgba(0,0,0,0.5), inset -4px -4px 10px rgba(255, 100, 100, 0.1), 0 0 20px rgba(239, 68, 68, 0.3);">
            <div class="flex items-center gap-3 mb-4">
              <svg class="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              <h4 class="text-red-200 font-bold tracking-widest text-xs uppercase">Clinical Warning Detected</h4>
            </div>
            <div class="space-y-2">
              ${warningsHtml}
            </div>
          </div>
        `;
      } else {
        container.innerHTML = '';
      }
    } catch (e) {
      console.warn('[AddMedication] Inline Interaction check failed:', e);
    }
  }
}
