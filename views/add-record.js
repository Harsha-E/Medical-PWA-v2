import db from '../core/db.js';
import state from '../core/state.js';
import { getFirestore, collection, addDoc, doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export default class AddRecordView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'w-full h-full flex flex-col overflow-hidden';
    
    this.recordData = {
      type: 'Disease',
      title: '',
      date: new Date().toISOString().split('T')[0],
      stage: '',
      status: 'Active',
      curedDate: '',
      notes: ''
    };
  }

  async render() {
    this.container.innerHTML = `
      <main class="flex-1 pb-24" style="padding-left:0; padding-right:0; height: 100%; overflow-y: auto; overflow-x: hidden;">
        <div class="px-6 w-full max-w-7xl mx-auto flex flex-col pt-[112px] md:pt-8">
            <div class="clay-glass-panel p-6 mb-8 rounded-[2rem] shadow-[16px_16px_32px_rgba(0,0,0,0.5),inset_4px_4px_12px_rgba(255,255,255,0.05),inset_-4px_-4px_12px_rgba(0,0,0,0.7)] bg-[rgba(255,255,255,0.02)] backdrop-blur-2xl border border-[rgba(255,255,255,0.04)]">
                <h3 class="form-label mb-6 text-xs text-text-secondary uppercase tracking-widest font-bold">Record Details</h3>
                
                <div class="form-group relative z-50 mb-6">
                    <label for="r-type" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Record Type</label>
                    <select id="r-type" autocomplete="off" class="form-select bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors">
                        ${['Disease','Surgery','Vaccination','Allergy', 'Hospital', 'Measurement'].map(c => `<option class="bg-[#150a0f]" value="${c}" ${this.recordData.type===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group relative z-40 mb-6">
                    <label for="r-title" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Title / Name (Type in English or Tinglish)</label>
                    <input type="text" id="r-title" autocomplete="off" class="form-input relative bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.title || ''}" placeholder="e.g. Hypertension or Jwaram">
                    <div id="r-title-dropdown" class="absolute left-0 right-0 top-full mt-2 bg-[#150a0f] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl z-[100] hidden max-h-48 overflow-y-auto"></div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div class="form-group">
                        <label for="r-status" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Status</label>
                        <select id="r-status" autocomplete="off" class="form-select bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors">
                            ${['Active','Past','Cured','Ongoing'].map(c => `<option class="bg-[#150a0f]" value="${c}" ${this.recordData.status===c?'selected':''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="r-cured-date" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Cured / End Date (Optional)</label>
                        <input type="date" id="r-cured-date" class="form-input [color-scheme:dark] bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.curedDate}">
                    </div>
                </div>

                <div class="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-6">
                    <div class="form-group">
                        <label for="r-date" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Diagnosed / Occurred Date</label>
                        <input type="date" id="r-date" class="form-input [color-scheme:dark] bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.date}">
                    </div>
                    <div class="form-group">
                        <label for="r-stage" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Severity / Stage (Optional)</label>
                        <input type="text" id="r-stage" autocomplete="off" class="form-input bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.stage || ''}" placeholder="e.g. Stage 1">
                    </div>
                </div>

                <div class="form-group">
                    <label for="r-notes" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Clinical Notes (Optional)</label>
                    <textarea id="r-notes" rows="4" class="form-textarea bg-transparent w-full px-4 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" placeholder="Any special instructions or clinical notes...">${this.recordData.notes || ''}</textarea>
                </div>
            </div>

            <div id="save-error" class="hidden text-xs text-red-400 font-bold bg-red-900/30 border border-red-500/30 rounded-xl px-4 py-3 mb-4"></div>

            <button id="save-btn" class="mb-8 w-full max-w-xl mx-auto block py-4 rounded-2xl bg-gradient-to-r from-secondary to-[#43142e] text-[#ffb88c] text-sm font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(127,47,93,0.4)] active:scale-95 transition-all">
                Add Record
            </button>
        </div>
      </main>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.querySelector('#save-btn').addEventListener('click', () => this.save());
    this.attachAutocompleteListeners();
  }

  attachAutocompleteListeners() {
    const tinglishMap = {
        'jwaram': 'Fever',
        'jalubu': 'Common Cold',
        'dagg': 'Cough',
        'kadupu noppi': 'Stomach Ache',
        'tala noppi': 'Headache',
        'vanthulu': 'Vomiting',
        'viharam': 'Nausea',
        'virechanalu': 'Diarrhea / Loose Motions',
        'shwasa problem': 'Asthma / Breathing Issues',
        'bp': 'Hypertension / BP',
        'sugar': 'Diabetes',
        'mootrapu problem': 'UTI / Urinary Infection',
        'raktam thakkuva': 'Anemia',
        'kanti noppi': 'Eye Infection',
        'kallu noppi': 'Joint Pain / Arthritis',
        'nadu noppi': 'Back Pain',
        'onti noppi': 'Body Pains'
    };

    const nameInput = this.container.querySelector('#r-title');
    const dropdown = this.container.querySelector('#r-title-dropdown');
    
    nameInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        dropdown.innerHTML = '';
        
        if (!val) {
            dropdown.classList.add('hidden');
            return;
        }
        
        // Find matches in Tinglish or English
        const matches = [];
        for (const [tinglish, english] of Object.entries(tinglishMap)) {
            if (tinglish.includes(val) || english.toLowerCase().includes(val)) {
                matches.push({ tinglish, english });
            }
        }
        
        if (matches.length > 0) {
            dropdown.classList.remove('hidden');
            matches.forEach(m => {
                const div = document.createElement('div');
                div.className = 'px-4 py-3 hover:bg-[rgba(255,184,140,0.1)] cursor-pointer border-b border-[rgba(255,255,255,0.06)] text-sm transition-colors text-left';
                div.innerHTML = `<div class="font-bold text-white text-base">${m.english}</div>
                                 <div class="text-[10px] text-[#ffb88c] uppercase tracking-widest mt-0.5">Known as: ${m.tinglish}</div>`;
                div.addEventListener('click', () => {
                    nameInput.value = m.english;
                    dropdown.classList.add('hidden');
                });
                dropdown.appendChild(div);
            });
        } else {
            dropdown.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!nameInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });
  }

  async save() {
    const saveBtn = this.container.querySelector('#save-btn');
    const errorEl = this.container.querySelector('#save-error');
    const title = this.container.querySelector('#r-title').value.trim();

    if (!title) {
      errorEl.textContent = 'Record Title / Name is required.';
      errorEl.classList.remove('hidden');
      return;
    }

    saveBtn.disabled = true;
    saveBtn.textContent = 'Saving...';
    errorEl.classList.add('hidden');

    const data = {
      userId: state.user?.uid || 'anonymous',
      type: this.container.querySelector('#r-type').value,
      title: title,
      date: this.container.querySelector('#r-date').value,
      stage: this.container.querySelector('#r-stage').value.trim(),
      status: this.container.querySelector('#r-status').value,
      curedDate: this.container.querySelector('#r-cured-date').value,
      notes: this.container.querySelector('#r-notes').value.trim(),
      active: this.container.querySelector('#r-status').value !== 'Past',
      createdAt: new Date().toISOString()
    };

    try {
      if (state.user && navigator.onLine) {
        const dbFirestore = getFirestore();
        const docRef = await addDoc(collection(dbFirestore, 'history'), data);
        data.id = docRef.id;
        await db.history.put(data);
      } else {
        // Offline / No Auth
        data.id = 'temp_' + Date.now();
        await db.history.put(data);
      }

      window.location.hash = '#/clinical-ledger';
    } catch (err) {
      console.error('[AddRecord] Save error:', err);
      errorEl.textContent = 'Failed to save record. Try again.';
      errorEl.classList.remove('hidden');
      saveBtn.disabled = false;
      saveBtn.textContent = 'Add Record';
    }
  }
}
