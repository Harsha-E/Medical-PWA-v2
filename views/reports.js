/**
 * MedCare | Health Reports View
 */
import { exportEngine } from '../services/ExportEngine.js';
import db from '../core/db.js';
import state from '../core/state.js';
import { showToast, setupPullToRefresh } from '../core/ui.js';

export default class ReportsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    // Immediate skeleton before heavy analytics compute
    this.container.innerHTML = `
      <main class="scroll-area md:px-12 pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 lg:pl-72 md:pt-8 pb-28 max-w-7xl mx-auto" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <div class="md:grid md:grid-cols-1 md:grid-cols-2 lg:grid-cols-32 md:gap-10">
            <div class="md:col-span-5 lg:col-span-4 flex flex-col gap-8">
                <div class="skeleton skeleton-xl" style="height:250px;"></div>
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                  <div class="skeleton skeleton-card" style="height:90px;"></div>
                  <div class="skeleton skeleton-card" style="height:90px;"></div>
                </div>
            </div>
            <div class="md:col-span-7 lg:col-span-8 mt-10 md:mt-0">
                <div class="skeleton skeleton-xl" style="height:250px;"></div>
            </div>
        </div>
      </div></main>
    `;

    const targetUserId = state.activeProfileContext ? String(state.activeProfileContext.id) : (state.user?.uid || 'anonymous');
    const meds = await db.medications.filter(m => !m.isDeleted && String(m.userId) === targetUserId).toArray();
    const allDoses = await db.doses.filter(d => !d.isDeleted && String(d.userId) === targetUserId).toArray();

    const now = new Date();
    let totalExpected30 = 0;
    let totalTaken30 = 0;
    const weekData = [];
    const dayLabels = ['S','M','T','W','T','F','S'];

    for (let i = 29; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        let expectedDay = 0;
        meds.forEach(m => {
            if(m.active !== false) {
                // Only expect doses on or after the day the medication was prescribed
                if (m.startDate && dateStr < m.startDate) return;
                
                // And before the end date, if one exists
                if (m.endDate && dateStr > m.endDate) return;

                const times = Array.isArray(m.times) ? m.times.length : 1;
                expectedDay += times;
            }
        });

        const dosesOnDay = allDoses.filter(dose => dose.takenAt && dose.takenAt.startsWith(dateStr) && !dose.skipped);
        const takenDay = dosesOnDay.length;

        totalExpected30 += expectedDay;
        totalTaken30 += takenDay;

        if (i < 7) {
            let dailyAdherence = expectedDay > 0 ? Math.round((takenDay / expectedDay) * 100) : 0;
            if (dailyAdherence > 100) dailyAdherence = 100;
            weekData.push({
                label: dayLabels[d.getDay()],
                val: dailyAdherence
            });
        }
    }

    const overallAdherence = totalExpected30 > 0 ? Math.round((totalTaken30 / totalExpected30) * 100) : 0;
    const missedDoses = Math.max(0, totalExpected30 - totalTaken30);
    const dashOffset = 377 - (377 * (overallAdherence / 100));

    this.container.innerHTML = `
      <main class="scroll-area md:px-12 pt-[112px] md:pt-8 md:pl-64 lg:pl-72 md:pt-8 md:pl-64 lg:pl-72 md:pt-8 pb-28 max-w-7xl mx-auto" style="padding-left:0; padding-right:0;">
<div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1">
        <div class="md:grid md:grid-cols-1 md:grid-cols-2 lg:grid-cols-32 md:gap-10">
          <!-- Left Column -->
          <div class="md:col-span-5 lg:col-span-4 flex flex-col gap-8">
            ${totalExpected30 === 0 ? `
              <div class="clay-glass-panel p-12 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] border-dashed border-2 border-border bg-surface-elevated/40 backdrop-blur-xl rounded-[2rem] opacity-70">
                  <div class="w-16 h-16 bg-border/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  </div>
                  <p class="text-sm font-display italic">No active data streams.</p>
                  <p class="text-xs text-muted uppercase font-bold tracking-widest mt-2">Log medications to begin health progress tracking.</p>
              </div>
            ` : `
              <div class="clay-glass-panel p-8 text-center shadow-[0_8px_32px_rgba(0,0,0,0.5)] bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-[2rem]">
                <h3 class="text-xs font-bold text-muted uppercase tracking-widest mb-8">Taking Medicines</h3>
                <div class="flex items-center justify-center relative mb-8">
                  <svg width="140" height="140">
                      <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-border)" stroke-width="10"/>
                      <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-primary)" stroke-width="10" 
                        stroke-dasharray="377" stroke-dashoffset="${dashOffset}" stroke-linecap="round" style="transition: stroke-dashoffset 1.5s ease-out;"/>
                    </svg>
                    <div class="absolute inset-0 flex flex-col items-center justify-center">
                      <span class="text-4xl font-display text-primary">${overallAdherence}%</span>
                      <span class="text-xs text-muted font-bold tracking-widest uppercase mt-1">Last 30 Days</span>
                    </div>
                </div>
                <p class="text-xs text-muted leading-relaxed font-medium">You missed ${missedDoses} dose${missedDoses !== 1 ? 's' : ''} in the last 30 days. Keeping up regular doses supports your health progress.</p>
              </div>
            `}

            <section class="mb-10">
              <h3 class="text-xs text-uppercase font-bold text-muted mb-4 tracking-[0.2em] px-1">Save Records</h3>
              <div class="grid grid-cols-2 gap-4">
                  <div id="export-pdf" class="clay-glass-panel p-6 text-center cursor-pointer hover:bg-white/5 transition-colors border border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl">
                    <div class="w-10 h-10 bg-border/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                    </div>
                    <p class="text-xs font-bold uppercase tracking-widest">Save Monthly PDF</p>
                  </div>
                  <div id="export-csv" class="clay-glass-panel p-6 text-center cursor-pointer hover:bg-white/5 transition-colors border border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl">
                    <div class="w-10 h-10 bg-border/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                    </div>
                    <p class="text-xs font-bold uppercase tracking-widest">Save Dataset CSV</p>
                  </div>
              </div>
              <div class="mt-4">
                  <a href="#/interaction-graph" class="block clay-glass-panel p-6 text-center cursor-pointer hover:bg-white/5 transition-colors border border-border bg-surface-elevated/40 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] rounded-2xl text-decoration-none">
                    <div class="w-10 h-10 bg-red-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg>
                    </div>
                    <p class="text-xs font-bold uppercase tracking-widest text-white">View Interaction Graph</p>
                  </a>
              </div>
            </section>
          </div>

          <!-- Right Column -->
          <div class="md:col-span-7 lg:col-span-8 mt-10 md:mt-0">
            ${totalExpected30 === 0 ? '' : `
              <section class="mb-8">
                <h3 class="section-title text-xs text-uppercase font-bold text-muted mb-4 tracking-[0.2em] px-1">Health Progress This Week</h3>
                <div class="clay-glass-panel p-6 h-48 flex items-end justify-between gap-2 rounded-[2rem]">
                    ${weekData.map((data) => `
                      <div class="chart-bar-container flex-1 flex flex-col items-center gap-2">
                        <div class="chart-bar" style="height: ${data.val}%; background: ${data.val < 80 ? 'var(--color-danger)' : 'var(--color-primary)'}"></div>
                        <span class="text-xs font-bold text-muted">${data.label}</span>
                      </div>
                    `).join('')}
                </div>
              </section>
            `}
          </div>
        </div>
      </div></main>

      <style>
        .back-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--color-primary); }
        .section-title { font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-4); font-weight: 700; margin-left: var(--space-2); }
        
        .chart-bar-container { height: 100%; }
        .chart-bar { width: 100%; border-radius: 4px 4px 0 0; transition: height 1s ease; min-height: 4px; }
      </style>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/reports' } }));
    this.attachListeners();
    return this.container;
  }



  attachListeners() {
    this.container.querySelector('#export-pdf').addEventListener('click', () => this.generatePdf());
    this.container.querySelector('#export-csv').addEventListener('click', () => this.generateCsv());
  }

  async generatePdf() {
    const targetUserId = state.activeProfileContext ? String(state.activeProfileContext.id) : (state.user?.uid || 'anonymous');
    const meds = await db.medications.filter(m => !m.isDeleted && String(m.userId) === targetUserId).toArray();
    const doses = await db.doses.filter(d => !d.isDeleted && String(d.userId) === targetUserId).toArray();
    const allHistory = await db.history.filter(h => !h.isDeleted && String(h.userId) === targetUserId).toArray();
    const profile = { 
        name: state.user?.displayName || 'User', 
        bloodType: state.userProfile?.profile?.bloodType || 'Unknown' 
    };

    try {
        await exportEngine.exportAdherencePDF(profile, meds, doses, null);
        showToast('PDF report generated.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Failed to generate PDF.', 'error');
    }
  }

  async generateCsv() {
    try {
        const targetUserId = state.activeProfileContext ? String(state.activeProfileContext.id) : (state.user?.uid || 'anonymous');
        const meds = await db.medications.filter(m => !m.isDeleted && String(m.userId) === targetUserId).toArray();
        exportEngine.exportMedicationsCSV(meds);
        showToast('CSV export generated.', 'success');
    } catch (e) {
        console.error(e);
        showToast('Failed to generate CSV.', 'error');
    }
  }

  destroy() {}
}
