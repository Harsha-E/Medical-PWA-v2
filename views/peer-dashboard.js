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
      <main class="scroll-area pt-[112px] bg-surface-elevated min-h-screen" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <section class="mb-10">
          <div class="clay-glass-panel p-6 border-primary/30 bg-primary/5 shadow-xl shadow-primary/10">
            <h2 class="text-xs font-bold text-accent-primary uppercase tracking-widest mb-4">Vital Statistics</h2>
            <div class="grid grid-cols-2 gap-4">
              <div class="p-4 bg-overlay-bg rounded-2xl border border-border">
                <p class="text-xs text-text-muted uppercase tracking-widest mb-1">Medications</p>
                <p class="text-xl font-bold text-text-primary">${meds.length}</p>
              </div>
              <div class="p-4 bg-overlay-bg rounded-2xl border border-border">
                <p class="text-xs text-text-muted uppercase tracking-widest mb-1">Records</p>
                <p class="text-xl font-bold text-text-primary">${historyCount}</p>
              </div>
              <div class="col-span-2 p-4 bg-overlay-bg rounded-2xl border border-border flex items-center justify-between">
                <div>
                  <p class="text-xs text-text-muted uppercase tracking-widest mb-1">Network Status</p>
                  <p class="text-sm font-bold text-success">Connected</p>
                </div>
                <div class="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_var(--color-success)]"></div>
              </div>
            </div>
          </div>
        </section>

        <section class="mb-10">
          <h3 class="text-xs font-bold text-accent-primary/70 uppercase tracking-widest mb-4 px-2">Active Medications</h3>
          <div class="space-y-4">
            ${meds.length > 0 ? meds.map(m => `
              <div class="clay-glass-panel p-5 border-border bg-surface-deep flex justify-between items-center">
                <div>
                  <p class="font-bold text-text-primary text-base">${m.name}</p>
                  <p class="text-xs font-mono text-accent-primary/70 uppercase tracking-widest">${m.dosage || ''} ${m.dosageUnit || 'mg'} &bull; ${m.frequency || 'Daily'}</p>
                </div>
              </div>
            `).join('') : `
              <div class="clay-glass-panel p-6 border-border bg-surface-deep text-center opacity-70">
                <p class="text-xs text-text-secondary font-mono uppercase tracking-widest">No active medications shared.</p>
              </div>
            `}
          </div>
        </section>
      </div></main>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/peer-dashboard', title: peerName } }));
    return this.container;
  }
}

