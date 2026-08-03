/**
 * @fileoverview Medications Hub View
 * Lists all active medications, links to Scanner and Add features.
 * Employs a fail-safe array fetch strategy to prevent Dexie index lockups.
 */

import state from '../core/state.js';
import { appAlert } from '../core/ui.js';
import db from '../core/db.js';
import { escapeHTML } from '../core/utils.js';

export default class MedicationsView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'viewport-container pb-safe min-h-screen text-text-primary';
    
    // Auto-refresh handler for instant CRDT/Offline sync updates
    this.onSyncComplete = () => {
        console.log('[MedicationsView] Real-time data sync detected. Re-rendering automatically.');
        this.render();
    };
    
    window.addEventListener('medcare:sync-complete', this.onSyncComplete);
    window.addEventListener('medcare:data-synced', this.onSyncComplete);
  }

  destroy() {
    window.removeEventListener('medcare:sync-complete', this.onSyncComplete);
    window.removeEventListener('medcare:data-synced', this.onSyncComplete);
  }

  async render() {
    // Inject visible, standard loading placeholder state immediately
    if (this.container.innerHTML === '') {
        this.container.innerHTML = this._getSkeletonUI();
    }

    try {
      const targetUserId = state.activeProfileContext ? String(state.activeProfileContext.id) : (state.user?.uid || 'anonymous');
      
      // WORKAROUND: Extract flat array sequence to completely bypass Index mapping checks
      const rawMeds = await db.medications.toArray();
      
      // Execute standard linear array filtering across available objects
      const allMeds = rawMeds.filter(m => !m.isDeleted && (!m.userId || String(m.userId) === targetUserId)).reverse();
      const activeMeds = allMeds.filter(m => m.active !== false);

      this.container.innerHTML = `
        <div class="max-w-7xl mx-auto w-full px-4 md:px-8 lg:px-12 pt-24 md:pt-8 md:pl-72 pb-28 md:pb-12">

          <a id="btn-check-interactions" href="${activeMeds.length >= 2 ? '#/safety-analysis' : 'javascript:void(0)'}" class="block mb-6 ${activeMeds.length >= 2 ? 'bg-amber-900/20 border-amber-500/30 hover:bg-amber-900/30' : 'bg-surface-elevated/40 backdrop-blur-xl border-border opacity-60 cursor-not-allowed'} border rounded-2xl p-4 flex items-center justify-between transition-colors shadow-[0_8px_32px_rgba(0,0,0,0.5)]" data-disabled="${activeMeds.length < 2}">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-full ${activeMeds.length >= 2 ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-text-muted'} flex items-center justify-center">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
              </div>
              <div>
                <h3 class="text-sm font-bold ${activeMeds.length >= 2 ? 'text-amber-400' : 'text-text-secondary'}">Check Interactions</h3>
                <p class="text-xs ${activeMeds.length >= 2 ? 'text-amber-500/70' : 'text-text-muted'}">${activeMeds.length >= 2 ? 'Analyze your active pharmaceutical stack' : 'Add at least 2 meds to check.'}</p>
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
        <div class="max-w-7xl mx-auto w-full px-4 md:px-8 lg:px-12 pt-24 md:pt-8 md:pl-72 pb-28 md:pb-12">
          <div class="p-4 rounded-2xl bg-red-900/30 border border-red-500/40 text-red-200 text-xs font-mono text-left">
            Structural Exception Caught: ${error.message}
          </div>
        </div>
      `;
    }

    const btnCheck = this.container.querySelector('#btn-check-interactions');
    if (btnCheck && btnCheck.dataset.disabled === 'true') {
      btnCheck.addEventListener('click', async (e) => {
        e.preventDefault();
        await appAlert("Add at least 2 medications to check interactions.", "Interaction Checker");
      });
    }

    return this.container;
  }

  _getMedCard(med) {
    const times = Array.isArray(med.times) ? med.times : ['08:00'];
    const scheduleStr = times.length > 0 ? times.join(', ') : 'As needed';
    const category = med.category || 'Medication';

    // WORKAROUND: Route explicitly via query parameters for clean path parameter matching
    return `
      <a href="#/medication-detail?id=${med.id}" class="block bg-surface-elevated/40 backdrop-blur-xl border border-border hover:border-accent-primary/50 rounded-2xl p-4 lg:p-5 transition-all duration-200 hover:-translate-y-0.5 shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div class="flex justify-between items-start mb-3">
          <div>
            <h3 class="text-base font-bold text-text-primary mb-0.5">${escapeHTML(med.name)}</h3>
            <p class="text-xs font-mono text-text-secondary">${escapeHTML(med.dosage) || ''} ${escapeHTML(med.dosageUnit) || 'mg'}</p>
          </div>
          <span class="px-2.5 py-1 rounded-md bg-secondary/20 text-accent-primary text-xs font-bold uppercase tracking-widest border border-border">
            ${category}
          </span>
        </div>
        
        <div class="flex items-center gap-4 text-xs text-text-muted font-mono">
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
      <div class="text-center py-12 px-6 border border-dashed border-border rounded-3xl bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
        <div class="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4 border border-border">
          <svg class="w-8 h-8 text-accent-primary/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
        </div>
        <h3 class="text-lg font-bold text-text-primary mb-2">No Active Medications</h3>
        <p class="text-xs text-text-secondary font-mono mb-6 max-w-xs mx-auto">Your pharmaceutical ledger is empty. Add a medication manually or scan a prescription.</p>
        <a href="#/add-medication" class="inline-block px-6 py-3 bg-primary hover:bg-primary/90 text-text-primary font-bold text-xs uppercase tracking-widest rounded-xl transition-colors shadow-lg shadow-primary/20">Add Prescription</a>
      </div>
    `;
  }

  _getSkeletonUI() {
    const card = () => `
      <div class="skeleton skeleton-card" style="height:80px; margin-bottom:12px; width:100%;"></div>
    `;
    return `
      <div class="max-w-7xl mx-auto w-full px-4 md:px-8 lg:px-12 pt-24 md:pt-8 md:pl-72 pb-28 md:pb-12">
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

