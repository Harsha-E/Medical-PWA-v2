/**
 * @fileoverview Add/Edit Medication View
 * Dynamically resolves URL arguments from query strings and path segments.
 */

import db from '../core/db.js';
import state from '../core/state.js';
import { collection, addDoc, doc, setDoc, getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
          <div class="grid grid-cols-2 gap-4">
            <div class="form-group">
              <label for="m-total" class="form-label">Total Quantity</label>
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
    
    // Auto-save form draft to sessionStorage on input or change
    this.container.addEventListener('input', () => this.saveDraftState());
    this.container.addEventListener('change', () => this.saveDraftState());

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
      startDate: new Date().toISOString().split('T')[0],
    };

    const parsedDosage = parseFloat(data.dosage) || 0;
    if (data.dosageUnit === 'mg' && parsedDosage > 0) {
      const dailyTotal = parsedDosage * data.times.length;
      if (dailyTotal > 4000) {
        const confirmOverride = await new Promise((resolve) => {
          const div = document.createElement('div');
          div.className = 'fixed inset-0 z-[9999] bg-red-900/90 backdrop-blur-sm flex items-center justify-center p-4';
          div.setAttribute('role', 'alertdialog');
          div.setAttribute('aria-modal', 'true');
          div.innerHTML = `
            <div class="bg-[#1a0a12] border border-red-500/50 rounded-[2rem] p-6 w-full max-w-sm shadow-2xl">
              <h2 class="text-xl font-display text-white mb-2 flex items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Clinical Limit Exceeded
              </h2>
              <p class="text-sm text-gray-300 mb-6 font-mono">The total daily dosage (${dailyTotal}mg) exceeds typical clinical limits (4000mg/day). Do you want to override?</p>
              <div class="flex gap-3">
                <button id="limit-cancel" class="flex-1 py-3 rounded-xl border border-white/10 text-white font-bold tracking-wider">Cancel</button>
                <button id="limit-override" class="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 font-bold tracking-wider border border-red-500/50">Override</button>
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

    try {
      // 1. Write to local database (Fast/Offline)
      if (this.isEdit && this.medId) {
        await db.medications.update(this.medId, data);
      } else {
        await db.medications.add(data);
      }

      // 2. DUAL-WRITE: Write to Firestore (Cloud Sync)
      const firestoreDb = getFirestore();
      if (this.isEdit && this.medId) {
        await setDoc(doc(firestoreDb, 'medications', this.medId.toString()), data, { merge: true });
      } else {
        await addDoc(collection(firestoreDb, 'medications'), data);
      }

      sessionStorage.removeItem('medcare_draft_form');
      window.location.hash = '#/medications';
    } catch (e) {
      console.error('[AddMedication] Save error:', e);
      errorEl.textContent = 'Saved locally, but cloud sync failed.';
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Retry Cloud Sync';
    }
  }

  destroy() {}
}