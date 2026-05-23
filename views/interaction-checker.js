/**
 * @fileoverview Clinical Interaction Checker View
 * Cross-references active prescriptions using InteractionGraph traversals.
 * Features an interactive prospective search field for new drug matching.
 */

import state from '../core/state.js';
import db from '../core/db.js';
import { interactionGraph } from '../services/InteractionGraph.js';

export default class InteractionCheckerView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'viewport-container view-enter pb-safe min-h-screen text-gray-100';
    this.prospectiveDrug = '';
  }

  async render() {
    this.container.innerHTML = this._getSkeletonUI();

    try {
      const userId = state.user?.uid || 'anonymous';
      
      // Bypassing Dexie index queries to eliminate potential multi-tab schema lockups
      const rawMeds = await db.medications.toArray();
      const activeMeds = rawMeds.filter(m => (m.userId === userId || !m.userId) && m.active !== false);

      // Create drug list names for graph evaluation
      const currentDrugNames = activeMeds.map(m => m.name.trim());

      // If a prospective test candidate exists, temporarily append it to evaluate cross-risk
      const evaluationList = [...currentDrugNames];
      if (this.prospectiveDrug) {
        evaluationList.push(this.prospectiveDrug);
      }

      // Run graph safety computation matching edge-nodes
      const summary = interactionGraph.getInteractionSummary(evaluationList);

      this.container.innerHTML = `
        <div class="max-w-2xl mx-auto w-full px-4 md:px-6 pt-6 md:pt-8 pb-28">
          
          <header class="flex items-center justify-between mb-6">
            <a href="#/medications" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all font-mono text-xs uppercase tracking-widest">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
              Back
            </a>
            <h1 class="text-xl font-display text-white tracking-tight">Interaction Guard</h1>
            <div class="w-12"></div>
          </header>

          <section class="bg-[#1a0a12]/80 backdrop-blur-md border border-[#7f2f5d]/40 rounded-3xl p-5 mb-8 shadow-xl">
            <span class="text-[9px] font-mono tracking-widest uppercase text-[#ffb88c] block mb-1">Pre-purchase Screener</span>
            <h3 class="text-sm font-bold text-white mb-3">Test an Over-the-Counter Drug</h3>
            <p class="text-xs text-gray-400 mb-4 leading-relaxed">Type any drug name to check for severe compliance issues with your ongoing treatment path before administering it.</p>
            
            <div class="flex gap-2">
              <input type="text" id="prospective-input" value="${this.prospectiveDrug || ''}" placeholder="e.g. Ibuprofen or Aspirin" class="flex-1 bg-[#0a0407] border border-[#7f2f5d]/50 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#ffb88c]/70 transition-colors">
              ${this.prospectiveDrug ? `
                <button id="clear-screener-btn" class="px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-mono uppercase tracking-widest text-gray-400 hover:text-white transition-colors">Clear</button>
              ` : `
                <button id="run-screener-btn" class="px-5 py-3 bg-gradient-to-r from-[#7f2f5d] to-[#4a1532] border border-[#ffb88c]/40 rounded-xl text-xs font-bold uppercase tracking-widest text-[#ffd9b5] shadow-md">Check</button>
              `}
            </div>
          </section>

          ${this.prospectiveDrug ? `
            <div class="mb-6 p-4 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-xs text-blue-300 flex items-center gap-2">
              <span class="animate-pulse w-2 h-2 rounded-full bg-blue-400"></span>
              <p>Simulating regimen inclusion: <strong>${activeMeds.length} Active</strong> + Prospective Agent (<strong>${this.prospectiveDrug}</strong>)</p>
            </div>
          ` : ''}

          <div class="space-y-6">
            ${this._renderSeverityBlock('Severe Conflicts', summary.severe, 'border-red-500/40 bg-red-950/20 text-red-200', '🔴 SEVERE')}
            ${this._renderSeverityBlock('Moderate Warnings', summary.moderate, 'border-amber-500/30 bg-amber-950/20 text-amber-200', '🟡 WARNING')}
            ${this._renderSeverityBlock('Mild Reactions', summary.mild, 'border-blue-500/30 bg-blue-950/20 text-blue-300', '🔵 INFO')}
            
            ${summary.severe.length === 0 && summary.moderate.length === 0 && summary.mild.length === 0 ? `
              <div class="text-center p-8 bg-green-950/10 border border-green-500/30 rounded-3xl">
                <div class="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 text-[#10b981]">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 class="text-base font-bold text-white mb-1">Regimen Cleared</h3>
                <p class="text-xs text-gray-400 max-w-[280px] mx-auto leading-relaxed">No adverse overlapping clinical graph vectors identified across active treatments.</p>
              </div>
            ` : ''}

            <section class="mt-8 pt-6 border-t border-[#7f2f5d]/20">
              <h4 class="text-[10px] font-mono tracking-widest text-gray-500 uppercase mb-3">Evaluated Pharmacy Track</h4>
              <div class="flex flex-wrap gap-2">
                ${evaluationList.map(drug => `
                  <span class="px-3 py-1.5 rounded-xl bg-[#1a0a12] border border-[#7f2f5d]/20 font-mono text-xs text-gray-400">
                    💊 ${drug}
                  </span>
                `).join('')}
                ${evaluationList.length === 0 ? '<span class="text-xs text-gray-600 italic">No drugs queued. Add items to your active map.</span>' : ''}
              </div>
            </section>

          </div>
        </div>
      `;

      this._attachListeners();

    } catch (err) {
      console.error('[InteractionChecker] Execution broken:', err);
      this.container.innerHTML = `<div class="p-6 text-sm font-mono text-red-400 bg-red-950/10 border border-red-500/20 rounded-xl m-6">Processing Exception: ${err.message}</div>`;
    }

    return this.container;
  }

  /**
   * Evaluates array collections and builds card templates.
   * @private
   */
  _renderSeverityBlock(title, matches, styleClasses, label) {
    if (!matches || matches.length === 0) return '';

    return `
      <section>
        <h2 class="text-[10px] font-mono tracking-[0.2em] uppercase text-gray-400 mb-3 px-1">${title}</h2>
        <div class="space-y-3">
          ${matches.map(item => `
            <div class="border rounded-2xl p-4 shadow-md transition-all ${styleClasses}">
              <div class="flex justify-between items-center mb-2">
                <span class="text-[9px] font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-black/40 border border-white/5">
                  ${label}
                </span>
                <span class="text-[10px] font-mono text-gray-400">Conflict Point</span>
              </div>
              <h4 class="text-sm font-bold text-white mb-1">${item.drug1} <span class="text-xs text-gray-400 font-normal">cross-linked with</span> ${item.drug2}</h4>
              <p class="text-xs opacity-90 leading-relaxed mb-3">${item.description}</p>
              <div class="pt-3 border-t border-white/5 flex gap-2 items-start">
                <span class="text-[10px] font-mono text-[#ffb88c] uppercase tracking-widest shrink-0 mt-0.5">Protocol:</span>
                <p class="text-xs text-gray-300 italic leading-relaxed">${item.recommendation}</p>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }

  _attachListeners() {
    const input = this.container.querySelector('#prospective-input');
    const runBtn = this.container.querySelector('#run-screener-btn');
    const clearBtn = this.container.querySelector('#clear-screener-btn');

    const triggerSearch = () => {
      const query = input?.value.trim();
      if (!query) return;
      this.prospectiveDrug = query;
      this.render(); // Instant localized render loop update
    };

    runBtn?.addEventListener('click', triggerSearch);
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') triggerSearch();
    });

    clearBtn?.addEventListener('click', () => {
      this.prospectiveDrug = '';
      this.render();
    });
  }

  _getSkeletonUI() {
    return `
      <div class="max-w-2xl mx-auto w-full px-6 pt-8">
        <div class="h-6 w-32 bg-white/5 rounded animate-pulse mb-8"></div>
        <div class="h-36 bg-white/5 rounded-3xl animate-pulse mb-6"></div>
        <div class="h-24 bg-white/5 rounded-2xl animate-pulse"></div>
      </div>
    `;
  }
}