/**
 * @fileoverview Pharmacological Interaction Matrix View for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Offline-First Conflict Resolution and Prioritization.
 * Uses Breadth-First Search via InteractionGraph to detect clashes.
 */

import { globalRouter } from '../core/router.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { interactionGraph } from '../services/InteractionGraph.js';
import { Utils } from '../core/utils.js';

export default class InteractionMatrix {
    /** @private {Array<Object>} */
    static _activeMeds = [];
    /** @private {Array<Object>} */
    static _allInteractions = [];
    /** @private {Object} */
    static _categorized = { severe: [], moderate: [], mild: [], safe: [] };
    /** @private {string} */
    static _activeFilter = 'all';

    /**
     * Bootstraps the Interaction Matrix view.
     * @param {HTMLElement} container 
     * @param {Object} params 
     */
    static async render(container, params = {}) {
        if (!container) return;
        
        this._activeFilter = 'all';
        this._renderLayoutShell(container);
        this._bindStaticEvents(container);
        
        await this._loadAndAnalyze(container);
    }

    /**
     * Injects the structural HTML and CSS mapping rules.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderLayoutShell(container) {
        const scopedCSS = `
            <style id="interaction-matrix-styles">
                .matrix-header { position: sticky; top: 0; z-index: var(--z-overlay); background: var(--clr-bg); padding-bottom: var(--sp-2); margin-bottom: var(--sp-2); }
                .matrix-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3); padding-top: var(--sp-2); }
                
                .metric-strip { display: flex; gap: var(--sp-2); margin-bottom: var(--sp-4); }
                .metric-card { flex: 1; display: flex; flex-direction: column; align-items: center; padding: var(--sp-2); border-radius: var(--radius-md); background: var(--clr-glass-52); border: 1px solid var(--clr-border-80); box-shadow: var(--shadow-sm); backdrop-filter: var(--blur-glass-std); -webkit-backdrop-filter: var(--blur-glass-std); }
                .metric-card--danger { border-color: rgba(232,0,58,0.3); }
                .metric-card--warn { border-color: rgba(212,134,10,0.3); }
                .metric-card--mild { border-color: rgba(45,158,107,0.3); }
                .metric-val { font-size: var(--fs-xl); font-weight: 700; color: var(--clr-text-hi); line-height: 1; margin-top: var(--sp-1); }

                .filter-tabs { display: flex; gap: var(--sp-2); overflow-x: auto; padding-bottom: var(--sp-1); margin-bottom: var(--sp-2); scrollbar-width: none; }
                .filter-tabs::-webkit-scrollbar { display: none; }
                .filter-tab { padding: var(--sp-1) var(--sp-3); border-radius: var(--radius-full); font-size: var(--fs-sm); font-weight: 600; color: var(--clr-text-lo); background: transparent; border: 1px solid transparent; cursor: pointer; transition: all var(--time-fast) ease; white-space: nowrap; }
                .filter-tab--active { background: var(--clr-pill-orange-bg); border-color: var(--clr-pill-orange-brd); color: var(--clr-pill-orange-text); }

                .results-container { display: flex; flex-direction: column; gap: var(--sp-3); padding-bottom: var(--sp-14); }
                
                .interaction-card { background: var(--clr-glass-60); border: 1px solid var(--clr-border-80); border-radius: var(--radius-md); overflow: hidden; box-shadow: var(--shadow-sm); transition: transform var(--time-fast) ease; }
                .interaction-card--severe { border-left: 4px solid var(--clr-danger); }
                .interaction-card--moderate { border-left: 4px solid var(--clr-warn); }
                .interaction-card--mild { border-left: 4px solid var(--clr-success); }
                
                .interaction-header { padding: var(--sp-3); display: flex; justify-content: space-between; align-items: flex-start; cursor: pointer; -webkit-tap-highlight-color: transparent; }
                .interaction-title { font-size: var(--fs-base); font-weight: 700; color: var(--clr-text-hi); margin-bottom: var(--sp-1); }
                .interaction-desc { font-size: var(--fs-sm); color: var(--clr-text-md); line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
                
                .interaction-chevron { color: var(--clr-text-lo); transition: transform var(--time-base) ease; }
                .interaction-card.expanded .interaction-chevron { transform: rotate(180deg); }
                .interaction-card.expanded .interaction-desc { -webkit-line-clamp: unset; }
                
                .interaction-body { max-height: 0; overflow: hidden; transition: max-height 300ms cubic-bezier(0.16, 1, 0.3, 1); opacity: 0; background: rgba(0,0,0,0.02); }
                .interaction-card.expanded .interaction-body { max-height: 500px; opacity: 1; }
                .interaction-body-content { padding: var(--sp-3); border-top: 1px solid var(--clr-divider); }
                
                .action-list { margin-top: var(--sp-2); padding-left: var(--sp-4); }
                .action-list li { font-size: var(--fs-sm); color: var(--clr-text-md); margin-bottom: var(--sp-1); }

                .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--sp-6) 0; }
                
                .all-clear-banner { background: var(--clr-pill-success-bg); border: 1px solid var(--clr-pill-success-brd); border-radius: var(--radius-md); padding: var(--sp-3); display: flex; align-items: center; gap: var(--sp-2); color: var(--clr-pill-success-text); font-weight: 600; margin-bottom: var(--sp-4); position: relative; overflow: hidden; }
                
                /* Confetti Animation */
                .confetti-container { position: absolute; inset: 0; pointer-events: none; }
                .confetti { position: absolute; width: 6px; height: 6px; border-radius: 50%; top: 50%; left: 50%; animation: burst 600ms ease-out forwards; }
                @keyframes burst { 0% { transform: translate(-50%, -50%) scale(0); opacity: 1; } 100% { transform: translate(var(--tx), var(--ty)) scale(1); opacity: 0; } }

                .sticky-bottom { position: fixed; bottom: calc(var(--sp-10) + env(safe-area-inset-bottom, 12px) + var(--sp-2)); left: var(--sp-4); right: var(--sp-4); z-index: var(--z-overlay); }
            </style>
            
            <div class="view-panel view-enter">
                <div class="matrix-header">
                    <div class="matrix-top-bar">
                        <button id="matrix-back-btn" class="btn-icon" aria-label="Go Back" style="border-radius: var(--radius-full);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <h1 class="typography-h2" style="margin: 0;">Interaction Check</h1>
                        <button id="matrix-share-btn" class="btn-icon" aria-label="Share Report" style="border-radius: var(--radius-full);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        </button>
                    </div>

                    <div id="matrix-metrics-target">
                        <div class="metric-strip">
                            <div class="metric-card"><div class="skeleton w-full h-full" style="height: 40px;"></div></div>
                            <div class="metric-card"><div class="skeleton w-full h-full" style="height: 40px;"></div></div>
                            <div class="metric-card"><div class="skeleton w-full h-full" style="height: 40px;"></div></div>
                        </div>
                    </div>

                    <div class="filter-tabs">
                        <button class="filter-tab filter-tab--active" data-filter="all">All</button>
                        <button class="filter-tab" data-filter="severe">Severe</button>
                        <button class="filter-tab" data-filter="moderate">Moderate</button>
                        <button class="filter-tab" data-filter="mild">Mild</button>
                        <button class="filter-tab" data-filter="safe">Safe</button>
                    </div>
                </div>

                <div id="matrix-results-target" class="results-container">
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                    <div class="skeleton-card"></div>
                </div>
            </div>
            
            <div id="matrix-sticky-target"></div>
        `;
        container.innerHTML = scopedCSS;
    }

    /**
     * Binds permanent header and layout controls.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindStaticEvents(container) {
        const backBtn = Utils.qs('#matrix-back-btn', container);
        const shareBtn = Utils.qs('#matrix-share-btn', container);
        const filterTabs = Utils.qsAll('.filter-tab', container);

        if (backBtn) Utils.on(backBtn, 'click', () => globalRouter.back());
        
        if (shareBtn) Utils.on(shareBtn, 'click', () => this._handleShareRequest());

        filterTabs.forEach(tab => {
            Utils.on(tab, 'click', (e) => {
                filterTabs.forEach(t => t.classList.remove('filter-tab--active'));
                const btn = e.currentTarget;
                btn.classList.add('filter-tab--active');
                this._activeFilter = btn.getAttribute('data-filter');
                this._renderResultsList(container);
            });
        });
    }

    /**
     * Executes the heavy data loading and BFS matrix calculation asynchronously.
     * @private
     * @param {HTMLElement} container 
     */
    static async _loadAndAnalyze(container) {
        try {
            this._activeMeds = await dbEngine.getAllMedications();
            
            // Empty State Guard
            if (!this._activeMeds || this._activeMeds.length === 0) {
                this._renderEmptyState(container);
                return;
            }

            // Extract generic identifiers for Graph lookup
            const drugNames = this._activeMeds.map(m => m.genericName || m.name);
            
            // Execute Breadth-First Search Matrix Resolution
            if (typeof interactionGraph === 'undefined') {
                throw new Error('InteractionGraph service is not available.');
            }
            
            const rawInteractions = interactionGraph.findInteractions(drugNames);
            
            // Re-map internal structures to ensure uniqueness and categorize
            this._allInteractions = rawInteractions || [];
            this._categorizeInteractions();
            
            this._renderMetrics(container);
            this._renderResultsList(container);
            this._renderStickyCTA(container);

        } catch (error) {
            console.error('[InteractionMatrix] Resolution pipeline failed:', error);
            const resultsTarget = Utils.qs('#matrix-results-target', container);
            if (resultsTarget) {
                resultsTarget.innerHTML = `
                    <div class="card card--danger">
                        <p class="typography-body text-danger">Failed to calculate matrix conflicts. Please ensure offline data ledgers are intact.</p>
                    </div>
                `;
            }
        }
    }

    /**
     * Buckets raw interaction objects into severity arrays for rapid UI filtering.
     * @private
     */
    static _categorizeInteractions() {
        this._categorized = { severe: [], moderate: [], mild: [], safe: [] };
        const unsafeMeds = new Set();

        for (const ix of this._allInteractions) {
            unsafeMeds.add(ix.drugA.toLowerCase());
            unsafeMeds.add(ix.drugB.toLowerCase());

            if (ix.severity === 'high' || ix.severity === 'severe') {
                this._categorized.severe.push(ix);
            } else if (ix.severity === 'moderate') {
                this._categorized.moderate.push(ix);
            } else {
                this._categorized.mild.push(ix);
            }
        }

        // Identify safe medications (present in list, missing from conflict arrays)
        for (const med of this._activeMeds) {
            const medId = (med.genericName || med.name).toLowerCase();
            if (!unsafeMeds.has(medId)) {
                this._categorized.safe.push(med);
            }
        }
    }

    /**
     * Renders the top summary metric cards.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderMetrics(container) {
        const metricsTarget = Utils.qs('#matrix-metrics-target', container);
        if (!metricsTarget) return;

        const sevCount = this._categorized.severe.length;
        const modCount = this._categorized.moderate.length;
        const mildCount = this._categorized.mild.length;

        metricsTarget.innerHTML = `
            <div class="metric-strip">
                <div class="metric-card metric-card--danger">
                    <span class="typography-label" style="color: var(--clr-danger);">Severe</span>
                    <span class="metric-val">${sevCount}</span>
                </div>
                <div class="metric-card metric-card--warn">
                    <span class="typography-label" style="color: var(--clr-warn);">Moderate</span>
                    <span class="metric-val">${modCount}</span>
                </div>
                <div class="metric-card metric-card--mild">
                    <span class="typography-label" style="color: var(--clr-success);">Mild</span>
                    <span class="metric-val">${mildCount}</span>
                </div>
            </div>
        `;
    }

    /**
     * Mounts the dynamic list of interaction cards based on the active categorical filter.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderResultsList(container) {
        const resultsTarget = Utils.qs('#matrix-results-target', container);
        if (!resultsTarget) return;

        let html = '';

        // All Clear Banner Injection (Only in 'all' view)
        if (this._activeFilter === 'all' && this._categorized.severe.length === 0 && this._categorized.moderate.length === 0) {
            html += `
                <div class="all-clear-banner">
                    <div class="confetti-container" id="confetti-root"></div>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                    <span>No significant interactions found.</span>
                </div>
            `;
            setTimeout(() => this._triggerConfetti(container), 50);
        }

        const renderConflictCard = (ix, severityClass, badgeClass, badgeLabel) => `
            <div class="interaction-card interaction-card--${severityClass}">
                <div class="interaction-header ix-toggle">
                    <div style="flex: 1; padding-right: var(--sp-2);">
                        <div class="flex items-center gap-2 mb-2">
                            <span class="badge ${badgeClass}">${badgeLabel}</span>
                            <span class="badge badge--neutral" style="font-size: 10px;">${Utils.sanitizeString(ix.evidence || 'Moderate Evidence')}</span>
                        </div>
                        <h3 class="interaction-title">${Utils.sanitizeString(ix.drugA)} ↔ ${Utils.sanitizeString(ix.drugB)}</h3>
                        <p class="interaction-desc">${Utils.sanitizeString(ix.mechanism || 'Pharmacodynamic conflict identified.')}</p>
                    </div>
                    <div class="interaction-chevron mt-1">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </div>
                </div>
                <div class="interaction-body">
                    <div class="interaction-body-content">
                        <p class="typography-label text-hi mb-1">Recommendation</p>
                        <p class="typography-body text-md mb-3">${Utils.sanitizeString(ix.recommendation || 'Consult physician regarding dosage timing.')}</p>
                        
                        <p class="typography-label text-hi mb-1">Suggested Actions</p>
                        <ul class="action-list">
                            <li>Separate administration by at least 2 hours.</li>
                            <li>Monitor for signs of increased toxicity.</li>
                            <li>Verify combination with primary care provider.</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;

        // Render List Elements based on filter state
        if (this._activeFilter === 'all' || this._activeFilter === 'severe') {
            this._categorized.severe.forEach(ix => html += renderConflictCard(ix, 'severe', 'badge--danger', 'Severe'));
        }
        if (this._activeFilter === 'all' || this._activeFilter === 'moderate') {
            this._categorized.moderate.forEach(ix => html += renderConflictCard(ix, 'moderate', 'badge--warn', 'Moderate'));
        }
        if (this._activeFilter === 'all' || this._activeFilter === 'mild') {
            this._categorized.mild.forEach(ix => html += renderConflictCard(ix, 'mild', 'badge--success', 'Mild'));
        }

        // Safe Medications Injection
        if ((this._activeFilter === 'all' || this._activeFilter === 'safe') && this._categorized.safe.length > 0) {
            const safePills = this._categorized.safe.map(m => 
                `<span class="pill pill-success">${Utils.sanitizeString(m.name)}</span>`
            ).join('');
            
            html += `
                <div class="mt-4 mb-2">
                    <h3 class="typography-label text-muted mb-3">Medications with no interactions found</h3>
                    <div class="flex flex-wrap gap-2">${safePills}</div>
                </div>
            `;
        }

        if (html === '') {
            html = `<p class="typography-body text-muted text-center mt-4">No data matches this filter.</p>`;
        }

        resultsTarget.innerHTML = html;

        // Bind accordion expansion toggles
        const toggles = Utils.qsAll('.ix-toggle', resultsTarget);
        toggles.forEach(toggle => {
            Utils.on(toggle, 'click', (e) => {
                const card = e.currentTarget.closest('.interaction-card');
                if (card) card.classList.toggle('expanded');
            });
        });
    }

    /**
     * Orchestrates a hardware-accelerated CSS confetti burst for the All-Clear state.
     * @private
     * @param {HTMLElement} container 
     */
    static _triggerConfetti(container) {
        const root = Utils.qs('#confetti-root', container);
        if (!root) return;
        
        const colors = ['#FFD200', '#FF8C00', '#E8003A', '#9B5DE5', '#2D9E6B'];
        let html = '';
        
        for (let i = 0; i < 20; i++) {
            const color = colors[Math.floor(Math.random() * colors.length)];
            const angle = Math.random() * Math.PI * 2;
            const velocity = 20 + Math.random() * 40;
            const tx = Math.cos(angle) * velocity;
            const ty = Math.sin(angle) * velocity;
            
            html += `<div class="confetti" style="background: ${color}; --tx: ${tx}px; --ty: ${ty}px; animation-delay: ${Math.random() * 200}ms;"></div>`;
        }
        
        root.innerHTML = html;
        setTimeout(() => { if (root) root.innerHTML = ''; }, 1000);
    }

    /**
     * Evaluates severity ratios to dynamically mount the sticky CTA bar.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderStickyCTA(container) {
        const target = Utils.qs('#matrix-sticky-target', container);
        if (!target) return;

        const sevCount = this._categorized.severe.length;
        
        if (sevCount > 0) {
            target.innerHTML = `
                <div class="sticky-bottom">
                    <button class="btn btn-danger w-full" style="height: 56px; box-shadow: var(--shadow-glow);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                        Export & Consult Doctor
                    </button>
                </div>
            `;
            const btn = target.querySelector('button');
            Utils.on(btn, 'click', () => this._handleShareRequest());
        } else {
            target.innerHTML = ``; // Clear sticky for safe profiles to prevent UI clutter
        }
    }

    /**
     * Renders an illustrative empty state if the user has no registered medications.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderEmptyState(container) {
        const resultsTarget = Utils.qs('#matrix-results-target', container);
        const metricsTarget = Utils.qs('#matrix-metrics-target', container);
        if (metricsTarget) metricsTarget.innerHTML = '';

        if (resultsTarget) {
            resultsTarget.innerHTML = `
                <div class="empty-state">
                    <div class="icon-box" style="background: var(--clr-glass-65); color: var(--clr-text-lo); width: 80px; height: 80px; margin-bottom: var(--sp-4);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 8v8"></path><path d="M8 12h8"></path></svg>
                    </div>
                    <h3 class="typography-h3 mb-2">Matrix Inactive</h3>
                    <p class="typography-body text-muted mb-6 max-w-md">Add medications to your profile to calculate potential pharmacological conflicts.</p>
                    <button class="btn btn-primary w-full max-w-md" onclick="window.location.hash='#/search'">Go to Search &rarr;</button>
                </div>
            `;
        }
    }

    /**
     * Interfaces with the native Web Share API to export interaction summaries.
     * Uses generic clipboard fallback if sharing is unsupported.
     * @private
     */
    static async _handleShareRequest() {
        const textSummary = `MedCare Analysis: Found ${this._categorized.severe.length} severe and ${this._categorized.moderate.length} moderate pharmacological interactions in my active list.`;
        
        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'MedCare Interaction Report',
                    text: textSummary,
                    url: window.location.href
                });
            } catch (shareErr) {
                console.warn('Share API request dismissed or failed.', shareErr);
            }
        } else {
            try {
                await navigator.clipboard.writeText(textSummary);
                Utils.showToast('Interaction summary copied to clipboard.', 'success');
            } catch (clipErr) {
                Utils.showToast('Failed to copy summary to clipboard.', 'error');
            }
        }
    }
}