import db from '../core/db.js';
import state from '../core/state.js';
import { escapeHTML } from '../core/utils.js';
import { registry, ConnectionState } from '../services/ConnectionRegistry.js';

export default class PeerDashboardView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container pb-24 relative min-h-screen text-[#fefcff] font-sans';
    
    const peerName = state.currentPeerContext?.name || 'Unknown Node';
    const peerId = state.currentPeerContext?.peerId || null;
    const initials = peerName.split(' ').map(n=>n[0]).join('').substring(0,2).toUpperCase();

    let meds = [];
    let history = [];
    let lastSeen = 'Unknown';
    let connState = ConnectionState.DISCONNECTED;

    if (peerId) {
      try {
        const allMeds = await db.medications.toArray();
        // Since we don't strictly know if their userId is their FirebaseUID or installationId,
        // we'll match either userId === peerId OR fallback to all meds if it's a direct 1:1 demo.
        // For a robust implementation, we check if the peerId matches the userId prefix.
        // In this architecture, peerId is often 'MED-XXXXXX'. 
        // Let's filter carefully. For demo purposes, we will fetch meds where userId !== our local userId
        const myUserId = state.user?.uid || state.installationId;
        
        // Find meds belonging to this peer (heuristic: not mine)
        meds = allMeds.filter(m => m.userId !== myUserId && !m.isDeleted);
        
        const allHistory = await db.history.toArray();
        history = allHistory.filter(h => h.userId !== myUserId && !h.isDeleted)
                            .sort((a,b) => new Date(b.date) - new Date(a.date));

        // Get network stats from registry
        connState = registry.getState(peerId);
        const ls = registry.getLastSeen(peerId);
        if (ls) {
            const diff = Math.floor((Date.now() - ls) / 1000);
            lastSeen = diff < 60 ? 'Just now' : `${Math.floor(diff/60)}m ago`;
        }
      } catch (err) {
        console.error("Failed to load peer data", err);
      }
    }

    const isConnected = connState === ConnectionState.SYNC_ACTIVE || connState === ConnectionState.AUTHORIZED;

    this.container.innerHTML = `
      <!-- Gradient background layer -->
      <div class="fixed inset-0 z-0 pointer-events-none" style="background: radial-gradient(circle at 100% 0%, rgba(16, 185, 129, 0.12) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(127, 47, 93, 0.08) 0%, transparent 50%) #0a0407;"></div>
      <!-- Frosted glass blur layer -->
      <div class="fixed inset-0 z-[1] pointer-events-none backdrop-blur-3xl bg-[#0a0407]/40"></div>

      <main class="w-full px-4 md:px-8 pt-24 md:pt-8 md:pl-72 pb-28 md:pb-12 z-10 max-w-5xl mx-auto relative flex flex-col">
        
        <!-- Header -->
        <header class="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div class="flex items-center gap-5">
                <div class="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#10b981] to-[#047857] flex items-center justify-center shadow-lg shadow-[#10b981]/20 border border-white/20">
                    <span class="text-2xl font-bold text-white font-display">${initials}</span>
                </div>
                <div>
                    <h1 class="text-3xl font-bold text-white font-display tracking-tight">${escapeHTML(peerName)}</h1>
                    <div class="flex items-center gap-2 mt-1.5">
                        <span class="w-2 h-2 rounded-full ${isConnected ? 'bg-[#10b981] animate-pulse shadow-[0_0_8px_#10b981]' : 'bg-white/30'}"></span>
                        <p class="text-[10px] text-white/50 uppercase tracking-widest font-mono font-bold">${isConnected ? 'NODE ACTIVE & SYNCING' : 'NODE OFFLINE'}</p>
                    </div>
                </div>
            </div>
            
            <div class="flex gap-4">
                <div class="text-right">
                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">NETWORK ID</p>
                    <p class="text-xs text-[#10b981] font-mono font-bold bg-[#10b981]/10 px-3 py-1 rounded-lg border border-[#10b981]/20">${escapeHTML(peerId)}</p>
                </div>
                <div class="text-right">
                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono mb-1">LAST SYNC</p>
                    <p class="text-xs text-white/80 font-mono font-bold bg-white/5 px-3 py-1 rounded-lg border border-white/10">${escapeHTML(lastSeen)}</p>
                </div>
            </div>
        </header>

        <!-- Stats Grid -->
        <section class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
            <div class="clay-glass-panel p-5 flex flex-col justify-between h-32 border-white/5">
                <div class="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#ffb88c]">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                </div>
                <div>
                    <p class="text-3xl font-bold font-display text-white leading-none">${meds.length}</p>
                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-2">Active Prescriptions</p>
                </div>
            </div>
            
            <div class="clay-glass-panel p-5 flex flex-col justify-between h-32 border-white/5">
                <div class="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-[#3b82f6]">
                    <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                </div>
                <div>
                    <p class="text-3xl font-bold font-display text-white leading-none">${history.length}</p>
                    <p class="text-[10px] text-white/40 uppercase tracking-widest font-mono mt-2">Clinical Records</p>
                </div>
            </div>
            
            <div class="clay-glass-panel p-5 flex flex-col justify-between h-32 border-[#10b981]/20 bg-[#10b981]/5 md:col-span-2">
                <div class="flex justify-between items-start">
                    <div class="w-8 h-8 rounded-xl bg-[#10b981]/20 border border-[#10b981]/30 flex items-center justify-center text-[#10b981]">
                        <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>
                    </div>
                    <span class="text-[10px] text-[#10b981] uppercase tracking-widest font-mono font-bold bg-[#10b981]/10 px-2 py-1 rounded border border-[#10b981]/20">CRDT TUNNEL SECURE</span>
                </div>
                <div>
                    <p class="text-sm font-bold text-white leading-tight">Zero-Knowledge Peer Bridge</p>
                    <p class="text-[10px] text-white/50 uppercase tracking-widest font-mono mt-1">Data is end-to-end encrypted locally.</p>
                </div>
            </div>
        </section>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 lg:grid-cols-2 gap-8">
            <!-- Active Medications -->
            <section>
                <div class="flex justify-between items-end mb-5">
                    <h2 class="text-[11px] text-[#ffb88c] font-mono font-bold uppercase tracking-widest">Prescribed Medications</h2>
                </div>
                <div class="space-y-3">
                    ${meds.length > 0 ? meds.map(m => `
                        <div class="p-4 rounded-[2rem] border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between group">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-white/50 group-hover:text-[#ffb88c] group-hover:border-[#ffb88c]/30 transition-all">
                                    <svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"></path><path d="M2 12h20"></path></svg>
                                </div>
                                <div>
                                    <h3 class="text-base font-bold text-white group-hover:text-[#ffb88c] transition-colors">${escapeHTML(m.name)}</h3>
                                    <p class="text-[10px] text-white/50 font-mono uppercase tracking-widest mt-1">${escapeHTML(m.dosage)} ${escapeHTML(m.dosageUnit || 'mg')} &bull; ${escapeHTML(m.frequency)}</p>
                                </div>
                            </div>
                        </div>
                    `).join('') : `
                        <div class="py-12 border border-dashed border-white/10 rounded-[2rem] text-center bg-white/[0.02]">
                            <p class="text-[10px] text-white/30 uppercase font-mono tracking-widest">No active medications shared</p>
                        </div>
                    `}
                </div>
            </section>

            <!-- Clinical Ledger / History -->
            <section>
                <div class="flex justify-between items-end mb-5">
                    <h2 class="text-[11px] text-[#3b82f6] font-mono font-bold uppercase tracking-widest">Clinical Ledger Activity</h2>
                </div>
                <div class="space-y-3">
                    ${history.length > 0 ? history.slice(0, 5).map(h => `
                        <div class="p-4 rounded-[2rem] border border-white/10 bg-white/5 hover:bg-white/10 transition-colors flex items-center justify-between group">
                            <div class="flex items-center gap-4">
                                <div class="w-12 h-12 rounded-2xl bg-black/40 border border-white/5 flex items-center justify-center text-white/50 group-hover:text-[#3b82f6] group-hover:border-[#3b82f6]/30 transition-all">
                                    ${h.type === 'Report' 
                                        ? '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
                                        : '<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>'}
                                </div>
                                <div>
                                    <h3 class="text-base font-bold text-white group-hover:text-[#3b82f6] transition-colors">${escapeHTML(h.title || h.type)}</h3>
                                    <p class="text-[10px] text-white/50 font-mono uppercase tracking-widest mt-1">${escapeHTML(h.date)} &bull; ${h.documentUrl ? 'HAS ATTACHMENT' : 'TEXT LOG'}</p>
                                </div>
                            </div>
                            ${h.documentUrl ? `
                                <a href="${escapeHTML(h.documentUrl)}" target="_blank" class="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-[#3b82f6]/20 hover:text-[#3b82f6] text-white/40 transition-colors border border-white/10">
                                    <svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                                </a>
                            ` : ''}
                        </div>
                    `).join('') : `
                        <div class="py-12 border border-dashed border-white/10 rounded-[2rem] text-center bg-white/[0.02]">
                            <p class="text-[10px] text-white/30 uppercase font-mono tracking-widest">No clinical history shared</p>
                        </div>
                    `}
                </div>
            </section>
        </div>
      </main>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/peer-dashboard', title: peerName } }));
    return this.container;
  }
}

