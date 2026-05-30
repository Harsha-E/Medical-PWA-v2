import db from '../core/db.js';
import state from '../core/state.js';
import DocLedger from '../services/DocLedger.js';
import Fuse from 'https://esm.sh/fuse.js@7.0.0';

const CLINICAL_DICTIONARY = ['Nausea', 'Headache', 'Fever', 'Rash', 'Dizziness', 'Fatigue', 'Vomiting', 'Diarrhea', 'Hypertension', 'Diabetes', 'Asthma', 'Arthritis', 'Anemia', 'Pneumonia'];
const fuse = new Fuse(CLINICAL_DICTIONARY, { threshold: 0.4 });

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
      <div class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <h2 class="text-lg font-bold text-white tracking-tight">Medical History</h2>
        <div class="w-16 flex justify-end">
          <button class="text-[#ffb88c] hover:brightness-125 transition-transform active:scale-90" id="add-history">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <main class="scroll-area px-6">
        <div class="mb-6 flex gap-2">
            <input type="text" id="ledger-search" placeholder="Search Clinical Vault..." class="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-[#7f2f5d]/30 text-white focus:border-[#ffb88c]/50 focus:outline-none placeholder:text-[#ffb88c]/30 text-xs shadow-inner">
            <button id="upload-doc-btn" class="px-4 py-3 rounded-xl bg-gradient-to-br from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/30 text-[#ffb88c] hover:brightness-125 transition-transform active:scale-95 shadow-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
            </button>
            <input type="file" id="ledger-upload" class="hidden" accept=".pdf,image/*">
        </div>

        <div class="glass-panel p-6 mb-10 shadow-xl shadow-gray-100/50">
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
                <div class="glass-panel p-5">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Diseases</p>
                    <p class="text-xs font-bold">${diseases.length ? diseases.map(d => d.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="glass-panel p-5">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Surgeries</p>
                    <p class="text-xs font-bold">${surgeries.length ? surgeries.map(s => s.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="glass-panel p-5">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Vaccinations</p>
                    <p class="text-xs font-bold">${vaccinations.length ? vaccinations.map(v => v.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="glass-panel p-5">
                    <p class="text-xs font-bold text-muted uppercase tracking-widest mb-1">Hospital Init</p>
                    <p class="text-xs font-bold">${hospitals.length ? hospitals.map(h => h.title).join('<br>') : 'None Recorded'}</p>
                </div>
            </div>
        </section>

        <section class="mb-12">
            <h3 class="text-xs text-uppercase font-bold text-muted mb-6 tracking-[0.2em] uppercase">Records</h3>
            <div class="relative pl-1">
                <div class="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-[#7f2f5d]/50 via-[#ffb88c]/30 to-transparent"></div>
                <div class="space-y-6 relative z-10">
                  ${records.length > 0 ? records.map((record, index) => {
                    const dateObj = new Date(record.date);
                    const month = dateObj.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
                    const day = dateObj.toLocaleDateString('en-US', { day: '2-digit' });
                    const typeIcon = this._getIconForType(record.type);

                    return `
                    <div class="relative pl-14 group">
                      <!-- Timeline Node -->
                      <div class="absolute left-1 top-4 w-10 h-10 rounded-full bg-[#1a0a12] border-2 border-[#7f2f5d] flex items-center justify-center text-[#ffb88c] z-10 group-hover:bg-[#7f2f5d]/20 group-hover:scale-110 group-hover:border-[#ffb88c] transition-all duration-300 shadow-[0_0_15px_rgba(127,47,93,0.3)]">
                        ${typeIcon}
                      </div>

                      <!-- Content Card -->
                      <div class="bg-[#1a0a12]/80 backdrop-blur-md border border-[#7f2f5d]/40 rounded-3xl p-5 shadow-lg group-hover:border-[#ffb88c]/50 transition-all cursor-pointer">
                        <div class="flex justify-between items-start mb-2">
                          <div class="flex gap-4 items-center">
                             <div class="text-center shrink-0">
                               <span class="block text-xs text-[#ffb88c] font-bold uppercase tracking-widest leading-none">${month}</span>
                               <span class="block text-xl font-bold text-white leading-none mt-1">${day}</span>
                             </div>
                             <div>
                               <div class="flex items-center gap-2 mb-1">
                                  <span class="inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border ${this._getBadgeStyles(record.type)}">${record.type}</span>
                                  ${record.signature ? `<span class="flex items-center gap-1 text-[#10b981] bg-[#10b981]/10 px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest border border-[#10b981]/30" title="Cryptographically Verified"><svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg> VERIFIED</span>` : ''}
                               </div>
                               <h3 class="text-base font-bold text-white leading-tight ${this._highlightTerminology(record.title)}">${record.title}</h3>
                               ${record.provider ? `<p class="text-xs text-[#ffb88c] mt-1 font-mono tracking-wide flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> ${record.provider}</p>` : ''}
                             </div>
                          </div>
                        </div>
                        
                        ${record.notes ? `<p class="text-sm text-gray-400 mt-3 leading-relaxed border-t border-white/5 pt-3">${this._highlightTerminology(record.notes)}</p>` : ''}
                      </div>
                    </div>
                  `}).join('') : `
                    ${!dataset ? `
                      <div class="pl-14 pt-4">
                        <div class="w-full h-[120px] bg-[#1a0a12]/50 rounded-3xl animate-pulse"></div>
                      </div>
                      <div class="pl-14 pt-4">
                        <div class="w-full h-[120px] bg-[#1a0a12]/50 rounded-3xl animate-pulse delay-75"></div>
                      </div>
                    ` : `
                      <div class="py-12 flex flex-col items-center justify-center bg-[#1a0a12]/30 border border-dashed border-[#7f2f5d]/30 rounded-3xl text-center ml-14">
                        <p class="text-xs text-gray-500 font-mono uppercase tracking-widest max-w-[200px]">No medical history recorded yet.</p>
                      </div>
                    `}
                  `}
                </div>
            </div>
        </section>
      </main>

      <style>
        .timeline-container { position:relative; padding-left:12px; }
        .timeline-line { position:absolute; left:3px; top:0; bottom:0; width:2px; background:var(--color-border); }
        .timeline-dot { position:absolute; left:-1px; top:4px; width:10px; height:10px; background:var(--color-primary); border-radius:50%; box-shadow:0 0 0 3px #1a0a12; }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    this.container.querySelector('#add-history')?.addEventListener('click', () => {
      this.showAddModal();
    });

    this.container.querySelector('#upload-doc-btn')?.addEventListener('click', () => {
      this.container.querySelector('#ledger-upload').click();
    });

    this.container.querySelector('#ledger-upload')?.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const ledger = DocLedger.getInstance();
        await ledger.ingestDocument(file, { type: 'Document', title: file.name, provider: 'Upload', notes: 'Secure cryptographic vault entry' });

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
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="bg-[#1a0a12] border border-[#7f2f5d]/50 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h3 class="text-lg font-display text-white mb-6">Add Clinical Record</h3>
        <form id="add-history-form" class="space-y-4">
          <div>
            <label class="block text-xs text-gray-400 uppercase tracking-widest mb-1 ml-1">Record Type</label>
            <select id="h-type" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none appearance-none">
              <option value="Disease" class="bg-[#0a0407]">Disease</option>
              <option value="Surgery" class="bg-[#0a0407]">Surgery</option>
              <option value="Vaccination" class="bg-[#0a0407]">Vaccination</option>
              <option value="Allergy" class="bg-[#0a0407]">Allergy</option>
            </select>
          </div>
          <div>
            <label class="block text-xs text-gray-400 uppercase tracking-widest mb-1 ml-1">Title/Name</label>
            <input type="text" id="h-title" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none">
          </div>
          <div>
            <label class="block text-xs text-gray-400 uppercase tracking-widest mb-1 ml-1">Date</label>
            <input type="date" id="h-date" max="${todayStr}" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none [color-scheme:dark]">
          </div>
          <div>
            <label class="block text-xs text-gray-400 uppercase tracking-widest mb-1 ml-1">Clinical Notes</label>
            <textarea id="h-notes" rows="2" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none placeholder:text-gray-600"></textarea>
          </div>
          <div class="flex gap-3 mt-8">
            <button type="button" id="cancel-history" class="flex-1 py-3 rounded-xl border border-[#7f2f5d]/50 text-white text-xs uppercase font-bold tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl bg-linear-to-r from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/30 text-[#ffb88c] text-xs uppercase font-bold tracking-widest hover:brightness-125 transition-all">Save Record</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#cancel-history').onclick = () => modal.remove();
    modal.querySelector('#add-history-form').onsubmit = async (e) => {
      e.preventDefault();
      const type = modal.querySelector('#h-type').value;
      let title = modal.querySelector('#h-title').value.trim();
      const date = modal.querySelector('#h-date').value;
      const notes = modal.querySelector('#h-notes').value.trim();
      
      if (!title || !/^[a-zA-Z0-9\s\-_]+$/.test(title)) {
          alert('Please enter a valid alphanumeric title.');
          return;
      }
      
      const spellCheck = fuse.search(title);
      if (spellCheck.length > 0) {
          title = spellCheck[0].item;
      }
      
      await db.history.add({ type, title, date, notes, userId: state.user.uid, provider: 'Self-Reported' });
      modal.remove();
      
      // Trigger re-render directly to apply new updates seamlessly
      const fresh = new MedicalHistoryView();
      const content = await fresh.render();
      this.container.replaceWith(content);
    };
  }

  destroy() {}
}