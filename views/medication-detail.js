import db from '../core/db.js';
import { appConfirm, appAlert } from '../core/ui.js';
import { escapeHTML } from '../core/utils.js';

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
      <main class="scroll-area mt-20 md:mt-8 md:pl-64 lg:pl-72 pb-24" style="padding-top: 0; padding-left: 0; padding-right: 0;">
        <div class="px-4 md:px-8 w-full max-w-4xl mx-auto flex flex-col flex-1 pt-2">
          
          <!-- Hero Section -->
          <div class="relative w-full mb-8 pt-4 pb-8 flex items-start justify-between border-b border-white/5">
            <div>
              <div class="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-elevated/80 border border-white/5 shadow-inner mb-4">
                <img src="${(med.dosageUnit || '').toLowerCase().includes('ml') ? 'assets/icons/droplet.svg' : (med.name.toLowerCase().includes('inhaler') || med.name.toLowerCase().includes('symbicort')) ? 'assets/icons/inhaler.svg' : 'assets/icons/pill.svg'}" class="w-8 h-8 opacity-90" alt="Medication Icon">
              </div>
              <h1 class="text-4xl font-bold text-white tracking-tight mb-2 drop-shadow-md">${escapeHTML(med.name)}</h1>
              <p class="text-[11px] font-bold text-accent-primary uppercase tracking-[0.25em] drop-shadow-[0_0_8px_rgba(255,184,140,0.5)]">${escapeHTML(med.genericName || med.category || 'Prescription Medication')}</p>
            </div>
            <div class="mt-2 text-right">
               ${med.active !== false 
                 ? `<span class="px-3.5 py-1.5 rounded-xl bg-success/20 border border-success/50 text-[10px] font-black uppercase text-success tracking-widest shadow-[0_0_15px_rgba(16,185,129,0.2)]">Active</span>` 
                 : `<span class="px-3.5 py-1.5 rounded-xl bg-danger/20 border border-danger/50 text-[10px] font-black uppercase text-danger tracking-widest shadow-[0_0_15px_rgba(239,68,68,0.2)]">Inactive</span>`}
            </div>
          </div>
          
          <!-- Section 1: Overview Card -->
          <section class="mb-8">
            <div class="flex justify-between items-center mb-4 px-2">
              <h3 class="text-[10px] text-accent-primary font-bold tracking-[0.2em] uppercase">Clinical Overview</h3>
              <button id="btn-remove-med" class="text-red-400 bg-red-500/10 hover:bg-red-500/20 px-4 md:px-8 lg:px-12 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300">Remove</button>
            </div>
            
            <div class="clay-glass-panel rounded-3xl p-6 relative overflow-hidden">
              <div class="grid grid-cols-2 gap-6 relative z-10">
                <div class="bg-surface/50 p-4 rounded-2xl border border-white/5">
                  <p class="text-[9px] text-text-muted uppercase tracking-[0.2em] mb-1">Dosage</p>
                  <p class="text-lg font-bold text-white tracking-wide">${med.dosage || '—'} <span class="text-xs text-text-secondary font-normal">${med.dosageUnit || ''}</span></p>
                </div>
                <div class="bg-surface/50 p-4 rounded-2xl border border-white/5">
                  <p class="text-[9px] text-text-muted uppercase tracking-[0.2em] mb-1">Frequency</p>
                  <p class="text-lg font-bold text-white tracking-wide">${med.frequency || '—'}</p>
                </div>
                <div class="col-span-2 bg-surface/50 p-4 rounded-2xl border border-white/5 flex items-center justify-between">
                  <div>
                    <p class="text-[9px] text-text-muted uppercase tracking-[0.2em] mb-1">Scheduled Times</p>
                    <p class="text-base font-bold text-accent-primary tracking-wide">${Array.isArray(med.times) ? med.times.join(', ') : (med.times || '—')}</p>
                  </div>
                  <div class="w-10 h-10 rounded-xl bg-accent-primary/10 flex items-center justify-center text-accent-primary">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Section 2: Action Bar -->
          <section class="mb-8 grid grid-cols-2 gap-4">
            <button onclick="window.location.hash='#/safety-analysis'" class="unified-card rounded-2xl p-5 text-center group cursor-pointer transition-transform active:scale-95">
              <div class="w-12 h-12 mx-auto rounded-full bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
              </div>
              <p class="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Interactions</p>
            </button>
            <button onclick="window.location.hash='#/add-medication?id=${id}'" class="unified-card rounded-2xl p-5 text-center group cursor-pointer transition-transform active:scale-95">
              <div class="w-12 h-12 mx-auto rounded-full bg-secondary/20 text-white flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </div>
              <p class="text-[10px] font-black text-text-primary uppercase tracking-[0.2em]">Edit Details</p>
            </button>
          </section>

          <!-- Section 3: History Ledger -->
          <section>
            <h3 class="text-[10px] text-accent-primary font-bold mb-4 px-2 tracking-[0.2em] uppercase">Recent History</h3>
            <div class="space-y-3">
              ${history.length > 0 ? history.map(dose => {
                const d = new Date(dose.takenAt);
                const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                const timeStr = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const isTaken = (dose.status === 'taken' || !dose.skipped);
                
                return `
                  <div class="flex justify-between items-center bg-surface/80 border ${isTaken ? 'border-success/30' : 'border-danger/30'} rounded-2xl p-4 transition-all duration-300 relative overflow-hidden">
                    <div class="absolute left-0 top-0 bottom-0 w-1 ${isTaken ? 'bg-success' : 'bg-danger'} shadow-[0_0_10px_currentColor]"></div>
                    <div class="pl-3">
                      <p class="text-sm font-bold text-white tracking-wide">${dateStr}</p>
                      <p class="text-[10px] text-text-muted uppercase tracking-[0.2em] mt-1">${timeStr}</p>
                    </div>
                    <div class="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.2em] ${isTaken ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger'}">
                      ${isTaken ? 'Taken' : 'Missed'}
                    </div>
                  </div>
                `;
              }).join('') : `
                <div class="py-12 text-center border border-dashed border-border rounded-3xl">
                  <p class="text-xs text-text-muted font-mono uppercase tracking-[0.2em]">No history recorded</p>
                </div>
              `}
            </div>
          </section>
        </div>
      </main>
    `;

    const btnRemove = this.container.querySelector('#btn-remove-med');
    if (btnRemove) {
      btnRemove.addEventListener('click', async () => {
        if (await appConfirm(`Are you sure you want to completely remove ${med.name}?`, 'Delete Medication')) {
          try {
            await db.medications.delete(id);
            window.location.hash = '#/medications';
          } catch (e) {
            console.error('Failed to delete medication:', e);
            await appAlert('Failed to remove medication.', 'Error');
          }
        }
      });
    }

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

