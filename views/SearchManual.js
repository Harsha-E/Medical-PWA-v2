/**
 * @fileoverview High-Performance Medication Search View for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Offline-First Trie-powered instantaneous search with modal ingestion.
 */

import { globalRouter } from '../core/router.js';
import { globalStore } from '../core/store.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { interactionGraph } from '../services/InteractionGraph.js';
import { Utils } from '../core/utils.js';

// ============================================================================
// TRIE DATA STRUCTURE
// ============================================================================

/**
 * Node structure for the predictive search Trie.
 */
class TrieNode {
    constructor() {
        /** @type {Map<string, TrieNode>} */
        this.children = new Map();
        /** @type {boolean} */
        this.isEndOfWord = false;
        /** @type {string|null} */
        this.originalCasing = null;
    }
}

/**
 * Predictive text search tree optimized for sub-10ms lookup against 5000+ entries.
 * Time Complexity: O(M) insert where M is string length. O(P + V) search where
 * P is prefix length and V is the number of vertices visited during DFS collection.
 */
class Trie {
    constructor() {
        this.root = new TrieNode();
    }

    /**
     * Ingests a new string into the prefix matrix.
     * @param {string} word - The pharmaceutical string to index.
     */
    insert(word) {
        if (!word) return;
        let node = this.root;
        const normalized = word.toLowerCase();

        for (const char of normalized) {
            if (!node.children.has(char)) {
                node.children.set(char, new TrieNode());
            }
            node = node.children.get(char);
        }
        node.isEndOfWord = true;
        node.originalCasing = word; // Preserve accurate display casing
    }

    /**
     * Executes a Depth-First Search to collect branching matches from a prefix node.
     * @private
     * @param {TrieNode} node - The starting node.
     * @param {string[]} results - Accumulator array.
     * @param {number} limit - Maximum execution bounds.
     */
    _dfs(node, results, limit) {
        if (results.length >= limit) return;
        
        if (node.isEndOfWord && node.originalCasing) {
            results.push(node.originalCasing);
        }

        // Maintain alphabetical traversal for predictable user experience
        const sortedKeys = Array.from(node.children.keys()).sort();
        for (const char of sortedKeys) {
            this._dfs(node.children.get(char), results, limit);
        }
    }

    /**
     * Locates all indexed pharmaceutical entries matching the specified prefix.
     * @param {string} prefix - The user query block.
     * @param {number} [limit=10] - Result ceiling to maintain DOM render performance.
     * @returns {string[]} Array of casing-accurate string matches.
     */
    search(prefix, limit = 10) {
        if (!prefix) return [];
        let node = this.root;
        const normalized = prefix.toLowerCase();

        for (const char of normalized) {
            if (!node.children.has(char)) {
                return []; // Sub-tree dead end
            }
            node = node.children.get(char);
        }

        const results = [];
        this._dfs(node, results, limit);
        return results;
    }
}

// ============================================================================
// MAIN VIEW COMPONENT
// ============================================================================

export default class SearchManual {
    /** @private {Trie} Structural search engine instance */
    static _trie = new Trie();
    /** @private {Map<string, Object>} Complete dataset payload mapping */
    static _drugCatalog = new Map();
    /** @private {boolean} Matrix hydration status flag */
    static _isHydrated = false;
    /** @private {string} The active string query from the input field */
    static _currentQuery = '';
    /** @private {string} The active categorical UI filter */
    static _activeFilter = 'All';
    /** @private {number|null} Input bounce-prevention clock handle */
    static _debounceTimer = null;

    /**
     * Core lifecycle execution sequence.
     * @param {HTMLElement} container - The routing injection node.
     * @param {Object} [params] - Route parameters (e.g., prefilled OCR query).
     */
    static async render(container, params = {}) {
        if (!container) return;

        this._currentQuery = params?.query ? String(params.query) : '';
        this._activeFilter = 'All';

        this._renderLayout(container);
        this._bindEvents(container);

        if (!this._isHydrated) {
            await this._hydrateCatalog(container);
        } else {
            this._executeSearch(container);
        }

        // Trigger native keyboard focus for immediate physical interaction
        setTimeout(() => {
            const inputField = Utils.qs('#search-input', container);
            if (inputField && !this._currentQuery) inputField.focus();
        }, 300);
    }

    /**
     * Injects the structural HTML layout and localized CSS block.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderLayout(container) {
        const scopedStyles = `
            <style id="search-manual-styles">
                .search-header { position: sticky; top: 0; z-index: var(--z-overlay); background: var(--clr-bg); padding-bottom: var(--sp-2); margin-bottom: var(--sp-2); }
                .search-top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3); padding-top: var(--sp-2); }
                
                .search-bar { display: flex; align-items: center; gap: var(--sp-2); background: var(--clr-glass-65); border: 1px solid var(--clr-border-88); border-radius: var(--radius-full); padding: 0 var(--sp-4); height: var(--sp-7); box-shadow: var(--shadow-sm); backdrop-filter: var(--blur-glass-std); -webkit-backdrop-filter: var(--blur-glass-std); transition: border-color var(--time-base) ease, box-shadow var(--time-base) ease; }
                .search-bar:focus-within { border-color: var(--clr-orange-mid); box-shadow: var(--shadow-focus); background: var(--clr-glass-95); }
                
                .search-input { flex: 1; border: none; background: transparent; height: 100%; outline: none; font-family: 'Space Grotesk', sans-serif; font-size: var(--fs-base); color: var(--clr-text-hi); -webkit-appearance: none; }
                .search-input::placeholder { color: var(--clr-text-lo); }
                .search-clear-btn { color: var(--clr-text-lo); cursor: pointer; padding: var(--sp-1); border-radius: var(--radius-full); display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity var(--time-fast) ease; }
                .search-clear-btn--visible { opacity: 1; pointer-events: auto; }
                .search-clear-btn:hover { background: rgba(180, 60, 0, 0.1); color: var(--clr-text-hi); }

                .filter-scroll { display: flex; gap: var(--sp-2); overflow-x: auto; padding-bottom: var(--sp-1); scrollbar-width: none; -ms-overflow-style: none; margin-left: calc(var(--sp-4) * -1); margin-right: calc(var(--sp-4) * -1); padding-left: var(--sp-4); padding-right: var(--sp-4); }
                .filter-scroll::-webkit-scrollbar { display: none; }
                
                .filter-chip { white-space: nowrap; padding: var(--sp-1) var(--sp-3); border-radius: var(--radius-full); background: var(--clr-glass-52); border: 1px solid var(--clr-border-80); color: var(--clr-text-md); font-size: var(--fs-sm); font-weight: 600; cursor: pointer; transition: all var(--time-fast) ease; box-shadow: var(--shadow-sm); }
                .filter-chip:active { transform: scale(0.95); }
                .filter-chip--active { background: var(--clr-pill-orange-bg); border-color: var(--clr-pill-orange-brd); color: var(--clr-pill-orange-text); }

                .search-results-area { display: flex; flex-direction: column; gap: var(--sp-3); padding-bottom: var(--sp-10); }
                
                .empty-state { display: flex; flex-direction: column; align-items: center; text-align: center; padding: var(--sp-6) 0; }
                .preset-grid { display: flex; flex-wrap: wrap; justify-content: center; gap: var(--sp-2); margin-top: var(--sp-4); }

                /* Custom Add Modal Injection Styles */
                .add-modal-overlay { position: fixed; inset: 0; z-index: 9000; background: rgba(80, 30, 10, 0.4); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); display: flex; align-items: flex-end; justify-content: center; opacity: 1; transition: opacity var(--time-base) ease; }
                .add-modal-overlay.hidden { opacity: 0; pointer-events: none; }
                
                .add-modal-content { width: 100%; max-width: 480px; background: var(--clr-bg-alt); border-top-left-radius: var(--radius-xl); border-top-right-radius: var(--radius-xl); padding: var(--sp-5); box-shadow: var(--shadow-lg); transform: translateY(0); transition: transform var(--time-enter) cubic-bezier(0.16, 1, 0.3, 1); max-height: 90vh; overflow-y: auto; }
                .add-modal-overlay.hidden .add-modal-content { transform: translateY(100%); }
            </style>
            
            <div class="view-panel view-enter">
                <div class="search-header">
                    <div class="search-top-bar">
                        <button id="search-back-btn" class="btn-icon" aria-label="Go Back" style="border-radius: var(--radius-full);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <h1 class="typography-h2" style="margin: 0;">Find Medication</h1>
                        <button id="search-camera-btn" class="btn-icon" aria-label="Scan Label" style="border-radius: var(--radius-full);">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                        </button>
                    </div>

                    <div class="search-bar mb-4">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-lo)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                        <input type="search" id="search-input" class="search-input" placeholder="Enter drug name..." autocomplete="off" value="${this._currentQuery}">
                        <div id="search-clear-btn" class="search-clear-btn ${this._currentQuery ? 'search-clear-btn--visible' : ''}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                        </div>
                    </div>

                    <div class="filter-scroll">
                        ${['All', 'Antibiotic', 'Antihypertensive', 'Analgesic', 'Statin', 'Antidiabetic', 'Antihistamine'].map(cat => 
                            `<button class="filter-chip ${this._activeFilter === cat ? 'filter-chip--active' : ''}" data-filter="${cat}">${cat}</button>`
                        ).join('')}
                    </div>
                </div>

                <div id="search-results-area" class="search-results-area">
                    </div>
            </div>
        `;
        container.innerHTML = scopedStyles;
    }

    /**
     * Initializes hardware listeners and attaches functional closures to UI components.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindEvents(container) {
        const backBtn = Utils.qs('#search-back-btn', container);
        const cameraBtn = Utils.qs('#search-camera-btn', container);
        const inputField = Utils.qs('#search-input', container);
        const clearBtn = Utils.qs('#search-clear-btn', container);
        const filterChips = Utils.qsAll('.filter-chip', container);

        if (backBtn) Utils.on(backBtn, 'click', () => globalRouter.back());
        if (cameraBtn) Utils.on(cameraBtn, 'click', () => globalRouter.navigate('#/scan'));

        if (inputField) {
            Utils.on(inputField, 'input', (e) => {
                const val = e.target.value;
                this._currentQuery = val;
                
                if (clearBtn) {
                    if (val.length > 0) clearBtn.classList.add('search-clear-btn--visible');
                    else clearBtn.classList.remove('search-clear-btn--visible');
                }

                if (this._debounceTimer) clearTimeout(this._debounceTimer);
                this._debounceTimer = setTimeout(() => this._executeSearch(container), 150);
            });
        }

        if (clearBtn) {
            Utils.on(clearBtn, 'click', () => {
                if (inputField) inputField.value = '';
                this._currentQuery = '';
                clearBtn.classList.remove('search-clear-btn--visible');
                this._executeSearch(container);
                if (inputField) inputField.focus();
            });
        }

        filterChips.forEach(chip => {
            Utils.on(chip, 'click', (e) => {
                filterChips.forEach(c => c.classList.remove('filter-chip--active'));
                e.target.classList.add('filter-chip--active');
                this._activeFilter = e.target.getAttribute('data-filter');
                this._executeSearch(container);
            });
        });
    }

    /**
     * Compiles the in-memory predictive search structure from static network assets.
     * Gracefully fails over to the local DatabaseEngine on network timeouts.
     * @private
     * @param {HTMLElement} container 
     */
    static async _hydrateCatalog(container) {
        this._renderSkeletons(container);

        try {
            const response = await fetch('./data/drug-index.json');
            if (!response.ok) throw new Error('Offline or matrix unreachable');
            const data = await response.json();

            data.forEach(drug => {
                if (drug && drug.name) {
                    this._trie.insert(drug.name);
                    this._drugCatalog.set(drug.name, drug);
                }
            });
            this._isHydrated = true;

        } catch (error) {
            console.warn('[SearchManual] Network ingestion rejected. Defaulting to local fallback.', error);
            // Fallback: Utilize any previously cached entries from the profile DB
            try {
                const localMeds = await dbEngine.getAllMedications();
                if (localMeds && localMeds.length > 0) {
                    localMeds.forEach(med => {
                        this._trie.insert(med.name);
                        this._drugCatalog.set(med.name, med);
                    });
                    this._isHydrated = true;
                }
            } catch (dbError) {
                console.error('[SearchManual Fatal] Both primary and fallback catalogs rejected hydration.');
            }
        }

        this._executeSearch(container);
    }

    /**
     * Orchestrates the actual DOM matching, filtering, and visual rendering sequence.
     * @private
     * @param {HTMLElement} container 
     */
    static async _executeSearch(container) {
        const resultsArea = Utils.qs('#search-results-area', container);
        if (!resultsArea) return;

        // 1. Initial Empty State
        if (!this._currentQuery.trim()) {
            resultsArea.innerHTML = this._getEmptyStateHtml();
            this._bindPresetButtons(container);
            return;
        }

        // 2. Perform DFS string matching constraint search
        const matchedNames = this._trie.search(this._currentQuery, 15);
        
        let validDrugs = [];
        for (const name of matchedNames) {
            const drugData = this._drugCatalog.get(name);
            if (drugData) validDrugs.push(drugData);
        }

        // 3. Apply Categorical Filters
        if (this._activeFilter !== 'All') {
            const targetFilter = this._activeFilter.toLowerCase();
            validDrugs = validDrugs.filter(d => 
                (d.category || '').toLowerCase().includes(targetFilter)
            );
        }

        // 4. Render Layout Maps
        if (validDrugs.length === 0) {
            resultsArea.innerHTML = `
                <div class="empty-state">
                    <div class="icon-box" style="background: var(--clr-glass-52); color: var(--clr-text-lo); width: 64px; height: 64px; margin-bottom: var(--sp-4);">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="8" y1="8" x2="14" y2="14"></line><line x1="14" y1="8" x2="8" y2="14"></line></svg>
                    </div>
                    <h3 class="typography-h3 mb-2">No matches for "${Utils.sanitizeString(this._currentQuery)}"</h3>
                    <p class="typography-body text-muted mb-6">Check your spelling or use the camera to read the label.</p>
                    <button class="btn btn-secondary w-full max-w-md" onclick="window.location.hash='#/scan'">Scan Label Instead &rarr;</button>
                </div>
            `;
            return;
        }

        // Gather real-time clash metrics for preview displays
        const activeUserMeds = await dbEngine.getAllMedications();

        let htmlPayload = '';
        for (const drug of validDrugs) {
            
            // Interaction Preview Engine Check
            let clashCount = 0;
            if (activeUserMeds && activeUserMeds.length > 0 && typeof interactionGraph !== 'undefined') {
                for (const active of activeUserMeds) {
                    const clash = interactionGraph.checkInteraction(drug.name, active.name);
                    if (clash && clash.severity !== 'none') clashCount++;
                }
            }

            let badgeHtml = '';
            const categoryLower = (drug.category || '').toLowerCase();
            if (categoryLower.includes('antibiotic')) badgeHtml = `<span class="badge badge--success">Antibiotic</span>`;
            else if (categoryLower.includes('pain') || categoryLower.includes('analgesic')) badgeHtml = `<span class="badge badge--danger">Analgesic</span>`;
            else if (categoryLower.includes('statin')) badgeHtml = `<span class="badge badge--warn">Statin</span>`;
            else badgeHtml = `<span class="badge badge--purple">${drug.category || 'Medication'}</span>`;

            htmlPayload += `
                <div class="card flex-col">
                    <div class="flex-between mb-2">
                        <h3 class="typography-h3 text-hi">${Utils.sanitizeString(drug.name)}</h3>
                        ${badgeHtml}
                    </div>
                    <p class="typography-caption text-muted mb-4">${Utils.sanitizeString(drug.genericName || '')}</p>
                    
                    <p class="typography-body text-muted mb-4" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                        ${Utils.sanitizeString(drug.notes || drug.description || 'Standard pharmaceutical preparation. Consult prescribing physician for detailed administrative protocols.')}
                    </p>

                    <div class="flex-between mt-auto pt-4" style="border-top: 1px solid var(--clr-border-80);">
                        ${clashCount > 0 
                            ? `<div class="badge badge--danger" style="padding: 4px 8px;">⚠️ ${clashCount} Clash</div>` 
                            : `<div class="badge badge--success" style="padding: 4px 8px;">Safe</div>`
                        }
                        <button class="btn btn-primary btn-add-med" style="height: 36px; padding: 0 16px; font-size: 14px;" data-json='${Utils.sanitizeString(JSON.stringify(drug))}'>
                            Add to List
                        </button>
                    </div>
                </div>
            `;
        }

        resultsArea.innerHTML = htmlPayload;
        
        // Bind dynamic action buttons mapped inside the rendered block
        const addBtns = Utils.qsAll('.btn-add-med', resultsArea);
        addBtns.forEach(btn => {
            Utils.on(btn, 'click', (e) => {
                try {
                    const rawData = e.currentTarget.getAttribute('data-json');
                    const parsedDrug = JSON.parse(rawData);
                    this._showAddModal(parsedDrug);
                } catch (err) {
                    console.error('Failed to parse drug payload attached to action button.', err);
                }
            });
        });
    }

    /**
     * Mounts structural ghost representations while waiting for network/matrix hydration.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderSkeletons(container) {
        const resultsArea = Utils.qs('#search-results-area', container);
        if (!resultsArea) return;
        
        resultsArea.innerHTML = Array(3).fill(`
            <div class="card flex-col" style="padding: var(--sp-4);">
                <div class="flex-between mb-4">
                    <div class="skeleton" style="width: 140px; height: 24px; border-radius: 4px;"></div>
                    <div class="skeleton" style="width: 80px; height: 20px; border-radius: 99px;"></div>
                </div>
                <div class="skeleton-text"></div>
                <div class="skeleton-text w-full"></div>
                <div class="skeleton-text" style="width: 60%;"></div>
            </div>
        `).join('');
    }

    /**
     * Constructs the visual DOM string for the idle default state.
     * @private
     * @returns {string}
     */
    static _getEmptyStateHtml() {
        const popular = ['Metformin', 'Lisinopril', 'Amoxicillin', 'Ibuprofen', 'Omeprazole', 'Atorvastatin'];
        
        return `
            <div class="empty-state">
                <div class="icon-box" style="background: var(--clr-glass-65); color: var(--clr-text-hi); width: 64px; height: 64px; margin-bottom: var(--sp-4); box-shadow: var(--shadow-sm);">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                </div>
                <h3 class="typography-h3 mb-2">Popular Searches</h3>
                
                <div class="preset-grid">
                    ${popular.map(drug => 
                        `<button class="pill pill-neutral btn-preset" data-drug="${drug}">${drug}</button>`
                    ).join('')}
                </div>
            </div>
        `;
    }

    /**
     * Activates physical closures on the idle-state categorical pill buttons.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindPresetButtons(container) {
        const presetBtns = Utils.qsAll('.btn-preset', container);
        const inputField = Utils.qs('#search-input', container);
        
        presetBtns.forEach(btn => {
            Utils.on(btn, 'click', (e) => {
                const term = e.currentTarget.getAttribute('data-drug');
                if (inputField) {
                    inputField.value = term;
                    const clearBtn = Utils.qs('#search-clear-btn', container);
                    if (clearBtn) clearBtn.classList.add('search-clear-btn--visible');
                }
                this._currentQuery = term;
                this._executeSearch(container);
            });
        });
    }

    // ============================================================================
    // MODAL INJECTION & PHARMACOLOGICAL INGESTION
    // ============================================================================

    /**
     * Builds and appends a specialized data-entry overlay to document.body.
     * Executes isolated database operations distinct from the root viewport.
     * @private
     * @param {Object} drug - The contextual pharmaceutical entity being attached.
     */
    static _showAddModal(drug) {
        const modalId = 'medcare-custom-add-modal';
        const existingModal = document.getElementById(modalId);
        if (existingModal) existingModal.remove();

        const overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.className = 'add-modal-overlay hidden';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-modal', 'true');

        const todayStr = new Date().toISOString().split('T')[0];

        overlay.innerHTML = `
            <div class="add-modal-content">
                <div class="flex-between mb-4">
                    <div>
                        <h2 class="typography-h2" style="margin-bottom: 2px;">Add Medication</h2>
                        <p class="typography-caption text-muted">${Utils.sanitizeString(drug.name)} · ${Utils.sanitizeString(drug.genericName || 'Standard')}</p>
                    </div>
                    <button id="modal-close-icon" class="btn-icon" style="width: 36px; height: 36px; border: none; box-shadow: none; background: transparent;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </div>

                <div class="input-group">
                    <label class="typography-label">Dosage <span class="text-danger">*</span></label>
                    <input type="text" id="modal-dosage" class="input-field" placeholder="e.g. 500mg" required autocomplete="off">
                </div>

                <div class="input-group">
                    <label class="typography-label">Frequency</label>
                    <select id="modal-frequency" class="input-field select-field">
                        <option value="once_daily" selected>Once daily</option>
                        <option value="twice_daily">Twice daily</option>
                        <option value="thrice_daily">Thrice daily</option>
                        <option value="as_needed">As needed</option>
                    </select>
                </div>

                <div class="input-group">
                    <label class="typography-label">Start Date</label>
                    <input type="date" id="modal-start-date" class="input-field" value="${todayStr}">
                </div>

                <div class="input-group mb-6">
                    <label class="typography-label">Notes (Optional)</label>
                    <textarea id="modal-notes" class="input-field" style="height: 80px; padding-top: 12px; resize: none;" placeholder="With food, in the morning..."></textarea>
                </div>

                <div class="flex gap-4">
                    <button id="modal-cancel-btn" class="btn btn-ghost flex-1">Cancel</button>
                    <button id="modal-submit-btn" class="btn btn-primary flex-1" style="flex: 2;">Confirm Addition</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Execute entrance animation
        requestAnimationFrame(() => {
            overlay.classList.remove('hidden');
        });

        const closeFunc = () => {
            overlay.classList.add('hidden');
            setTimeout(() => overlay.remove(), 250); // Maps to --time-enter CSS variable
        };

        Utils.qs('#modal-close-icon', overlay).addEventListener('click', closeFunc);
        Utils.qs('#modal-cancel-btn', overlay).addEventListener('click', closeFunc);
        
        // Close on clicking backdrop boundaries
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeFunc();
        });

        const submitBtn = Utils.qs('#modal-submit-btn', overlay);
        submitBtn.addEventListener('click', async () => {
            const dosageField = Utils.qs('#modal-dosage', overlay);
            const dosageValue = dosageField.value.trim();

            if (!dosageValue) {
                dosageField.focus();
                Utils.showToast('Please specify a dosage amount.', 'warn');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                // Determine scheduled telemetry arrays based on frequency drop-down
                const freq = Utils.qs('#modal-frequency', overlay).value;
                let scheduledTimes = [];
                if (freq === 'once_daily') scheduledTimes = ['09:00'];
                else if (freq === 'twice_daily') scheduledTimes = ['09:00', '21:00'];
                else if (freq === 'thrice_daily') scheduledTimes = ['08:00', '14:00', '20:00'];

                const medPayload = {
                    id: `med_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
                    name: drug.name,
                    genericName: drug.genericName || '',
                    category: drug.category || 'default',
                    dosage: dosageValue,
                    frequency: freq,
                    scheduledTimes: scheduledTimes,
                    startDate: Utils.qs('#modal-start-date', overlay).value,
                    endDate: null,
                    notes: Utils.qs('#modal-notes', overlay).value.trim(),
                    activeDays: ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
                };

                // Commit to hardware database matrix
                await dbEngine.addMedication(medPayload);

                // Publish action across synchronous memory bus
                globalStore.dispatch('MEDICATIONS/ADD', medPayload);

                Utils.showToast(`${drug.name} added to schedule successfully.`, 'success');
                closeFunc();

            } catch (dbError) {
                console.error('[SearchManual:Modal] Failed to commit structural medication layer:', dbError);
                Utils.showToast('Database error occurred. Matrix rejected save.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Confirm Addition';
            }
        });
    }
}