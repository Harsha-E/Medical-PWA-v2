import db from '../core/db.js';

export default class MedicationDetailView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container bg-transparent min-h-[100dvh] font-sans text-text-primary';

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
      <main class="scroll-area pt-[112px] pb-24" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <!-- Section 1: Overview Card -->
        <section class="mb-8">
          <h3 class="text-xs text-text-secondary font-bold mb-3 tracking-[0.2em] uppercase">Overview</h3>
          <div class="bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <p class="text-xs text-text-muted uppercase tracking-widest">Dosage</p>
                <p class="text-base font-bold text-accent-primary mt-1">${med.dosage || '—'} ${med.dosageUnit || ''}</p>
              </div>
              <div>
                <p class="text-xs text-text-muted uppercase tracking-widest">Frequency</p>
                <p class="text-base font-bold text-text-primary mt-1">${med.frequency || '—'}</p>
              </div>
              <div class="col-span-2">
                <p class="text-xs text-text-muted uppercase tracking-widest">Time(s)</p>
                <p class="text-sm font-medium text-text-primary mt-1">${Array.isArray(med.times) ? med.times.join(', ') : (med.times || '—')}</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Section 2: Action Bar -->
        <section class="mb-8 flex gap-4">
          <button onclick="window.location.hash='#/interactions?add=${id}'" class="flex-1 /40 backdrop-blur-md text-accent-primary rounded-2xl py-4 px-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-2 [0_8px_32px_rgba(0,0,0,0.3)] btn-neumorphic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            Check Interactions
          </button>
          <button onclick="window.location.hash='#/add-medication?id=${id}'" class="flex-1 bg-secondary/20 text-text-primary rounded-2xl py-4 px-2 text-xs font-bold uppercase tracking-widest active:scale-95 transition-all text-center flex flex-col items-center justify-center gap-2 btn-neumorphic">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
            Edit Details
          </button>
        </section>

        <!-- Section 3: History Ledger -->
        <section>
          <h3 class="text-xs text-text-secondary font-bold mb-4 tracking-[0.2em] uppercase">History Ledger</h3>
          <div class="space-y-3">
            ${history.length > 0 ? history.map(dose => {
              const d = new Date(dose.takenAt);
              const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
              const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
              const statusMarkup = (dose.status === 'taken' || !dose.skipped) 
                ? '<span class="text-success">Taken</span>' 
                : '<span class="text-danger">Skipped</span>';
              
              return `
                <div class="bg-surface-elevated/60 backdrop-blur-lg border-l-2 border-accent-primary border-y border-r border-border rounded-r-2xl rounded-l-sm p-4 flex justify-between items-center shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                  <div>
                    <p class="text-sm font-bold text-text-primary">${dateStr}</p>
                    <p class="text-xs text-text-muted uppercase tracking-widest mt-1">${timeStr}</p>
                  </div>
                  <div class="text-xs font-bold uppercase tracking-widest">
                    ${statusMarkup}
                  </div>
                </div>
              `;
            }).join('') : `
              <div class="text-center py-10 bg-surface-elevated/40 backdrop-blur-xl rounded-2xl border border-border shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <p class="text-xs text-text-muted uppercase tracking-widest">No history recorded</p>
              </div>
            `}
          </div>
        </section>
      </div></main>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/medication-detail', title: med.name } }));
    return this.container;
  }

  renderError(msg) {
    return `
      <div class="flex flex-col items-center justify-center min-h-[80vh] px-6 text-center">
        <div class="w-16 h-16 bg-secondary/20 text-accent-primary rounded-full flex items-center justify-center mb-6">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
        </div>
        <h3 class="text-xl font-display text-text-primary mb-2">${msg}</h3>
        <button onclick="window.history.back()" class="mt-6 px-8 py-3 /40 backdrop-blur-xl text-accent-primary [0_8px_32px_rgba(0,0,0,0.3)] rounded-xl text-xs font-bold uppercase tracking-widest transition-all btn-neumorphic">Return to Ledger</button>
      </div>
    `;
  }

  destroy() {}
}

