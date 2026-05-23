import db from '../core/db.js';

export default class MedicationDetailView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container bg-[#0a0407] min-h-[100dvh] font-sans text-gray-100';

    const hashStr = window.location.hash || '';
    const idMatch = hashStr.match(/\?id=(\d+)/);
    const id = idMatch ? parseInt(idMatch[1], 10) : null;

    if (!id) {
      this.container.innerHTML = this.renderError('Invalid Medication ID');
      return this.container;
    }

    const med = await db.medications.get(id);
    if (!med) {
      this.container.innerHTML = this.renderError('Medication not found');
      return this.container;
    }

    const allHistory = await db.doses.where('medicationId').equals(id).reverse().toArray();
    const history = allHistory.slice(0, 10);

    this.container.innerHTML = `
      <div class="sticky top-0 z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all cursor-pointer">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <h2 class="text-lg font-bold text-white tracking-tight">${med.name}</h2>
        <div class="w-16"></div>
      </div>

      <main class="scroll-area px-6 pb-24">
        <!-- Section 1: Overview Card -->
        <section class="mb-8">
          <h3 class="text-[10px] text-gray-400 font-bold mb-3 tracking-[0.2em] uppercase">Overview</h3>
          <div class="bg-[#1a0a12] border border-[#7f2f5d]/30 rounded-2xl p-4 shadow-lg">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">Dosage</p>
                <p class="text-base font-bold text-[#ffb88c] mt-1">${med.dosage || '—'} ${med.dosageUnit || ''}</p>
              </div>
              <div>
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">Frequency</p>
                <p class="text-base font-bold text-white mt-1">${med.frequency || '—'}</p>
              </div>
              <div class="col-span-2">
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">Time(s)</p>
                <p class="text-sm font-medium text-white mt-1">${Array.isArray(med.times) ? med.times.join(', ') : (med.times || '—')}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 2: Action Bar -->
        <section class="mb-8 flex gap-4">
          <button onclick="window.location.hash='#/interactions?add=${id}'" class="flex-1 bg-[#1a0a12] border border-[#ffb88c]/50 text-[#ffb88c] rounded-2xl py-4 px-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#ffb88c]/10 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Check Interactions
          </button>
          <button onclick="window.location.hash='#/edit?id=${id}'" class="flex-1 bg-[#7f2f5d]/20 border border-[#7f2f5d] text-white rounded-2xl py-4 px-2 text-[10px] font-bold uppercase tracking-widest hover:bg-[#7f2f5d]/40 active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Edit Details
          </button>
        </section>

        <!-- Section 3: History Ledger -->
        <section>
          <h3 class="text-[10px] text-gray-400 font-bold mb-4 tracking-[0.2em] uppercase">History Ledger</h3>
          <div class="space-y-3">
            ${history.length > 0 ? history.map(dose => {
              const d = new Date(dose.takenAt);
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const statusMarkup = (dose.status === 'taken' || !dose.skipped) 
                ? '<span class="text-green-400">Taken</span>' 
                : '<span class="text-red-400">Skipped</span>';
              
              return `
                <div class="bg-[#1a0a12] border-l-2 border-[#ffb88c] rounded-r-2xl rounded-l-sm p-4 flex justify-between items-center shadow-lg">
                  <div>
                    <p class="text-sm font-bold text-white">${dateStr}</p>
                    <p class="text-[10px] text-gray-500 uppercase tracking-widest mt-1">${timeStr}</p>
                  </div>
                  <div class="text-[10px] font-bold uppercase tracking-widest">
                    ${statusMarkup}
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="text-center py-10 bg-[#1a0a12]/50 rounded-2xl border border-white/5">
                <p class="text-[10px] text-gray-500 uppercase tracking-widest">No history recorded</p>
              </div>
            `}
          </div>
        </section>
      </main>
    `;

    return this.container;
  }

  renderError(msg) {
    return `
      <div class="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div class="w-16 h-16 bg-[#7f2f5d]/20 text-[#ffb88c] rounded-full flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="text-xl font-display text-white mb-2">${msg}</h3>
        <button onclick="window.history.back()" class="mt-6 px-8 py-3 bg-[#1a0a12] border border-[#7f2f5d] text-[#ffb88c] rounded-xl text-[10px] font-bold uppercase tracking-widest">Return to Ledger</button>
      </div>
    `;
  }

  destroy() {}
}