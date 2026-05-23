/**
 * @fileoverview Add/Edit Medication View
 * Dynamically resolves URL arguments from query strings and path segments.
 */

import db from '../core/db.js';
import state from '../core/state.js';

export default class AddMedicationView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'container !pt-0 !mt-0';
    this.isEdit = false;
    this.medId = null;
    
    // Default baseline form layout data structural configuration
    this.medData = {
      name: '', dosage: '', dosageUnit: 'mg',
      category: 'Tablet', frequency: 'Once daily',
      times: ['08:00'], startDate: new Date().toISOString().split('T')[0],
      active: true, notes: ''
    };
  }

  async render() {
    const hash = window.location.hash || '';
    
    // 1. Extract parameters from routing path segments (e.g., #/edit/12)
    if (hash.includes('#/edit')) {
      this.isEdit = true;
      const pathSegments = hash.split('?')[0].split('/');
      if (pathSegments.length >= 3) {
        this.medId = parseInt(pathSegments[2], 10);
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

    this.container.innerHTML = `
      <div class="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all cursor-pointer">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <h2 class="text-lg font-bold text-white tracking-tight">${this.isEdit ? 'Edit' : 'Add'} Medication</h2>
        <div class="w-16"></div>
      </div>

      <main class="scroll-area px-6 pt-4 pb-28">
        <div class="glass-panel p-6 mb-8">
          <h3 class="form-label mb-6">Medication Details</h3>
          <div class="form-group">
            <label for="m-name" class="form-label">Name</label>
            <input type="text" id="m-name" autocomplete="off" class="form-input" value="${this.medData.name || ''}" placeholder="e.g. Atorvastatin">
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label for="m-dosage" class="form-label">Dosage</label>
              <input type="text" id="m-dosage" autocomplete="off" class="form-input" value="${this.medData.dosage || ''}" placeholder="20">
            </div>
            <div class="form-group">
              <label for="m-unit" class="form-label">Unit</label>
              <select id="m-unit" autocomplete="off" class="form-select">
                ${['mg','ml','mcg','units'].map(u => `<option value="${u}" ${this.medData.dosageUnit===u?'selected':''}>${u}</option>`).join('')}
              </select>
            </div>
          </div>
          <div class="form-group">
            <label for="m-category" class="form-label">Form</label>
            <select id="m-category" autocomplete="off" class="form-select">
              ${['Tablet','Capsule','Liquid','Injection','Patch','Other'].map(c => `<option value="${c}" ${this.medData.category===c?'selected':''}>${c}</option>`).join('')}
            </select>
          </div>
        </div>

        <div class="glass-panel p-6 mb-8">
          <h3 class="form-label mb-6">Schedule</h3>
          <div class="form-group">
            <label for="m-freq" class="form-label">Frequency</label>
            <select id="m-freq" autocomplete="off" class="form-select">
              ${['Once daily','Twice daily','Three times daily','As needed'].map(f => `<option value="${f}" ${this.medData.frequency===f?'selected':''}>${f}</option>`).join('')}
            </select>
          </div>
          <div id="time-slots-container" class="space-y-4 mt-4"></div>
        </div>

        <div class="glass-panel p-6 mb-8">
          <h3 class="form-label mb-6">Notes</h3>
          <label for="m-notes" class="sr-only">Notes</label>
          <textarea id="m-notes" class="form-textarea" rows="4" placeholder="Any special instructions...">${this.medData.notes || ''}</textarea>
        </div>

        <div id="save-error" class="hidden text-xs text-red-500 font-bold bg-red-50 border border-red-100 rounded-xl px-4 py-3 mb-4"></div>

        <button id="save-btn" class="mb-8 w-full max-w-xl mx-auto block py-4 rounded-2xl bg-gradient-to-r from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/40 text-[#ffd9b5] text-sm font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(127,47,93,0.4)] active:scale-95 transition-all">
          ${this.isEdit ? 'Save Changes' : 'Add Medication'}
        </button>
      </main>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.querySelector('#save-btn').addEventListener('click', () => this.save());

    const freqSelect = this.container.querySelector('#m-freq');
    const timeContainer = this.container.querySelector('#time-slots-container');

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
            <input type="time" id="m-time-${i}" class="form-input bg-[#0a0407] border-[#7f2f5d]/50 text-white rounded-xl px-4 py-3 w-full" value="${timeVal || '08:00'}">
          </div>
        `;
      }
      timeContainer.innerHTML = html;
    };

    if (freqSelect && timeContainer) {
      freqSelect.addEventListener('change', () => renderTimeSlots(false));
      renderTimeSlots(true);
    }
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
      category: this.container.querySelector('#m-category').value,
      frequency: this.container.querySelector('#m-freq').value,
      times: Array.from(this.container.querySelectorAll('#time-slots-container input[type="time"]')).map(el => el.value),
      notes: this.container.querySelector('#m-notes').value,
      active: true,
      updatedAt: new Date().toISOString()
    };

    try {
      if (this.isEdit && this.medId) {
        await db.medications.update(this.medId, data);
      } else {
        await db.medications.add(data);
      }
      window.location.hash = '#/medications';
    } catch (e) {
      errorEl.textContent = 'Save failed: ' + e.message;
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = this.isEdit ? 'Save Changes' : 'Add Medication';
    }
  }

  destroy() {}
}