import state from '../core/state.js';
import db from '../core/db.js';

export default class EmergencyView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const family = await db.family.toArray();
    const primaryContact = family.find(p => p.relationship?.toLowerCase().includes('spouse')) || family[0];
    const allergies = state.userProfile?.profile?.allergies || [];
    const conditions = state.userProfile?.profile?.conditions || [];

    const displayName = state.user?.displayName || 'Harsha Edupuganti';
    const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'HE';
    const bloodType = state.userProfile?.profile?.bloodType || 'O+';

    this.container.innerHTML = `
      <header class="view-header bg-red-600 border-none justify-between px-6">
        <div class="flex flex-col">
          <span class="text-[10px] text-uppercase text-white/60 uppercase font-bold tracking-widest leading-none">Critical Systems</span>
          <h1 class="text-xl font-display mt-1 text-white leading-none">Emergency Identity</h1>
        </div>
        <button id="back-btn" class="bg-white/20 text-white w-11 h-11 rounded-2xl flex items-center justify-center backdrop-blur-lg active:scale-90 transition-transform">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </header>

      <main class="scroll-area px-6 pt-28 bg-red-600/5">
        <div class="bg-red-600 p-8 rounded-[40px] text-white shadow-2xl shadow-red-200 mb-12 overflow-hidden relative">
            <div class="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"/></svg>
            </div>
            
            <div class="flex items-center gap-6 mb-12">
                <div class="w-20 h-20 bg-[#1a0a12] text-red-600 rounded-[28px] flex items-center justify-center font-display italic text-4xl shadow-lg relative z-10">${initials}</div>
                <div class="relative z-10">
                    <h2 class="text-4xl font-display italic leading-tight">${displayName}</h2>
                    <div class="flex items-center gap-2 mt-2">
                        <div class="w-1.5 h-1.5 bg-white/60 rounded-full"></div>
                        <p class="text-[10px] text-uppercase font-bold tracking-[0.3em] opacity-60 uppercase">Protocol 00-ID</p>
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-y-10 gap-x-4 mb-4 relative z-10">
                <div>
                    <span class="text-[10px] font-bold opacity-60 tracking-widest block mb-2 leading-none uppercase">Blood Group</span>
                    <p class="text-2xl font-bold leading-none">${bloodType}</p>
                </div>
                <div>
                    <span class="text-[10px] font-bold opacity-60 tracking-widest block mb-2 leading-none uppercase">Epoch</span>
                    <p class="text-2xl font-bold leading-none">1996</p>
                </div>
                <div class="col-span-2">
                    <span class="text-[10px] font-bold opacity-60 tracking-widest block mb-2 leading-none uppercase">Systemic Conditions</span>
                    <p class="text-base font-bold leading-relaxed">${conditions.length ? conditions.join(', ') : 'NONE RECORDED'}</p>
                </div>
                <div class="col-span-2">
                    <span class="text-[10px] font-bold opacity-60 tracking-widest block mb-2 leading-none uppercase">Agent Sensitivities</span>
                    <p class="text-base font-bold text-white leading-relaxed">${allergies.length ? allergies.join(', ').toUpperCase() : 'NONE RECORDED'}</p>
                </div>
            </div>
        </div>

        <section class="mb-12">
            <h3 class="text-[10px] text-uppercase font-bold text-red-600 mb-8 tracking-[0.2em] px-1 uppercase">Primary Responders</h3>
            <div class="space-y-5">
                ${primaryContact ? `
                    <div class="glass-panel p-6 flex justify-between items-center bg-[#1a0a12] border-red-50 shadow-lg shadow-red-50">
                        <div>
                            <p class="font-bold text-base">${primaryContact.name}</p>
                            <p class="text-xs text-muted mt-1 font-medium uppercase tracking-widest leading-none">${primaryContact.relationship} Node &bull; ${primaryContact.phone || 'N/A'}</p>
                        </div>
                        <a href="tel:${primaryContact.phone}" class="w-12 h-12 bg-success text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 active:scale-90 transition-all">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                        </a>
                    </div>
                ` : ''}
                <div class="glass-panel p-6 flex justify-between items-center bg-[#1a0a12] border-red-50 shadow-lg shadow-red-50">
                    <div>
                        <p class="font-bold text-base">Dr. Rajesh Kumar</p>
                        <p class="text-xs text-muted mt-1 font-medium uppercase tracking-widest leading-none">Clinical Admin &bull; +91 12XXX XXX90</p>
                    </div>
                    <a href="tel:+911234567890" class="w-12 h-12 bg-success text-white rounded-2xl flex items-center justify-center shadow-lg shadow-green-100 active:scale-90 transition-all"">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
                    </a>
                </div>
            </div>
        </section>

        <button id="sos-btn" class="w-full py-6 bg-red-600 text-white rounded-3xl font-bold uppercase tracking-[0.4em] mb-12 shadow-2xl shadow-red-300 active:scale-95 transition-transform text-xs">Broadcast SOS Signal</button>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 80px; display: flex; align-items: center; z-index: 1000; }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  _showToast(msg, type = 'error') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f]'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  attachListeners() {
    this.container.querySelector('#back-btn')?.addEventListener('click', () => {
      window.history.back();
    });

    this.container.querySelector('#sos-btn')?.addEventListener('click', () => {
        if (confirm("This will attempt to contact your primary responder. Proceed?")) {
            const firstContactLink = this.container.querySelector('a[href^="tel:"]');
            if (firstContactLink && firstContactLink.href !== 'tel:null') {
                window.location.href = firstContactLink.href;
            } else {
                this._showToast("SOS Broadcasted. No primary contact number found.", 'success');
            }
        }
    });
  }

  destroy() {}
}