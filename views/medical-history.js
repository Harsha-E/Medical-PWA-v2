import db from '../core/db.js';
import state from '../core/state.js';

export default class MedicalHistoryView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const historyMeds = await db.history.filter(h => h.userId === state.user?.uid).toArray();
    
    const profileAllergies = state.userProfile?.profile?.allergies || [];
    const addedAllergies = historyMeds.filter(h => h.type === 'Allergy').map(a => a.title);
    const allergies = [...profileAllergies, ...addedAllergies];

    const diseases = historyMeds.filter(h => h.type === 'Disease' || h.type.toLowerCase().includes('disease') || h.type.toLowerCase().includes('condition'));
    const surgeries = historyMeds.filter(h => h.type === 'Surgery' || h.type.toLowerCase().includes('surgery') || h.type.toLowerCase().includes('operation'));
    const vaccinations = historyMeds.filter(h => h.type === 'Vaccination' || h.type.toLowerCase().includes('vaccin'));
    const hospitals = historyMeds.filter(h => h.type.toLowerCase().includes('hospital') || h.type.toLowerCase().includes('clinic'));

    this.container.innerHTML = `
      <div class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <h2 class="text-lg font-bold text-white tracking-tight">Medical Records</h2>
        <div class="w-16 flex justify-end">
          <button class="text-[#ffb88c] hover:brightness-125 transition-transform active:scale-90" id="add-history">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>
      </div>

      <main class="scroll-area px-6">
        <div class="glass-panel p-6 mb-10 shadow-xl shadow-gray-100/50">
            <h3 class="text-[10px] text-uppercase font-bold text-muted mb-6 tracking-[0.2em] uppercase">Allergies & Contraindications</h3>
            <div class="flex flex-wrap gap-2">
                ${allergies.length ? allergies.map(a => `<span class="text-xs font-bold px-3 py-1.5 bg-red-50 text-red-600 rounded-xl border border-red-100 shadow-sm">${a}</span>`).join('') : '<span class="text-xs font-bold text-muted uppercase tracking-widest">None Recorded</span>'}
            </div>
        </div>

        <section class="mb-10">
            <div class="flex justify-between items-center mb-6">
                <h3 class="text-[10px] text-uppercase font-bold text-muted tracking-[0.2em] uppercase">Clinical Categorization</h3>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div class="glass-panel p-5">
                    <p class="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Diseases</p>
                    <p class="text-xs font-bold">${diseases.length ? diseases.map(d => d.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="glass-panel p-5">
                    <p class="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Surgeries</p>
                    <p class="text-xs font-bold">${surgeries.length ? surgeries.map(s => s.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="glass-panel p-5">
                    <p class="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Vaccinations</p>
                    <p class="text-xs font-bold">${vaccinations.length ? vaccinations.map(v => v.title).join('<br>') : 'None Recorded'}</p>
                </div>
                <div class="glass-panel p-5">
                    <p class="text-[9px] font-bold text-muted uppercase tracking-widest mb-1">Hospital Init</p>
                    <p class="text-xs font-bold">${hospitals.length ? hospitals.map(h => h.title).join('<br>') : 'None Recorded'}</p>
                </div>
            </div>
        </section>

        <section class="mb-12">
            <h3 class="text-[10px] text-uppercase font-bold text-muted mb-6 tracking-[0.2em] uppercase">Longitudinal Records</h3>
            <div class="timeline-container">
                <div class="timeline-line"></div>
                ${historyMeds.length > 0 ? historyMeds.map(item => `
                    <div class="relative mb-8 last:mb-0">
                        <div class="timeline-dot"></div>
                        <div class="pl-4">
                            <span class="text-[10px] font-bold text-muted block mb-1 uppercase tracking-wider">${item.date}</span>
                            <h4 class="font-bold text-base">${item.title}</h4>
                            <p class="text-xs text-muted mt-1 uppercase font-bold tracking-widest">${item.type} &bull; ${item.provider}</p>
                        </div>
                    </div>
                `).join('') : `
                    <div class="relative py-4">
                        <p class="text-xs text-muted font-display italic">No clinical records found in the vault.</p>
                    </div>
                `}
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
  }

  showAddModal() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="bg-[#1a0a12] border border-[#7f2f5d]/50 p-8 rounded-3xl max-w-sm w-full shadow-2xl">
        <h3 class="text-lg font-display text-white mb-6">Add Clinical Record</h3>
        <form id="add-history-form" class="space-y-4">
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Record Type</label>
            <select id="h-type" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none appearance-none">
              <option value="Disease" class="bg-[#0a0407]">Disease</option>
              <option value="Surgery" class="bg-[#0a0407]">Surgery</option>
              <option value="Vaccination" class="bg-[#0a0407]">Vaccination</option>
              <option value="Allergy" class="bg-[#0a0407]">Allergy</option>
            </select>
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Title/Name</label>
            <input type="text" id="h-title" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Date</label>
            <input type="date" id="h-date" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none [color-scheme:dark]">
          </div>
          <div>
            <label class="block text-[10px] text-gray-400 uppercase tracking-widest mb-1 ml-1">Clinical Notes</label>
            <textarea id="h-notes" rows="2" class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none placeholder:text-gray-600"></textarea>
          </div>
          <div class="flex gap-3 mt-8">
            <button type="button" id="cancel-history" class="flex-1 py-3 rounded-xl border border-[#7f2f5d]/50 text-white text-[10px] uppercase font-bold tracking-widest hover:bg-white/5 transition-colors">Cancel</button>
            <button type="submit" class="flex-1 py-3 rounded-xl bg-linear-to-r from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/30 text-[#ffb88c] text-[10px] uppercase font-bold tracking-widest hover:brightness-125 transition-all">Save Record</button>
          </div>
        </form>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#cancel-history').onclick = () => modal.remove();
    modal.querySelector('#add-history-form').onsubmit = async (e) => {
      e.preventDefault();
      const type = modal.querySelector('#h-type').value;
      const title = modal.querySelector('#h-title').value.trim();
      const date = modal.querySelector('#h-date').value;
      const notes = modal.querySelector('#h-notes').value.trim();
      
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