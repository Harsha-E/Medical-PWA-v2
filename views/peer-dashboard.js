import state from '../core/state.js';
import PeerMesh from '../services/PeerMesh.js';

export default class PeerDashboardView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container pb-24 relative';
    
    const peerName = state.currentPeerContext?.name || 'Unknown Peer';
    const peerId = state.currentPeerContext?.peerId || null;
    const initials = peerName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();

    let meds = [];
    let historyCount = 0;

    if (peerId) {
      try {
        const allMeds = await db.medications.toArray();
        meds = allMeds.filter(m => m.userId === peerId);
        
        const allHistory = await db.history.toArray();
        historyCount = allHistory.filter(h => h.userId === peerId).length;
      } catch (err) {
        console.error("Failed to load peer data", err);
      }
    }

    this.container.innerHTML = `
      <header class="view-header fixed top-0 left-0 right-0 h-20 bg-gradient-to-r from-[#ca5229]/20 to-[#1a0a12] border-b border-[#ca5229]/40 flex items-center justify-between px-6 z-50 backdrop-blur-xl">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-full bg-[#ca5229] flex items-center justify-center text-white font-display italic font-bold shadow-lg shadow-[#ca5229]/50">${initials}</div>
          <div class="flex flex-col">
            <span class="text-xs text-[#ffb88c] uppercase font-bold tracking-[0.2em] leading-none">Remote Node</span>
            <h1 class="text-lg font-display mt-1 text-white leading-none">${peerName}</h1>
          </div>
        </div>
        
        <button onclick="window.history.back()" class="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/70 active:scale-95 transition-transform">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </header>

      <main class="scroll-area px-6 pt-28 bg-[#1a0a12] min-h-screen">
        <section class="mb-10">
          <div class="glass-panel p-6 border-[#ca5229]/30 bg-[#ca5229]/5 shadow-xl shadow-[#ca5229]/10">
            <h2 class="text-xs font-bold text-[#ffb88c] uppercase tracking-widest mb-4">Vital Statistics</h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Medications</p>
                <p class="text-xl font-bold text-white">${meds.length}</p>
              </div>
              <div class="p-4 bg-black/40 rounded-2xl border border-white/5">
                <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Records</p>
                <p class="text-xl font-bold text-white">${historyCount}</p>
              </div>
              <div class="col-span-2 p-4 bg-black/40 rounded-2xl border border-white/5 flex items-center justify-between">
                <div>
                  <p class="text-xs text-gray-500 uppercase tracking-widest mb-1">Network Status</p>
                  <p class="text-sm font-bold text-green-400">Connected</p>
                </div>
                <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_#22c55e]"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-xs font-bold text-[#ffb88c]/70 uppercase tracking-widest mb-4 px-2">Active Medications</h3>
          <div class="space-y-4">
            ${meds.length > 0 ? meds.map(m => `
              <div class="glass-panel p-5 border-[#7f2f5d]/30 bg-white/5 flex justify-between items-center">
                <div>
                  <p class="font-bold text-white text-base">${m.name}</p>
                  <p class="text-xs font-mono text-[#ffb88c]/70 uppercase tracking-widest">${m.dosage || ''} ${m.dosageUnit || 'mg'} &bull; ${m.frequency || 'Daily'}</p>
                </div>
              </div>
            `).join('') : `
              <div class="glass-panel p-6 border-[#7f2f5d]/30 bg-white/5 text-center opacity-70">
                <p class="text-xs text-gray-400 font-mono uppercase tracking-widest">No active medications shared.</p>
              </div>
            `}
          </div>
        </section>
      </main>
    `;

    return this.container;
  }
}
