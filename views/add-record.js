import db from '../core/db.js';
import state from '../core/state.js';
import ClinicalLogger from '../services/ClinicalLogger.js';

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
        <div class="px-6 w-full max-w-7xl mx-auto flex flex-col pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 lg:pl-72 md:pt-8">
            <div class="clay-glass-panel p-6 mb-8 rounded-[2rem] shadow-[16px_16px_32px_rgba(0,0,0,0.5),inset_4px_4px_12px_rgba(255,255,255,0.05),inset_-4px_-4px_12px_rgba(0,0,0,0.7)] bg-[rgba(255,255,255,0.02)] backdrop-blur-2xl border border-[rgba(255,255,255,0.04)]">
                <h3 class="form-label mb-6 text-xs text-text-secondary uppercase tracking-widest font-bold">Record Details</h3>
                
                <div class="form-group relative z-50 mb-6">
                    <label for="r-type" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Record Type</label>
                    <select id="r-type" autocomplete="off" class="form-select bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors">
                        ${['Disease','Surgery','Vaccination','Allergy', 'Hospital', 'Measurement'].map(c => `<option style="background-color: #150a0f; color: #fff;" value="${c}" ${this.recordData.type===c?'selected':''}>${c}</option>`).join('')}
                    </select>
                </div>

                <div class="form-group relative z-40 mb-6">
                    <label for="r-title" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Title / Name (Type in English or Tinglish)</label>
                    <input type="text" id="r-title" autocomplete="off" class="form-input relative bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.title || ''}" placeholder="e.g. Hypertension or Jwaram">
                    <div id="r-title-dropdown" class="absolute left-0 right-0 top-full mt-2 bg-[#150a0f] border border-[rgba(255,255,255,0.06)] rounded-xl shadow-2xl z-[100] hidden max-h-48 overflow-y-auto"></div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 sm:grid-cols-2 gap-5 mb-6">
                    <div class="form-group">
                        <label for="r-status" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Status</label>
                        <select id="r-status" autocomplete="off" class="form-select bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors">
                            ${['Active','Past','Cured','Ongoing'].map(c => `<option style="background-color: #150a0f; color: #fff;" value="${c}" ${this.recordData.status===c?'selected':''}>${c}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="r-cured-date" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Cured / End Date (Optional)</label>
                        <input type="date" id="r-cured-date" class="form-input [color-scheme:dark] bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.curedDate}">
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 sm:grid-cols-2 gap-5 mb-6">
                    <div class="form-group">
                        <label for="r-date" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Diagnosed / Occurred Date</label>
                        <input type="date" id="r-date" class="form-input [color-scheme:dark] bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.date}">
                    </div>
                    <div class="form-group">
                        <label for="r-stage" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Severity / Stage (Optional)</label>
                        <input type="text" id="r-stage" autocomplete="off" class="form-input bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" value="${this.recordData.stage || ''}" placeholder="e.g. Stage 1">
                    </div>
                </div>

                <div class="form-group mb-6">
                    <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Attachment (Image / PDF)</label>
                    <div class="relative w-full">
                        <input type="file" id="r-file" accept="image/*,application/pdf,.pdf" class="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10">
                        <div class="bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm flex items-center gap-3 focus-within:border-[var(--theme-accent)] transition-colors">
                            <svg class="w-5 h-5 text-white/50" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                            <span id="r-file-name" class="text-white/50">Tap to upload a document...</span>
                        </div>
                    </div>
                </div>

                <div class="form-group">
                    <label for="r-notes" class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Clinical Notes (Optional)</label>
                    <textarea id="r-notes" rows="4" class="form-textarea bg-transparent w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-[rgba(255,255,255,0.06)] text-white text-sm focus:border-[var(--theme-accent)] transition-colors" placeholder="Any special instructions or clinical notes...">${this.recordData.notes || ''}</textarea>
                </div>
            </div>

            <div id="save-error" class="hidden text-xs text-red-400 font-bold bg-red-900/30 border border-red-500/30 rounded-xl px-4 md:px-8 lg:px-12 py-3 mb-4"></div>

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

    const fileInput = this.container.querySelector('#r-file');
    const fileNameDisplay = this.container.querySelector('#r-file-name');
    if (fileInput && fileNameDisplay) {
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileNameDisplay.textContent = e.target.files[0].name;
                fileNameDisplay.classList.replace('text-white/50', 'text-white');
            } else {
                fileNameDisplay.textContent = 'Tap to upload a document...';
                fileNameDisplay.classList.replace('text-white', 'text-white/50');
            }
        });
    }
  }

  async attachAutocompleteListeners() {
    let diseaseList = [];
    try {
        const response = await fetch('./data/diseases_11k.json');
        if (response.ok) {
            diseaseList = await response.json();
        }
    } catch (e) {
        console.error("Failed to load disease dataset", e);
    }

    const nameInput = this.container.querySelector('#r-title');
    const dropdown = this.container.querySelector('#r-title-dropdown');
    
    let activeIndex = -1;
    let currentMatches = [];
    
    const renderDropdown = () => {
        dropdown.innerHTML = '';
        if (currentMatches.length === 0) {
            dropdown.classList.add('hidden');
            return;
        }
        
        dropdown.classList.remove('hidden');
        currentMatches.forEach((m, i) => {
            const div = document.createElement('div');
            const activeClass = i === activeIndex ? 'bg-[rgba(255,184,140,0.15)] border-l-4 border-l-[#ffb88c]' : 'border-l-4 border-l-transparent';
            div.className = `px-4 md:px-8 lg:px-12 py-3 hover:bg-[rgba(255,184,140,0.1)] cursor-pointer border-b border-b-[rgba(255,255,255,0.06)] text-sm transition-colors text-left flex flex-col justify-center ${activeClass}`;
            div.innerHTML = `<div class="font-bold text-white text-base pointer-events-none">${m.english}</div>
                             ${m.tinglish ? `<div class="text-[10px] text-[#ffb88c] uppercase tracking-widest mt-0.5 pointer-events-none">Known as: ${m.tinglish}</div>` : ''}`;
            
            // Using mousedown instead of click prevents input blur from interfering
            div.addEventListener('mousedown', (e) => {
                e.preventDefault(); 
                nameInput.value = m.english;
                dropdown.classList.add('hidden');
            });
            dropdown.appendChild(div);
        });
        
        if (activeIndex >= 0) {
            const activeEl = dropdown.children[activeIndex];
            if (activeEl) {
                activeEl.scrollIntoView({ block: 'nearest' });
            }
        }
    };

    nameInput.addEventListener('input', (e) => {
        const val = e.target.value.toLowerCase().trim();
        activeIndex = -1;
        currentMatches = [];
        
        if (!val) {
            renderDropdown();
            return;
        }
        
        for (const item of diseaseList) {
            const matchSynonym = item.synonyms.find(s => s.toLowerCase().includes(val));
            if (matchSynonym || item.english.toLowerCase().includes(val)) {
                // Determine which synonym to display in the UI (the matched one or the first one as default)
                const displaySynonym = matchSynonym || (item.synonyms.length > 0 ? item.synonyms[0] : null);
                currentMatches.push({ tinglish: displaySynonym, english: item.english });
                
                // Hard limit to 50 results so 11,000 diseases don't freeze the DOM renderer
                if (currentMatches.length >= 50) break;
            }
        }
        
        renderDropdown();
    });
    
    nameInput.addEventListener('keydown', (e) => {
        if (currentMatches.length === 0 || dropdown.classList.contains('hidden')) return;
        
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            activeIndex = (activeIndex + 1) % currentMatches.length;
            renderDropdown();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            activeIndex = (activeIndex - 1 + currentMatches.length) % currentMatches.length;
            renderDropdown();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (activeIndex >= 0 && activeIndex < currentMatches.length) {
                nameInput.value = currentMatches[activeIndex].english;
                dropdown.classList.add('hidden');
            }
        } else if (e.key === 'Escape') {
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

    const fileInput = this.container.querySelector('#r-file');
    const file = fileInput && fileInput.files.length > 0 ? fileInput.files[0] : null;
    let documentUrl = null;

    if (file) {
        saveBtn.textContent = 'Uploading...';
        try {
            const SUPABASE_URL = state.supabaseUrl || window.SUPABASE_URL || 'https://ujiviocutexqbigsorol.supabase.co';
            const SUPABASE_KEY = state.supabaseAnonKey || window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXZpb2N1dGV4cWJpZ3Nvcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzU4NzgsImV4cCI6MjA5NzQ1MTg3OH0.AR7N-h-FJ5iE12EUqp3j8HyuskOoU1od8XekcbqtX-4';
            const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

            const response = await fetch(`${SUPABASE_URL}/storage/v1/object/medical-records/${fileName}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'apikey': SUPABASE_KEY,
                    'Content-Type': file.type || 'application/octet-stream'
                },
                body: file
            });
            if (response.ok) {
                documentUrl = `${SUPABASE_URL}/storage/v1/object/public/medical-records/${fileName}`;
            } else {
                console.warn('[AddRecord] Supabase upload failed, falling back to local blob URL');
                documentUrl = URL.createObjectURL(file);
            }
        } catch (e) {
            console.warn('[AddRecord] Supabase upload error:', e);
            documentUrl = URL.createObjectURL(file);
        }
    }
    
    saveBtn.textContent = 'Saving Record...';

    const data = {
      userId: window.appState?.activeProfileContext?.id || state.activeProfileContext?.id || state.user?.uid || 'anonymous',
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
    
    if (documentUrl) {
      data.documentUrl = documentUrl;
    }

    try {
      if (data.type === 'Disease') {
          await ClinicalLogger.addDisease({
              diseaseName: data.title,
              clinicalName: data.title,
              stage: data.stage,
              status: data.status,
              notes: data.notes,
              date: data.date,
              documentUrl: data.documentUrl || null
          });
      } else if (data.type === 'Surgery') {
          await ClinicalLogger.addSurgery({
              outcome: data.title,
              hospital: 'Unknown',
              doctor: 'Unknown',
              date: data.date,
              recoveryStatus: data.status,
              notes: data.notes,
              documentUrl: data.documentUrl || null
          });
      } else if (data.type === 'Allergy') {
          await ClinicalLogger.addAllergy({
              allergy: data.title,
              severity: data.stage || 'Unknown',
              reaction: data.notes || 'Unknown',
              firstObserved: data.date,
              documentUrl: data.documentUrl || null
          });
      } else {
          await ClinicalLogger.addHistory({
              type: data.type,
              title: data.title,
              date: data.date,
              provider: 'Self',
              notes: data.notes,
              documentUrl: data.documentUrl || null
          });
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
