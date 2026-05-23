/**
 * @fileoverview Medications Hub View
 * Lists all active medications, links to Scanner and Add features.
 * Employs a fail-safe array fetch strategy to prevent Dexie index lockups.
 */

import state from '../core/state.js';
import db from '../core/db.js';

export default class MedicationsView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'viewport-container pb-safe min-h-screen text-gray-100';
  }

  async render() {
    // Inject visible, standard loading placeholder state immediately
    this.container.innerHTML = this._getSkeletonUI();

    try {
      const userId = state.user?.uid || 'anonymous';
      
      // WORKAROUND: Extract flat array sequence to completely bypass Index mapping checks
      const rawMeds = await db.medications.toArray();
      
      // Execute standard linear array filtering across available objects
      const allMeds = rawMeds.filter(m => !m.userId || m.userId === userId).reverse();
      const activeMeds = allMeds.filter(m => m.active !== false);

      this.container.innerHTML = `
        <div class="max-w-2xl mx-auto w-full px-4 md:px-6 pt-6 md:pt-8 pb-28">
          
          <header class="flex justify-between items-end mb-8">
            <div>
              <h1 class="text-3xl font-display text-white tracking-tight mb-1">Medications</h1>
              <p class="text-sm font-mono text-gray-400">${activeMeds.length} Active Prescriptions</p>
            </div>
            
            <div class="flex gap-2">
              <a href="#/scan" class="w-12 h-12 rounded-full bg-[#1a0a12]/80 backdrop-blur-md border border-[#7f2f5d]/30 flex items-center justify-center text-[#ffb88c] hover:bg-[#ffb88c]/10 transition-colors shadow-lg">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M9 9h6v6H9z"></path></svg>
              </a>
              <a href="#/add" class="w-12 h-12 rounded-full bg-gradient-to-br from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/30 flex items-center justify-center text-[#ffd9b5] hover:brightness-110 transition-all shadow-[0_0_15px_rgba(127,47,93,0.5)]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
              </a>
            </div>
          </header>

          ${activeMeds.length >= 2 ? `
            <a href="#/interactions" class="block mb-6 bg-amber-900/20 border border-amber-500/30 rounded-2xl p-4 flex items-center justify-between hover:bg-amber-900/30 transition-colors">
              <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400">
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                </div>
                <div>
                  <h3 class="text-sm font-bold text-amber-400">Check Interactions</h3>
                  <p class="text-xs text-amber-500/70">Analyze your active pharmaceutical stack</p>
                </div>
              </div>
              <svg class="w-5 h-5 text-amber-400 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
            </a>
          ` : ''}

          <div class="space-y-3">
            ${activeMeds.length === 0 
              ? this._getEmptyState() 
              : activeMeds.map((med) => this._getMedCard(med)).join('')
            }
          </div>
        </div>
      `;

    } catch (error) {
      console.error('[MedicationsView] Render Pipeline Failure:', error);
      this.container.innerHTML = `
        <div class="max-w-2xl mx-auto w-full px-4 pt-12 text-center">
          <div class="p-4 rounded-2xl bg-red-900/30 border border-red-500/40 text-red-200 text-xs font-mono text-left">
            Structural Exception Caught: ${error.message}
          </div>
        </div>
      `;
    }

    return this.container;
  }

  _getMedCard(med) {
    const times = Array.isArray(med.times) ? med.times : ['08:00'];
    const scheduleStr = times.length > 0 ? times.join(', ') : 'As needed';
    const category = med.category || 'Medication';

    // WORKAROUND: Route explicitly via query parameters for clean path parameter matching
    return `
      <a href="#/add?name=${encodeURIComponent(med.name)}" class="block bg-[#1a0a12]/60 backdrop-blur-md border border-[#7f2f5d]/30 hover:border-[#ffb88c]/50 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-base font-bold text-white mb-0.5">${med.name}</h3>
            <p class="text-xs font-mono text-gray-400">${med.dosage || ''} ${med.dosageUnit || 'mg'}</p>
          </div>
          <span class="px-2.5 py-1 rounded-md bg-[#7f2f5d]/20 text-[#ffb88c] text-[9px] font-bold uppercase tracking-widest border border-[#7f2f5d]/30">
            ${category}
          </span>
        </div>
        
        <div class="flex items-center gap-4 text-xs text-gray-500 font-mono">
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            ${scheduleStr}
          </div>
          <div class="flex items-center gap-1.5">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>
            ${med.frequency || 'Daily'}
          </div>
        </div>
      </a>
    `;
  }

  _getEmptyState() {
    // WORKAROUND: Remove opacity-0 configurations to bypass broken styles
    return `
      <div class="flex flex-col items-center justify-center mt-12 text-center p-8 bg-[#1a0a12]/30 border border-[#7f2f5d]/20 rounded-2xl">
        <div class="w-16 h-16 rounded-full bg-[#1a0a12] border border-[#7f2f5d]/40 flex items-center justify-center mb-4 text-[#ffb88c]">
          <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24"><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z"></path></svg>
        </div>
        <h2 class="text-lg font-bold text-white mb-2">No Medications Active</h2>
        <p class="text-xs text-gray-400 max-w-[240px] leading-relaxed mb-6">Your pharmaceutical ledger is empty. Scan a prescription or add details manually.</p>
        <div class="flex gap-4">
          <a href="#/scan" class="px-5 py-2.5 rounded-full border border-[#7f2f5d]/50 text-white text-xs font-mono uppercase tracking-widest">Scan Label</a>
          <a href="#/add" class="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#7f2f5d] to-[#4a1532] text-[#ffd9b5] text-xs font-mono uppercase tracking-widest">Add Manual</a>
        </div>
      </div>
    `;
  }

  _getSkeletonUI() {
    return `
      <div class="max-w-2xl mx-auto w-full px-6 pt-8">
        <div class="flex justify-between items-end mb-8">
          <div>
            <div class="h-8 w-40 bg-white/5 rounded animate-pulse mb-2"></div>
            <div class="h-4 w-24 bg-white/5 rounded animate-pulse"></div>
          </div>
          <div class="flex gap-2">
            <div class="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
            <div class="w-12 h-12 rounded-full bg-white/5 animate-pulse"></div>
          </div>
        </div>
        <div class="space-y-3">
          <div class="h-24 bg-white/5 border border-white/5 rounded-2xl animate-pulse"></div>
        </div>
      </div>
    `;
  }
}