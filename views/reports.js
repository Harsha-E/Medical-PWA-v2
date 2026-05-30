/**
 * MedCare | Health Reports View
 */
import { exportEngine } from '../services/ExportEngine.js';
import db from '../core/db.js';
import state from '../core/state.js';

export default class ReportsView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container';

    const meds = await db.medications.toArray();
    const allDoses = await db.doses.toArray();
    
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
      <header class="sticky top-0 left-0 w-full z-50 flex items-center justify-between px-4 py-4 bg-[#0a0407]/90 backdrop-blur-md border-b border-[#7f2f5d]/30 mb-6 transition-all duration-300">
        <button onclick="window.history.back()" class="flex items-center gap-2 text-[#ffb88c] hover:brightness-125 transition-all">
          <svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
          <span class="text-sm font-bold uppercase tracking-widest">Back</span>
        </button>
        <div class="flex flex-col items-center">
            <span class="text-xs text-[#ffb88c] uppercase tracking-widest leading-none">Compliance Graph</span>
            <h1 class="text-lg font-display mt-1 text-white leading-none">Health Reports</h1>
        </div>
        <div class="w-16"></div>
      </header>

      <main class="scroll-area px-6 pt-28">
        ${totalExpected30 === 0 ? `
          <div class="glass-panel p-12 text-center shadow-xl shadow-gray-100/50 mb-10 border-dashed border-2 border-border opacity-70">
              <div class="w-16 h-16 bg-border/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
              </div>
              <p class="text-sm font-display italic">No active data streams.</p>
              <p class="text-xs text-muted uppercase font-bold tracking-widest mt-2">Log medications to begin analytics.</p>
          </div>
        ` : `
        <div class="glass-panel p-8 mb-10 text-center shadow-xl shadow-gray-100/50">
          <h3 class="text-xs font-bold text-muted uppercase tracking-widest mb-8">Overall Adherence</h3>
          <div class="flex items-center justify-center relative mb-8">
             <svg width="140" height="140">
                <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-border)" stroke-width="10"/>
                <circle cx="70" cy="70" r="60" fill="none" stroke="var(--color-primary)" stroke-width="10" 
                  stroke-dasharray="377" stroke-dashoffset="${dashOffset}" stroke-linecap="round" style="transition: stroke-dashoffset 1.5s ease-out;"/>
              </svg>
              <div class="absolute inset-0 flex flex-col items-center justify-center">
                <span class="text-4xl font-display text-primary">${overallAdherence}%</span>
                <span class="text-xs text-muted font-bold tracking-widest uppercase mt-1">30 Day Epoch</span>
              </div>
          </div>
          <p class="text-xs text-muted leading-relaxed font-medium">You've missed ${missedDoses} intervention${missedDoses !== 1 ? 's' : ''} this cycle. Automated protocols suggest aim for 100%.</p>
        </div>

        <section class="mb-8">
           <h3 class="section-title">Weekly Trend</h3>
           <div class="glass-panel p-6 h-48 flex items-end justify-between gap-2">
              ${weekData.map((data) => `
                <div class="chart-bar-container flex-1 flex flex-col items-center gap-2">
                  <div class="chart-bar" style="height: ${data.val}%; background: ${data.val < 80 ? 'var(--color-danger)' : 'var(--color-primary)'}"></div>
                  <span class="text-xs font-bold text-muted">${data.label}</span>
                </div>
              `).join('')}
           </div>
        </section>
        `}

        <section class="mb-10">
           <h3 class="text-xs text-uppercase font-bold text-muted mb-4 tracking-[0.2em] px-1">Telemetry Export</h3>
           <div class="grid grid-cols-2 gap-4">
              <div id="export-pdf" class="glass-panel p-6 text-center cursor-pointer hover:bg-[#1a0a12] transition-colors">
                <div class="w-10 h-10 bg-border/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                </div>
                <p class="text-xs font-bold uppercase tracking-widest">Monthly PDF</p>
              </div>
              <div id="export-csv" class="glass-panel p-6 text-center cursor-pointer hover:bg-[#1a0a12] transition-colors">
                <div class="w-10 h-10 bg-border/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"/><path d="M22 12A10 10 0 0 0 12 2v10z"/></svg>
                </div>
                <p class="text-xs font-bold uppercase tracking-widest">Dataset CSV</p>
              </div>
           </div>
        </section>
      </main>

      <style>
        .view-header { position: fixed; top: 0; left: 0; right: 0; height: 60px; background: var(--color-surface); display: flex; align-items: center; justify-content: space-between; padding: 0 var(--space-4); z-index: 100; border-bottom: 1px solid var(--color-border); }
        .back-btn { background: none; border: none; font-size: 24px; cursor: pointer; color: var(--color-primary); }
        .section-title { font-size: var(--text-xs); color: var(--color-text-muted); text-transform: uppercase; letter-spacing: 1px; margin-bottom: var(--space-4); font-weight: 700; margin-left: var(--space-2); }
        
        .chart-bar-container { height: 100%; }
        .chart-bar { width: 100%; border-radius: 4px 4px 0 0; transition: height 1s ease; min-height: 4px; }
      </style>
    `;

    this.attachListeners();
    return this.container;
  }

  _showToast(msg, type = 'success') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f]'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  attachListeners() {
    this.container.querySelector('#export-pdf').addEventListener('click', () => this.generatePdf());
    this.container.querySelector('#export-csv').addEventListener('click', () => this.generateCsv());
  }

  async generatePdf() {
    const meds = await db.medications.toArray();
    const doses = await db.doses.toArray();
    const profile = { 
        name: state.user?.displayName || 'User', 
        bloodType: state.userProfile?.profile?.bloodType || 'Unknown' 
    };

    try {
        await exportEngine.exportAdherencePDF(profile, meds, doses, null);
        this._showToast('PDF report generated.', 'success');
    } catch (e) {
        console.error(e);
        this._showToast('Failed to generate PDF.', 'error');
    }
  }

  async generateCsv() {
    try {
        const meds = await db.medications.toArray();
        exportEngine.exportMedicationsCSV(meds);
        this._showToast('CSV export generated.', 'success');
    } catch (e) {
        console.error(e);
        this._showToast('Failed to generate CSV.', 'error');
    }
  }

  destroy() {}
}