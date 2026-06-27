/**
 * @fileoverview Scan Result View
 * The final minimal screen displaying extracted data and action buttons.
 */
import { appAlert } from '../core/ui.js';

const SCHEDULE_INFO = {
  'H': { color: '#ef4444' },
  'H1': { color: '#f97316' },
  'X': { color: '#dc2626' },
  'G': { color: '#eab308' },
  'OTC': { color: '#10b981' }
};

export default class ScanResultView {
  constructor() {
    this.container = document.createElement('div');
    this.container.className = 'scan-result-root';
    this.container.style.cssText = `
      position: fixed; inset: 0; width: 100%; height: 100%;
      background: #000; overflow-y: auto; display: flex;
      flex-direction: column; font-family: 'Inter', sans-serif; z-index: 10;
    `;
    this.result = null;
  }

  async render() {
    this._buildDOM();
    return this.container;
  }

  _buildDOM() {
    const dataUrl = sessionStorage.getItem('medcare_scanned_image');
    const resultJson = sessionStorage.getItem('medcare_scan_result');

    if (!resultJson) {
      window.location.hash = '#/scan';
      return;
    }
    
    this.result = JSON.parse(resultJson);
    
    const sched = SCHEDULE_INFO[this.result.schedule] || SCHEDULE_INFO['OTC'];
    
    const bName = this.result.brandName || this.result.name;
    const gName = this.result.genericName || this.result.name;
    
    const titleHtml = (bName.toLowerCase() !== gName.toLowerCase()) 
      ? `${bName} <div style="font-size: 14px; color: #a1a1aa; margin-top: 4px; font-weight: 500;">${gName}</div>`
      : bName;

    this.container.innerHTML = `
      <style>
        .scan-result-root * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        .glass-card { 
          background: rgba(10, 15, 25, 0.6); 
          backdrop-filter: blur(40px); 
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.08); 
          border-radius: 32px;
          padding: 32px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.4);
        }
        .bg-blur {
          position: fixed; inset: -10%; width: 120%; height: 120%;
          object-fit: cover; filter: blur(50px) brightness(0.3); opacity: 0.9;
          z-index: 1; pointer-events: none;
        }
        .action-btn {
          width: 100%; padding: 18px; border-radius: 20px; font-weight: 800; font-size: 15px;
          text-transform: uppercase; letter-spacing: 0.05em; cursor: pointer; border: none;
          display: flex; align-items: center; justify-content: center; gap: 8px; transition: all 0.2s;
        }
        .action-btn:active { transform: scale(0.97); }
        .btn-primary {
          background: #10b981; color: white;
          box-shadow: 0 8px 24px rgba(16, 185, 129, 0.3);
        }
        .btn-secondary {
          background: rgba(255, 255, 255, 0.1); color: white;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
      </style>

      ${dataUrl ? `<img src="${dataUrl}" class="bg-blur" />` : '<div class="bg-blur" style="background:#18181b"></div>'}

      <div style="position: relative; z-index: 2; display: flex; flex-direction: column; width: 100%; min-height: 100%; padding: max(env(safe-area-inset-top), 24px) 24px max(env(safe-area-inset-bottom), 32px);">
        
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: auto;">
          <button id="sr-close" style="background: rgba(255, 255, 255, 0.1); border: none; border-radius: 50%; width: 44px; height: 44px; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer;">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
          <div style="color: ${this.result.confidence > 70 ? '#10b981' : '#eab308'}; font-size: 12px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; background: ${this.result.confidence > 70 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.15)'}; padding: 6px 12px; border-radius: 20px; display: flex; align-items: center; gap: 6px;">
            ${this.result.confidence > 70 ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> VERIFIED' : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg> NEEDS REVIEW'}
          </div>
        </div>

        <!-- Main Card -->
        <div class="glass-card" style="margin-top: 40px; margin-bottom: 24px; padding: 28px;">
          
          <div style="display: flex; gap: 8px; margin-bottom: 12px;">
            <span style="font-size: 11px; font-weight: 800; color: ${sched.color}; background: ${sched.color}22; padding: 4px 10px; border-radius: 12px; font-family: monospace;">
              ${this.result.schedule || 'OTC'}
            </span>
          </div>

          <div style="font-size: 28px; font-weight: 800; color: white; margin-bottom: 20px; line-height: 1.2;">
            ${titleHtml}
          </div>

          <!-- Trust Evidence Layer -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 16px; display: flex; flex-direction: column; gap: 4px;">
              <span style="color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase;">Evidence</span>
              <div style="color: #e2e8f0; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Manufacturer
              </div>
              <div style="color: #e2e8f0; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Dosage
              </div>
              <div style="color: #e2e8f0; font-size: 12px; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg> Packaging
              </div>
            </div>
            
            <div style="background: rgba(255,255,255,0.05); padding: 12px; border-radius: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center;">
              <span style="color: #94a3b8; font-size: 10px; font-weight: 700; text-transform: uppercase; margin-bottom: 4px;">Detected Qty</span>
              <span style="color: #10b981; font-size: 24px; font-weight: 800;">${this.result.quantity || 'N/A'}<span style="font-size:12px;color:#94a3b8;margin-left:2px">doses</span></span>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            ${this.result.dosage ? `<div style="padding: 6px 12px; border-radius: 12px; background: rgba(255,255,255,0.03); color: #e2e8f0; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;"><span style="color:#ffb88c">💊</span> ${this.result.dosage}${this.result.unit}</div>` : ''}
            ${this.result.depthEngineFailed ? `<div style="padding: 6px 12px; border-radius: 12px; background: rgba(239,68,68,0.1); color: #fca5a5; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> 2D Fallback</div>` : ''}
          </div>
        </div>

        <!-- Workflow Hub Actions -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: auto;">
          <button id="sr-add" class="action-btn btn-primary" style="grid-column: 1 / -1; font-size: 16px;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            Add Medication
          </button>
          
          <button id="sr-family" class="action-btn btn-secondary" style="font-size: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Family Health
          </button>

          <button id="sr-interactions" class="action-btn btn-secondary" style="font-size: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Interactions
          </button>
          
          <button id="sr-evidence" class="action-btn btn-secondary" style="font-size: 12px;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            View Evidence
          </button>

          <button id="sr-rescan" class="action-btn" style="grid-column: 1 / -1; background: transparent; color: #94a3b8; border: 1px dashed rgba(255,255,255,0.2); font-size: 13px;">
            Scan Another
          </button>
        </div>

      </div>
    `;

    this._attachListeners();
  }

  _attachListeners() {
    const btnClose = this.container.querySelector('#sr-close');
    const btnAdd = this.container.querySelector('#sr-add');
    const btnRescan = this.container.querySelector('#sr-rescan');
    const btnFamily = this.container.querySelector('#sr-family');
    const btnInteractions = this.container.querySelector('#sr-interactions');
    const btnEvidence = this.container.querySelector('#sr-evidence');

    if (btnClose) btnClose.addEventListener('click', () => window.location.hash = '#/dashboard');
    if (btnRescan) btnRescan.addEventListener('click', () => window.location.hash = '#/scan');
    if (btnFamily) btnFamily.addEventListener('click', () => window.location.hash = '#/family-profiles');
    if (btnInteractions) btnInteractions.addEventListener('click', () => window.location.hash = '#/interaction-checker');
    if (btnEvidence) btnEvidence.addEventListener('click', async () => await appAlert('Evidence Telemetry viewer coming soon...', 'Coming Soon'));
    
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        const params = new URLSearchParams();
        if (this.result.name) params.append('name', this.result.name);
        if (this.result.dosage) params.append('dosage', this.result.dosage);
        if (this.result.unit) params.append('unit', this.result.unit);
        window.location.hash = `#/add-medication?${params.toString()}`;
      });
    }
  }

  destroy() {
    // cleanup if needed
  }
}
