import db from '../core/db.js';
import state from '../core/state.js';
import app from '../app.js';

export default class ClinicalDashboard {
  constructor() {
    this.activeTab = 'timeline'; // 'timeline' or 'diseases'
  }

  async render() {
    this.container = document.createElement('div');
    this.container.className = 'container pb-24';

    const userId = state.activeProfileContext ? state.activeProfileContext.id : state.user?.uid;
    const historyMeds = await db.history.filter(h => h.userId === userId).toArray();
    
    // Sort chronological
    const records = historyMeds.sort((a, b) => new Date(b.date) - new Date(a.date));
    const activeDiseases = records.filter(r => r.type === 'Disease'); // Simplification for active

    this.container.innerHTML = `
      <main class="scroll-area pt-[112px] md:pt-8" style="padding-left:0; padding-right:0;">
        <div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1" id="export-target" style="background-color: #0f141e;">
          
          <!-- Tabs Header -->
          <div data-html2canvas-ignore="true" class="flex gap-4 mb-8 bg-surface-elevated/40 backdrop-blur-xl p-2 rounded-2xl border border-border w-fit mx-auto shadow-lg">
            <button id="tab-timeline" class="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${this.activeTab === 'timeline' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}">
              Timeline
            </button>
            <button id="tab-diseases" class="px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${this.activeTab === 'diseases' ? 'bg-primary text-white shadow-md' : 'text-text-secondary hover:text-text-primary'}">
              Active Diseases
            </button>
          </div>

          <h2 class="text-xl text-center mb-8 font-bold tracking-widest text-white uppercase hidden" id="pdf-title">Clinical Report - ${this.activeTab}</h2>

          <!-- Tab Content -->
          <div id="tab-content" class="w-full">
            ${this.activeTab === 'timeline' ? this._renderTimeline(records) : this._renderDiseases(activeDiseases)}
          </div>
        </div>
      </main>

      <!-- Export Floating Action Button -->
      <button id="export-pdf-btn" class="fixed bottom-24 right-6 w-14 h-14 bg-surface-elevated text-primary border border-primary/30 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(255,0,128,0.3)] z-50 hover:scale-105 active:scale-95 transition-all" style="backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
      </button>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/medical-history', title: 'Clinical Dashboard' } }));
    this.attachListeners();
    this.loadExportScripts();
    return this.container;
  }

  _renderTimeline(records) {
    if (!records.length) return `<div class="text-center py-12 text-text-muted text-xs uppercase tracking-widest font-mono">No records in timeline</div>`;
    
    return `
      <div class="relative pl-1">
        <div class="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-secondary/30 to-transparent"></div>
        <div class="space-y-6 relative z-10">
          ${records.map(record => {
            const dateObj = new Date(record.date);
            const isExact = record.isExactDate !== false; // if it lacks flag, assume exact for demo
            return `
            <div class="relative pl-14 group">
              <div class="absolute left-2.5 top-4 w-7 h-7 rounded-full bg-surface-elevated border-2 border-primary flex items-center justify-center z-10">
                <div class="w-2 h-2 rounded-full bg-primary"></div>
              </div>
              <div class="bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-3xl p-5 shadow-lg">
                <div class="flex justify-between">
                  <div class="flex gap-2 items-center mb-2">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border border-border bg-surface">${record.type}</span>
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest border ${isExact ? 'border-success/50 text-success' : 'border-warning/50 text-warning'}">${isExact ? 'Exact' : 'Approximate'}</span>
                  </div>
                  <div class="text-[10px] font-mono text-text-secondary">${dateObj.toLocaleDateString()}</div>
                </div>
                <h3 class="text-base font-bold text-text-primary leading-tight mt-1">${record.title}</h3>
                ${record.notes ? `<p class="text-sm text-text-secondary mt-2">${record.notes}</p>` : ''}
              </div>
            </div>
          `}).join('')}
        </div>
      </div>
    `;
  }

  _renderDiseases(diseases) {
    if (!diseases.length) return `<div class="text-center py-12 text-text-muted text-xs uppercase tracking-widest font-mono">No active diseases</div>`;
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        ${diseases.map(d => `
          <div class="bg-surface-elevated/40 backdrop-blur-xl border border-border rounded-3xl p-6 shadow-lg flex flex-col justify-between">
            <div>
              <div class="flex justify-between items-center mb-3">
                <div class="w-10 h-10 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                </div>
                <span class="text-[10px] uppercase font-bold tracking-widest px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">Active</span>
              </div>
              <h3 class="text-lg font-bold">${d.title}</h3>
              <p class="text-xs text-text-secondary mt-2">${d.notes || 'No description provided'}</p>
            </div>
            <div class="mt-4 pt-4 border-t border-border/50">
              <p class="text-[10px] text-text-muted font-mono">Logged: ${new Date(d.date).toLocaleDateString()}</p>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  loadExportScripts() {
    if (!window.html2canvas) {
      const h2c = document.createElement('script');
      h2c.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      document.head.appendChild(h2c);
    }
    if (!window.jspdf) {
      const jspdf = document.createElement('script');
      jspdf.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      document.head.appendChild(jspdf);
    }
  }

  attachListeners() {
    const btnTimeline = this.container.querySelector('#tab-timeline');
    const btnDiseases = this.container.querySelector('#tab-diseases');
    
    const renderTab = async (tabName) => {
      this.activeTab = tabName;
      const newDOM = await this.render();
      this.container.parentNode?.replaceChild(newDOM, this.container);
    };

    btnTimeline?.addEventListener('click', () => { if (this.activeTab !== 'timeline') renderTab('timeline'); });
    btnDiseases?.addEventListener('click', () => { if (this.activeTab !== 'diseases') renderTab('diseases'); });

    // PDF Export
    this.container.querySelector('#export-pdf-btn')?.addEventListener('click', async () => {
      const target = this.container.querySelector('#export-target');
      if (!target || !window.html2canvas || !window.jspdf) {
        alert("Export tools still loading or unavailable.");
        return;
      }
      
      const btn = this.container.querySelector('#export-pdf-btn');
      btn.style.opacity = '0.5';
      btn.style.pointerEvents = 'none';

      // Temporarily show title for PDF
      const pdfTitle = target.querySelector('#pdf-title');
      if (pdfTitle) pdfTitle.classList.remove('hidden');

      try {
        const canvas = await window.html2canvas(target, { 
          backgroundColor: '#0f141e',
          scale: 2,
          useCORS: true 
        });
        const imgData = canvas.toDataURL('image/png');
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
        
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`Clinical_Report_${this.activeTab}_${new Date().getTime()}.pdf`);
      } catch (err) {
        console.error("PDF generation failed:", err);
        alert("Failed to generate PDF");
      } finally {
        if (pdfTitle) pdfTitle.classList.add('hidden');
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
      }
    });
  }
}
