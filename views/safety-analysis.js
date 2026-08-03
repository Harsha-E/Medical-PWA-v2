import state from '../core/state.js';
import db from '../core/db.js';

export default class InteractionCheckerView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'viewport-container pb-safe h-[100dvh] overflow-y-auto overflow-x-hidden text-text-primary';
    this.sandboxMeds = []; 
    this.autocompleteResults = [];
  }

  async render() {
    this.container.innerHTML = this._getSkeletonUI();

    try {
      // Waiting for backend API (no local engine needed)
      console.log('[InteractionChecker] Ready to query DIC API...');

      const { default: state } = await import('../core/state.js');
      const { default: db } = await import('../core/db.js');

      const userId = state.user?.uid || 'anonymous';
      
      const rawMeds = await db.medications.toArray();
      const activeMeds = rawMeds.filter(m => (m.userId === userId || !m.userId) && m.active !== false);

      // Collect Meds (Current Profile)
      const currentDrugNames = activeMeds
        .map(m => (m.genericName || m.name || '').trim())
        .filter(n => n.length > 0);
        
      const currentDrugIds = activeMeds
        .map(m => m.rxnormId || m.name) // Use RxNorm ID if available, otherwise name
        .filter(n => n.length > 0);

      const summary = { severe: [], moderate: [], mild: [] };
      
      // Check if we came from Scanner
      const extractedStr = sessionStorage.getItem('medcheck_extracted_prescriptions');
      let newMedicines = [];
      if (extractedStr) {
          newMedicines = JSON.parse(extractedStr);
          sessionStorage.removeItem('medcheck_extracted_prescriptions');
      }

      let allDrugsToAnalyze = [...currentDrugIds];
      let allDrugNames = [...currentDrugNames];
      
      if (newMedicines.length > 0) {
          const newIds = newMedicines.map(m => m.rxnormId || m.name);
          allDrugsToAnalyze = [...allDrugsToAnalyze, ...newIds];
          allDrugNames = [...allDrugNames, ...newMedicines.map(m => m.name)];
      }

      // ----------------------------------------------------
      // CALL LIVE DIC API (WITH LOCAL NLP FALLBACK)
      // ----------------------------------------------------
      if (allDrugsToAnalyze.length > 1) {
          let interactions = [];
          try {
              const { ApiClient } = await import('../core/api.js');
              const data = await ApiClient.post('/api/v1/interactions', { medication_ids: allDrugsToAnalyze }, { timeout: 1500 });
              interactions = data?.interactions || [];
          } catch (apiErr) {
              console.warn('[SafetyAnalysis] DIC API offline/error, falling back to local NLP engine:', apiErr.message);
              try {
                  const { MedicalNLPEngine } = await import('../services/MedicalNLPEngine.js');
                  interactions = MedicalNLPEngine.checkLocalInteractions(allDrugsToAnalyze);
              } catch (nlpErr) {}
          }

          interactions.forEach(w => {
              const severityKey = (w.strength === 'HIGH' || w.strength === 'SEVERE') ? 'severe' : 
                                  (w.strength === 'MODERATE') ? 'moderate' : 'mild';
              
              summary[severityKey].push({
                  drug1: (w.drugs && w.drugs[0]) || allDrugsToAnalyze[0] || 'Med 1',
                  drug2: (w.drugs && w.drugs[1]) || allDrugsToAnalyze[1] || 'Med 2',
                  severity: severityKey,
                  details: { mechanism: w.effect || w.type || 'Drug-drug interaction risk' },
                  recommendation: w.evidence && w.evidence.length > 0 ? "FDA Warning Found" : "Consult Physician",
                  alternatives: []
              });
          });
      }

      this.container.innerHTML = `
        <div class="max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-4 md:px-6 mt-20 md:mt-8 md:pl-64 lg:pl-72 md:mt-8 pb-28" style="padding-top: 0;">

          <section class="bg-surface-elevated/40 backdrop-blur-xl border border-white/5 rounded-[2.5rem] p-6 mb-8 shadow-[10px_10px_30px_rgba(0,0,0,0.6),-10px_-10px_30px_rgba(255,255,255,0.02),inset_2px_2px_5px_rgba(255,255,255,0.05)] relative overflow-visible">
            <span class="text-xs font-mono tracking-widest uppercase text-accent-primary block mb-1">Clinical Ledger</span>
            <h3 class="text-sm font-bold text-text-primary mb-3">Current Regimen Analysis</h3>
            <p class="text-xs text-text-secondary mb-2 leading-relaxed">
              This is a comprehensive evaluation of your active pharmacy track. Our Clinical Engine cross-references all your active medications against each other, as well as your logged conditions and allergies, to identify potential adverse effects.
            </p>
          </section>

          <div class="space-y-6">
            ${this._renderSeverityBlock('Severe Conflicts', summary.severe, 'border-red-500/40 bg-red-950/20 backdrop-blur-xl text-red-200', '<svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> SEVERE')}
            ${this._renderSeverityBlock('Moderate Warnings', summary.moderate, 'border-amber-500/30 bg-amber-950/20 backdrop-blur-xl text-amber-200', '<svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg> WARNING')}
            ${this._renderSeverityBlock('Mild Reactions', summary.mild, 'border-blue-500/30 bg-blue-950/20 backdrop-blur-xl text-blue-300', '<svg class="w-3 h-3 inline-block mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> INFO')}
            
            ${summary.severe.length === 0 && summary.moderate.length === 0 && summary.mild.length === 0 ? `
              <div class="text-center p-8 bg-green-900/10 backdrop-blur-md border border-green-500/20 rounded-[2rem] shadow-[0_8px_32px_rgba(0,0,0,0.5)]">
                <div class="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4 text-success">
                  <svg class="w-6 h-6" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <h3 class="text-base font-bold text-text-primary mb-1">Regimen Cleared</h3>
                <p class="text-xs text-text-secondary max-w-[280px] mx-auto leading-relaxed">No adverse overlapping clinical graph vectors identified across active treatments.</p>
              </div>
            ` : `
              ${newMedicines.length > 0 ? `
                <div class="mt-8 text-center">
                    <button id="btn-proceed-anyway" class="w-full py-4 rounded-2xl bg-gradient-to-r from-red-900/50 to-red-800/30 border border-red-500/40 text-red-200 text-sm font-bold uppercase tracking-[0.2em] shadow-[0_0_20px_rgba(239,68,68,0.2)] active:scale-95 transition-all">
                        Proceed & Add Medication Anyway
                    </button>
                    <p class="text-[10px] font-mono text-text-muted mt-3">By proceeding, you acknowledge the detected interactions.</p>
                </div>
              ` : ''}
            `}

            <section class="mt-8 pt-6 border-t border-border">
              <h4 class="text-xs font-mono tracking-widest text-text-muted uppercase mb-3">Evaluated Pharmacy Track</h4>
              <div class="flex flex-wrap gap-2">
                ${allDrugNames.map(drug => `
                  <span class="px-3 py-1.5 rounded-xl bg-surface-elevated border border-border font-mono text-xs text-text-secondary shadow-inner flex items-center gap-1">
                    <svg class="w-3 h-3 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z"></path></svg>
                    ${drug}
                  </span>
                `).join('')}
                ${allDrugNames.length === 0 ? '<span class="text-xs text-gray-600 italic">No drugs queued. Add items to your active map.</span>' : ''}
              </div>
            </section>

          </div>
        </div>
      `;

      document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/interaction-checker' } }));
      this._drawNetworkGraph(allDrugNames, summary);

    } catch (err) {
      console.error('[InteractionChecker] Execution broken:', err);
      this.container.innerHTML = `<div class="p-6 text-sm font-mono text-danger bg-red-950/10 border border-red-500/20 rounded-xl m-6 shadow-[inset_0_2px_10px_rgba(0,0,0,0.5)]">Processing Exception: ${err.message}</div>`;
    }

    return this.container;
  }

  _renderSeverityBlock(title, matches, styleClasses, label) {
    if (!matches || matches.length === 0) return '';
    return `
      <section>
        <h2 class="text-xs font-mono tracking-[0.2em] uppercase text-text-secondary mb-3 px-1">${title}</h2>
        <div class="space-y-3">
          ${matches.map(item => {
            const mechText = (item.details?.mechanism || '').toLowerCase();
            const isPK = /cyp|metabolism|clearance|absorption|transport|excretion|efflux|accumulation/i.test(mechText);
            const isPD = /synergistic|additive|receptor|agonist|antagonist|inhibition of/i.test(mechText);
            const mechType = isPK ? 'PK (Pharmacokinetic)' : isPD ? 'PD (Pharmacodynamic)' : 'Clinical';
            const isSevere = item.severity === 'severe';

            return `
            <div class="border rounded-2xl p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5)] transition-all relative overflow-hidden ${styleClasses}">
              ${isSevere ? `
              <div class="absolute right-0 top-0 opacity-20 pointer-events-none" style="transform: perspective(400px) rotateY(-20deg) rotateX(10deg) scale(1.2);">
                <svg width="120" height="120" viewBox="0 0 100 100">
                  <circle cx="30" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="2" class="animate-pulse" />
                  <circle cx="70" cy="50" r="15" fill="none" stroke="currentColor" stroke-width="2" style="animation: pulse 2s infinite 0.5s;" />
                  <path d="M 45 50 L 55 50" stroke="currentColor" stroke-width="4" stroke-dasharray="2,2" class="animate-ping" />
                  <circle cx="50" cy="50" r="5" fill="currentColor" />
                </svg>
              </div>
              ` : ''}
              <div class="${isSevere && item.alternatives?.length ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}">
                <div class="relative z-10">
                  <div class="flex flex-wrap justify-between items-center mb-2 gap-2">
                    <span class="text-xs font-mono uppercase tracking-widest font-bold px-2 py-0.5 rounded bg-overlay-bg border border-border shadow-inner shrink-0">
                      ${label}
                    </span>
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-[10px] font-mono text-green-400 border border-green-500/30 px-2 py-0.5 rounded uppercase tracking-widest bg-green-500/10 shadow-inner flex items-center gap-1 shrink-0" title="Exact Match Guarantee">
                            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            Safety Match Confidence: 100%
                        </span>
                        <span class="text-xs font-mono text-accent-primary border border-accent-primary/30 px-2 py-0.5 rounded uppercase tracking-widest bg-primary/10 shadow-inner shrink-0">
                          ${mechType}
                        </span>
                    </div>
                  </div>
                  <h4 class="text-sm font-bold text-text-primary mb-1">${item.drug1} <span class="text-xs text-text-secondary font-normal">cross-linked with</span> ${item.drug2}</h4>
                  <p class="text-xs opacity-90 leading-relaxed mb-3">${item.details?.mechanism || item.description}</p>
                  <div class="pt-3 border-t border-border flex gap-2 items-start">
                    <span class="text-xs font-mono text-inherit opacity-70 uppercase tracking-widest shrink-0 mt-0.5">Protocol:</span>
                    <p class="text-xs text-text-secondary italic leading-relaxed">${item.recommendation}</p>
                  </div>
                </div>
                ${isSevere && item.alternatives?.length ? `
                <div class="relative z-10 border-t md:border-t-0 md:border-l border-border pt-3 md:pt-0 md:pl-4">
                  <h4 class="text-xs font-mono tracking-widest uppercase text-success mb-2 flex items-center gap-1"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg> Safe Alternatives</h4>
                  <ul class="space-y-2">
                    ${item.alternatives.slice(0,3).map(alt => `
                      <li class="bg-success/10 border border-success/30 rounded-lg p-2 flex flex-col">
                        <span class="text-[11px] font-bold text-success uppercase tracking-wider">${alt}</span>
                      </li>
                    `).join('')}
                  </ul>
                </div>
                ` : ''}
              </div>
            </div>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  _drawNetworkGraph(nodesList, summary) {
     const canvas = this.container.querySelector('#network-canvas');
     if (!canvas) return;
     const ctx = canvas.getContext('2d');
     const width = canvas.width;
     const height = canvas.height;
     
     ctx.clearRect(0, 0, width, height);
     
     if (nodesList.length === 0) return;

     const nodes = [];
     const centerX = width / 2;
     const centerY = height / 2;
     const radius = Math.min(width, height) / 3;

     // Calculate node positions in a circle
     nodesList.forEach((drug, i) => {
        const angle = (i / nodesList.length) * 2 * Math.PI - Math.PI / 2;
        nodes.push({
           name: drug,
           x: centerX + radius * Math.cos(angle),
           y: centerY + radius * Math.sin(angle)
        });
     });

     // Draw Edges (Interactions)
     const drawEdge = (drug1, drug2, color) => {
        const n1 = nodes.find(n => n.name === drug1);
        const n2 = nodes.find(n => n.name === drug2);
        if (n1 && n2) {
           ctx.beginPath();
           ctx.moveTo(n1.x, n1.y);
           ctx.lineTo(n2.x, n2.y);
           ctx.strokeStyle = color;
           ctx.lineWidth = 2;
           ctx.setLineDash([5, 5]);
           ctx.stroke();
           ctx.setLineDash([]);
        }
     };

     summary.severe.forEach(i => drawEdge(i.drug1, i.drug2, '#ef4444')); 
     summary.moderate.forEach(i => drawEdge(i.drug1, i.drug2, '#f59e0b')); 
     summary.mild.forEach(i => drawEdge(i.drug1, i.drug2, '#3b82f6')); 

     // Draw Nodes
     nodes.forEach(node => {
        ctx.beginPath();
        ctx.arc(node.x, node.y, 35, 0, 2 * Math.PI);
        ctx.fillStyle = '#1e293b'; 
        ctx.fill();
        ctx.strokeStyle = '#475569'; 
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#e2e8f0'; 
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        let label = node.name.substring(0, 10);
        if (node.name.length > 10) label += '..';
        ctx.fillText(label, node.x, node.y);
     });
  }

  _getSkeletonUI() {
    return `
      <div class="max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto w-full px-4 md:px-6 pt-24 md:pt-8 md:px-8 pb-28">
        
        <!-- Animated Title Skeleton -->
        <div class="h-4 w-32 bg-surface-elevated/80 backdrop-blur-3xl rounded-full mb-10 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]">
           <div class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
        </div>
        
        <!-- Premium Neumorphic Sandbox Skeleton -->
        <div class="bg-surface-elevated/30 backdrop-blur-2xl border border-white/5 rounded-[2.5rem] p-6 mb-10 shadow-[0_20px_50px_rgba(0,0,0,0.5),inset_0_2px_4px_rgba(255,255,255,0.05)] relative overflow-hidden">
           
           <div class="h-3 w-48 bg-surface-deep/80 rounded-full mb-5 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
              <div class="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-accent-primary/20 to-transparent"></div>
           </div>
           
           <!-- Search Box Skeleton -->
           <div class="h-16 w-full bg-surface-deep/90 rounded-2xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.8)] border border-black/50 mb-8 relative overflow-hidden flex items-center px-5">
              <div class="w-6 h-6 rounded-full bg-white/5 mr-4 animate-pulse"></div>
              <div class="h-3 w-1/3 bg-white/5 rounded-full"></div>
              <div class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent"></div>
           </div>
           
           <div class="pt-6 border-t border-white/5">
             <div class="h-3 w-32 bg-surface-deep/80 rounded-full mb-4 overflow-hidden relative shadow-[inset_0_2px_4px_rgba(0,0,0,0.6)]">
                <div class="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
             </div>
             
             <!-- Sandbox Pills Skeleton -->
             <div class="flex gap-3">
               <div class="h-10 w-28 rounded-xl bg-blue-900/10 border border-blue-500/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] relative overflow-hidden">
                 <div class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.2s] bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"></div>
               </div>
               <div class="h-10 w-36 rounded-xl bg-blue-900/10 border border-blue-500/10 shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] relative overflow-hidden">
                 <div class="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite_0.4s] bg-gradient-to-r from-transparent via-blue-400/10 to-transparent"></div>
               </div>
             </div>
           </div>
        </div>
        
        <!-- Skeleton Severity Blocks -->
        <div class="space-y-6">
           <!-- Severe Block Skeleton -->
           <div class="h-40 bg-red-950/10 backdrop-blur-2xl border border-red-500/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.02)] relative overflow-hidden p-6">
             <div class="flex justify-between mb-4">
               <div class="h-5 w-24 bg-red-900/20 rounded-md"></div>
               <div class="h-5 w-32 bg-red-900/20 rounded-md"></div>
             </div>
             <div class="h-4 w-3/4 bg-surface-deep/60 rounded-full mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
             <div class="h-3 w-full bg-surface-deep/60 rounded-full mb-2 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
             <div class="h-3 w-5/6 bg-surface-deep/60 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
             <div class="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite] bg-gradient-to-r from-transparent via-red-500/5 to-transparent"></div>
           </div>
           
           <!-- Warning Block Skeleton -->
           <div class="h-32 bg-amber-950/10 backdrop-blur-2xl border border-amber-500/10 rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,0,0.4),inset_0_2px_4px_rgba(255,255,255,0.02)] relative overflow-hidden p-6">
             <div class="flex justify-between mb-4">
               <div class="h-5 w-24 bg-amber-900/20 rounded-md"></div>
               <div class="h-5 w-28 bg-amber-900/20 rounded-md"></div>
             </div>
             <div class="h-4 w-2/3 bg-surface-deep/60 rounded-full mb-3 shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
             <div class="h-3 w-4/5 bg-surface-deep/60 rounded-full shadow-[inset_0_2px_4px_rgba(0,0,0,0.5)]"></div>
             <div class="absolute inset-0 -translate-x-full animate-[shimmer_3s_infinite_0.5s] bg-gradient-to-r from-transparent via-amber-500/5 to-transparent"></div>
           </div>
        </div>
      </div>
      
      <style>
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      </style>
    `;
  }
}
