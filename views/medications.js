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
        <div class="max-w-7xl mx-auto w-full px-4 md:px-6 pt-6 md:pt-8 pb-28">
          
          <header class="view-header">
            <div>
              <h1 class="text-3xl font-display text-white tracking-tight mb-1">Medications</h1>
              <p class="text-sm font-mono text-gray-400">${activeMeds.length} Active Prescriptions</p>
            </div>
            
            <div class="flex gap-2">
              <a href="#/scan" class="w-12 h-12 rounded-full bg-[#1a0a12]/40 backdrop-blur-xl border border-white/10 flex items-center justify-center text-[#ffb88c] hover:bg-white/5 transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M9 9h6v6H9z"></path></svg>
              </a>
              <a href="#/add-medication" class="w-12 h-12 rounded-full bg-gradient-to-br from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/30 flex items-center justify-center text-[#ffd9b5] hover:brightness-110 transition-all shadow-[0_0_15px_rgba(127,47,93,0.5)]">
                <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"></path></svg>
              </a>
            </div>
          </header>

          <a href="${activeMeds.length >= 2 ? '#/interaction-checker' : 'javascript:void(0)'}" class="block mb-6 ${activeMeds.length >= 2 ? 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30' : 'bg-[#1a0a12]/40 backdrop-blur-xl border-white/10 opacity-60 cursor-not-allowed'} border rounded-2xl p-4 flex items-center justify-between transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.5)]" ${activeMeds.length < 2 ? 'onclick="alert(\\\'Add at least 2 medications to check interactions.\\\')"' : ''}>
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full ${activeMeds.length >= 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-500'} flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold ${activeMeds.length >= 2 ? 'text-amber-400' : 'text-gray-400'}">Check Interactions</h3>
                <p class="text-xs ${activeMeds.length >= 2 ? 'text-amber-500/70' : 'text-gray-500'}">${activeMeds.length >= 2 ? 'Analyze your active pharmaceutical stack' : 'Add at least 2 meds to check.'}</p>
              </div>
            </div>
            <svg class="w-5 h-5 ${activeMeds.length >= 2 ? 'text-amber-400 opacity-50' : 'text-gray-600'}" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
          </a>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            ${activeMeds.length === 0 
              ? `<div class="col-span-full">${this._getEmptyState()}</div>`
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
      <a href="#/medication-detail?id=${med.id}" class="block bg-[#1a0a12]/40 backdrop-blur-xl border border-white/10 hover:border-[#ffb88c]/50 rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-base font-bold text-white mb-0.5">${med.name}</h3>
            <p class="text-xs font-mono text-gray-400">${med.dosage || ''} ${med.dosageUnit || 'mg'}</p>
          </div>
          <span class="px-2.5 py-1 rounded-md bg-[#7f2f5d]/20 text-[#ffb88c] text-xs font-bold uppercase tracking-widest border border-[#7f2f5d]/30">
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
    return `
      <div class="text-center py-12 px-6 border border-dashed border-white/20 rounded-3xl bg-[#1a0a12]/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div class="w-16 h-16 rounded-full bg-[#7f2f5d]/10 flex items-center justify-center mx-auto mb-4 border border-[#7f2f5d]/30">
          <svg class="w-8 h-8 text-[#ffb88c]/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 class="text-lg font-bold text-white mb-2">No Active Medications</h3>
        <p class="text-xs text-gray-400 font-mono mb-6 max-w-xs mx-auto">Your pharmaceutical ledger is empty. Add a medication manually or scan a prescription.</p>
        <a href="#/add-medication" class="inline-block px-6 py-3 bg-[#ca5229] hover:bg-[#ca5229]/90 text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-[#ca5229]/20">Add Prescription</a>
      </div>
    `;
  }

  _getSkeletonUI() {
    const card = () => `
      <div class="skeleton skeleton-card" style="height:80px; margin-bottom:12px; width:100%;"></div>
    `;
    return `
      <div class="max-w-7xl mx-auto w-full px-4 md:px-6 pt-6 md:pt-8 pb-28">
        <!-- Header skeleton -->
        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:32px;">
          <div>
            <div class="skeleton" style="height:32px; width:160px; margin-bottom:8px;"></div>
            <div class="skeleton" style="height:14px; width:110px;"></div>
          </div>
          <div style="display:flex; gap:8px;">
            <div class="skeleton skeleton-round" style="width:48px; height:48px;"></div>
            <div class="skeleton skeleton-round" style="width:48px; height:48px;"></div>
          </div>
        </div>
        <!-- Interaction banner skeleton -->
        <div class="skeleton skeleton-card" style="height:60px; margin-bottom:24px;"></div>
        <!-- Med cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          ${card()}${card()}${card()}
        </div>
      </div>
    `;
  }
}

