import db from '../core/db.js';
import state from '../core/state.js';
import DocLedger from '../services/DocLedger.js';
import Fuse from 'https://esm.sh/fuse.js@7.0.0';

const CLINICAL_DICTIONARY = ['Nausea', 'Headache', 'Fever', 'Rash', 'Dizziness', 'Fatigue', 'Vomiting', 'Diarrhea', 'Hypertension', 'Diabetes', 'Asthma', 'Arthritis', 'Anemia', 'Pneumonia'];
const fuse = new Fuse(CLINICAL_DICTIONARY, { threshold: 0.4 });
import app from '../app.js';

export default class MedicalHistoryView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const historyMeds = await db.history.filter(h => h.userId === state.user?.uid).toArray();

    const profileAllergies = state.userProfile?.profile?.allergies || [];
    const addedAllergies = historyMeds.filter(h => h.type === 'Allergy').map(a => a.title);
    const allergies = [...profileAllergies, ...addedAllergies];

    const records = historyMeds.sort((a, b) => new Date(b.date) - new Date(a.date));
    const dataset = historyMeds.length > 0;

    const diseases = records.filter(r => r.type === 'Disease');
    const surgeries = records.filter(r => r.type === 'Surgery');
    const vaccinations = records.filter(r => r.type === 'Vaccination');
    const hospitals = records.filter(r => r.type === 'Hospital');

    this.container.innerHTML = `
      <main class="scroll-area pt-24 md:pt-8 md:px-8 " >
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <div class="mb-6 flex gap-2">
            <input type="text" id="ledger-search" placeholder="Search Clinical Vault..." class="flex-1 px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
            <button id="upload-doc-btn" class="px-4 md:px-8 lg:px-12 py-3 rounded-xl bg-gradient-to-br from-secondary to-surface-deep text-accent-primary hover:brightness-125 transition-transform active:scale-95 btn-neumorphic">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <input type="file" id="ledger-upload" class="hidden" accept=".pdf,image/*">
        </div>

        <div class="clay-glass-panel p-6 mb-10 clay-glass-panel rounded-[2rem]">
            <h3 class="text-xs text-uppercase font-bold text-muted mb-6 tracking-[0.2em] uppercase">Allergies & Contraindications</h3>
            <div class="flex flex-wrap gap-2">
                ${allergies.length ? allergies.map(a => `<span class="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm">${a}</span>`).join('') : '<span class="text-xs font-bold text-muted uppercase tracking-widest">None Recorded</span>'}
            </div>
        </div>

        <section class="mb-10">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-xs text-uppercase font-bold text-muted tracking-[0.2em] uppercase">Clinical Categorization</h3>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="clay-glass-panel p-5 clay-glass-panel rounded-2xl">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Diseases</p>
                    <p class="text-xs font-bold">${diseases.length ? diseases.map(d => d.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="clay-glass-panel p-5 clay-glass-panel rounded-2xl">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Surgeries</p>
                    <p class="text-xs font-bold">${surgeries.length ? surgeries.map(s => s.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="clay-glass-panel p-5 clay-glass-panel rounded-2xl">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Vaccinations</p>
                    <p class="text-xs font-bold">${vaccinations.length ? vaccinations.map(v => v.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="clay-glass-panel p-5 clay-glass-panel rounded-2xl">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Hospital Init</p>
                    <p class="text-xs font-bold">${hospitals.length ? hospitals.map(h => h.title).join('<br>') : 'None Recorded'}</p>
                </div>
            </div>
        </section>

        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-muted mb-6 tracking-[0.2em] uppercase">Records</h3>
            <div class="relative pl-1">
                <div class="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-secondary/50 via-accent-primary/30 to-transparent"></div>
                <div class="space-y-6 relative z-10">
                  ${records.length > 0 ? records.map((record, index) => {
                    const dateObj = new Date(record.date);
                    const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                    const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
                    const typeIcon = this._getIconForType(record.type);

                    return `
                    <div class="relative pl-14 group">
                      <!-- Timeline Node -->
                      <div class="absolute left-1 top-4 w-10 h-10 rounded-full bg-surface-elevated border-2 border-secondary flex items-center justify-center text-accent-primary z-10 group-hover:bg-secondary/20 group-hover:scale-110 group-hover:border-accent-primary transition-all duration-300 shadow-[0_0_15px_rgba(127,47,93,0.3)]">
                        ${typeIcon}
                      </div>

                      <!-- Content Card -->
                      <div class="bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-3xl p-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] group-hover:border-border transition-all cursor-pointer">
                        <div class="flex justify-between items-start mb-2">
                          <div class="flex gap-4 items-center">
                             <div class="text-center shrink-0">
                               <span class="block text-xs text-accent-primary font-bold uppercase tracking-widest leading-none">${month}</span>
                               <span class="block text-xl font-bold text-text-primary leading-none mt-1">${day}</span>
                             </div>
                             <div>
                               <div class="flex items-center gap-2 mb-1">
                                  <span class="inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${this._getBadgeStyles(record.type)}">${record.type}</span>
                                  ${record.signature ? `<span class="flex items-center gap-1 text-success bg-success/10 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-success/30" title="Cryptographically Verified"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> VERIFIED</span>` : ''}
                               </div>
                               <h3 class="text-base font-bold text-text-primary leading-tight ${this._highlightTerminology(record.title)}">${record.title}</h3>
                               ${record.provider ? `<p class="text-xs text-accent-primary mt-1 font-mono tracking-wide flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${record.provider}</p>` : ''}
                             </div>
                          </div>
                        </div>
                        
                        ${record.notes ? `<p class="text-sm text-text-secondary mt-3 leading-relaxed border-t border-border pt-3">${this._highlightTerminology(record.notes)}</p>` : ''}
                      </div>
                    </div>
                  `}).join('') : `
                    ${!dataset ? `
                      <div class="pl-14 pt-4">
                        <div class="w-full h-[120px] bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-3xl animate-pulse"></div>
                      </div>
                      <div class="pl-14 pt-4">
                        <div class="w-full h-[120px] bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-3xl animate-pulse delay-75"></div>
                      </div>
                    ` : `
                      <div class="py-12 flex flex-col items-center justify-center bg-surface-elevated/40 backdrop-blur-xl border border-dashed border-border rounded-3xl text-center ml-14">
                        <p class="text-xs text-text-muted font-mono uppercase tracking-widest max-w-[200px]">No medical history recorded yet.</p>
                      </div>
                    `}
                  `}
                </div>
            </div>
        </section>
      </div></main>

      <style>
        .timeline-container { position:relative; padding-left:12px; }
        .timeline-line { position:absolute; left:3px; top:0; bottom:0; width:2px; background:var(--color-border); }
        .timeline-dot { position:absolute; left:-1px; top:4px; width:10px; height:10px; background:var(--color-primary); border-radius:50%; box-shadow:0 0 0 3px var(--color-card-bg); }
      </style>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/medical-history' } }));
    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    app.appHeader.on('add-history', () => {
      this.showAddModal();
    });

    this.container.querySelector('#upload-doc-btn')?.addEventListener('click', () => {
      this.container.querySelector('#ledger-upload').click();
    });

    this.container.querySelector('#ledger-upload')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const { default: ClinicalLogger } = await import('../services/ClinicalLogger.js');
        await ClinicalLogger.attachDocument(file, { type: 'Document', title: file.name, provider: 'Upload', notes: 'Secure cryptographic vault entry' });

        const fresh = new MedicalHistoryView();
        const content = await fresh.render();
        this.container.replaceWith(content);
      } catch (err) {
        console.error(err);
      }
    });

    const searchInput = this.container.querySelector('#ledger-search');
    searchInput?.addEventListener('input', async (e) => {
      const query = e.target.value.trim();
      const ledger = DocLedger.getInstance();
      const results = await ledger.search(query);

      const root = this.container.querySelector('#timeline-root');
      if (!root) return;

      if (!query) {
        // Re-render full list (we will just re-render whole view to be safe/lazy in this vanilla context)
        const fresh = new MedicalHistoryView();
        const content = await fresh.render();
        this.container.replaceWith(content);
        return;
      }

      root.innerHTML = `
            <div class="timeline-line"></div>
            ${results.length > 0 ? results.map(item => `
                <div class="relative mb-8 last:mb-0">
                    <div class="timeline-dot"></div>
                    <div class="pl-4">
                        <span class="text-xs font-bold text-muted block mb-1 uppercase tracking-wider">${item.date}</span>
                        <h4 class="font-bold text-base">${item.title}</h4>
                        <p class="text-xs text-muted mt-1 uppercase font-bold tracking-widest">${item.type} &bull; ${item.provider}</p>
                    </div>
                </div>
            `).join('') : `
                <div class="relative py-4">
                    <p class="text-xs text-muted font-display italic">No clinical records found.</p>
                </div>
            `}
        `;
    });
  }

  showAddModal() {
    const todayStr = new Date().toISOString().split('T')[0];
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-overlay-bg backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="bg-surface-elevated/60 backdrop-blur-2xl border border-border p-8 rounded-3xl max-w-sm w-full shadow-[0_8px_32px_rgba(0,0,0,0.7)]" style="overflow:visible;">
        <h3 class="text-lg font-display text-text-primary mb-6">Add Clinical Record</h3>
        <form id="add-history-form" class="space-y-4">
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Record Type</label>
            <select id="h-type" required class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
              <option value="Disease" class="bg-surface">Disease</option>
              <option value="Surgery" class="bg-surface">Surgery</option>
              <option value="Vaccination" class="bg-surface">Vaccination</option>
              <option value="Allergy" class="bg-surface">Allergy</option>
            </select>
          </div>
          <div class="relative">
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Title/Name</label>
            <input type="text" id="h-title" autocomplete="off" required class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
            <div id="h-title-dropdown" class="absolute left-0 right-0 top-full mt-2 bg-surface-elevated border border-border rounded-xl shadow-lg z-[10000] hidden max-h-48 overflow-y-auto"></div>
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Date</label>
            <input type="date" id="h-date" max="${todayStr}" required class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2[color-scheme:dark]">
          </div>
          <div>
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Clinical Notes</label>
            <textarea id="h-notes" rows="2" class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2"></textarea>
          </div>
          <div id="h-disease-extras" class="hidden space-y-4 pt-2">
            <div>
              <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Status</label>
              <select id="h-status" class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2">
                <option value="Active" class="bg-surface">Ongoing (Active)</option>
                <option value="Resolved" class="bg-surface">Cured (Past)</option>
              </select>
            </div>
            <div id="h-end-date-container" class="hidden">
              <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">End Date</label>
              <input type="date" id="h-end-date" max="${todayStr}" class="w-full px-4 md:px-8 lg:px-12 py-3 rounded-xl btn-neumorphic w-full py-3 text-xs uppercase tracking-widest font-bold flex items-center justify-center gap-2[color-scheme:dark]">
            </div>
          </div>
          <div class="pt-2">
            <label class="block text-xs text-text-secondary uppercase tracking-widest mb-1 ml-1">Attach Evidence (Optional)</label>
            <input type="file" id="h-doc" class="w-full text-xs text-text-secondary file:mr-4 file:py-2 file:px-4 md:px-8 lg:px-12 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[var(--theme-accent-muted)] file:text-[var(--theme-accent)]">
          </div>
          <div class="flex gap-3 mt-8">
            <button type="button" id="cancel-history" class="flex-1 py-3 rounded-xl text-text-primary text-xs uppercase font-bold tracking-widest transition-colors btn-neumorphic">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl bg-linear-to-r from-secondary to-surface-deep text-accent-primary text-xs uppercase font-bold tracking-widest hover:brightness-125 transition-all btn-neumorphic">Save Record</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    let selectedClinicalName = null;
    const titleInput = modal.querySelector('#h-title');
    const dropdown = modal.querySelector('#h-title-dropdown');
    const typeSelect = modal.querySelector('#h-type');

    import('../data/DiseaseOntology.js').then(module => {
        titleInput.addEventListener('input', (e) => {
            if (typeSelect.value !== 'Disease') {
                dropdown.classList.add('hidden');
                return;
            }
            
            const val = e.target.value;
            selectedClinicalName = null;
            dropdown.innerHTML = '';
            
            if (!val) {
                dropdown.classList.add('hidden');
                return;
            }
            
            const matches = module.searchOntology(val);
            if (matches.length > 0) {
                dropdown.classList.remove('hidden');
                matches.forEach(m => {
                    const div = document.createElement('div');
                    div.className = 'p-4 hover:bg-primary/20 cursor-pointer border-b border-border/50 text-sm transition-colors text-left';
                    div.innerHTML = `<div class="font-bold text-text-primary">${m.clinicalName}</div>`;
                    div.addEventListener('click', () => {
                        titleInput.value = m.clinicalName;
                        selectedClinicalName = m.clinicalName;
                        dropdown.classList.add('hidden');
                    });
                    dropdown.appendChild(div);
                });
            } else {
                dropdown.classList.add('hidden');
            }
        });
    });

    const diseaseExtras = modal.querySelector('#h-disease-extras');
    const statusSelect = modal.querySelector('#h-status');
    const endDateContainer = modal.querySelector('#h-end-date-container');

    typeSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Disease') {
            diseaseExtras.classList.remove('hidden');
        } else {
            diseaseExtras.classList.add('hidden');
        }
    });

    statusSelect.addEventListener('change', (e) => {
        if (e.target.value === 'Resolved') {
            endDateContainer.classList.remove('hidden');
        } else {
            endDateContainer.classList.add('hidden');
        }
    });

    document.addEventListener('click', (e) => {
        if (!titleInput.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
        }
    });

    modal.querySelector('#cancel-history').onclick = () => modal.remove();
    modal.querySelector('#add-history-form').onsubmit = async (e) => {
      e.preventDefault();
      const type = modal.querySelector('#h-type').value;
      let title = modal.querySelector('#h-title').value.trim();
      const date = modal.querySelector('#h-date').value;
      const notes = modal.querySelector('#h-notes').value.trim();
      
      const status = modal.querySelector('#h-status').value;
      const endDate = modal.querySelector('#h-end-date').value;
      const file = modal.querySelector('#h-doc').files[0];
      
      if (!title || !/^[a-zA-Z0-9\s\-_]+$/.test(title)) {
          await appAlert('Please enter a valid alphanumeric title.', 'Invalid Title');
          return;
      }

      const { default: ClinicalLogger } = await import('../services/ClinicalLogger.js');
      let docId = null;
      if (file) {
          docId = await ClinicalLogger.attachDocument(file, { type: 'Document', title: file.name, provider: 'Upload', notes: 'Secure cryptographic vault entry' });
      }

      if (type === 'Disease') {
          if (!selectedClinicalName) {
              await appAlert('Please select a valid disease from the dropdown to ensure accurate interaction checking.', 'Invalid Disease');
              return;
          }
          title = selectedClinicalName;
          const diseaseId = await ClinicalLogger.addDisease({
              diseaseName: title,
              clinicalName: title,
              status: status,
              createdAt: new Date(date).getTime(),
              closureDate: status === 'Resolved' && endDate ? new Date(endDate).getTime() : null,
              notes: notes
          });
          
          if (docId) {
              await ClinicalLogger.linkEntities('history', docId, 'disease_ledger', diseaseId, 'EVIDENCE');
          }
      } else {
          const spellCheck = fuse.search(title);
          if (spellCheck.length > 0) {
              title = spellCheck[0].item;
          }
          
          const historyId = await db.history.add({ type, title, date, notes, userId: state.user.uid, provider: 'Self-Reported' });
          if (docId) {
              await ClinicalLogger.linkEntities('history', docId, 'history', historyId, 'EVIDENCE');
          }
      }
      
      modal.remove();
      
      // Trigger re-render directly to apply new updates seamlessly
      const fresh = new MedicalHistoryView();
      const content = await fresh.render();
      this.container.replaceWith(content);
    };
  }

  destroy() {}
}

