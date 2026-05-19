/**
 * @fileoverview Medication Detail & Drug Monograph View for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Hardware-Accelerated 3D Visualizations, Local State Engineering.
 * * Rich detail view utilizing ThreeDRenderer for pharmacokinetic curve simulation,
 * local databases for adherence logs, and dynamic modal forms for scheduling mutations.
 */

import { globalRouter } from '../core/router.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { interactionGraph } from '../services/InteractionGraph.js';
import { threeDRenderer } from '../services/ThreeDRenderer.js';
import { Utils } from '../core/utils.js';

// ============================================================================
// CONSTANTS & LOGICAL SCHEMAS
// ============================================================================
const LOOKBACK_DAYS_HISTORY = 14;
const INTERACTION_RENDERING_LIMIT = 5;
const CANVAS_STABILIZATION_TIMEOUT_MS = 200;
const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;

/**
 * @typedef {Object} DoseLogEntry
 * @property {string} id
 * @property {string} medicationId
 * @property {string} scheduledAt - ISO Timestamp string.
 * @property {string} takenAt - ISO Timestamp string or null.
 * @property {'taken'|'missed'|'skipped'|'pending'} status
 * @property {string} notes
 */

// ============================================================================
// COMPONENT CLASS IMPLEMENTATION
// ============================================================================

export default class MedicationDetail {
    /** @private {Object|null} Active drug document structure mapped from IndexedDB */
    static _medication = null;
    /** @private {DoseLogEntry[]} Chronological list of historical execution events */
    static _logs = [];
    /** @private {Object[]} Cross-referenced system inventory tracking drugs */
    static _otherMeds = [];
    /** @private {string|null} Auto-save tracking hash signature to prevent redundant DB writes */
    static _lastSavedNotesHash = null;

    /**
     * Entry hook for the Single Page Application router pipeline.
     * @param {HTMLElement} container - The root viewport anchor point.
     * @param {Object} params - Unified dynamic parameters mapping layer.
     * @param {string} params.id - The primary key of the target medication record.
     * @returns {Promise<void>}
     */
    static async render(container, params) {
        if (!container || !params || !params.id) {
            console.error('[MedicationDetail] Ingress rejected: Missing structural routing parameters.');
            globalRouter.navigate('#/dashboard');
            return;
        }

        try {
            await this._loadDataMetrics(params.id);

            if (!this._medication) {
                Utils.showToast('Medication record is unavailable or has been deleted.', 'error');
                globalRouter.navigate('#/dashboard');
                return;
            }

            this._renderMasterLayout(container);
            this._bindDynamicCoreEvents(container);
            this._initializeThreeDContext(container);

        } catch (lifecycleError) {
            console.error('[MedicationDetail] View rendering crashed:', lifecycleError);
            Utils.showToast('Failed to load medication monograph files.', 'error');
            globalRouter.navigate('#/dashboard');
        }
    }

    /**
     * Executes data retrieval logic from isolated edge processing node databases.
     * @private
     * @param {string} medId - Target database index key.
     * @returns {Promise<void>}
     */
    static async _loadDataMetrics(medId) {
        // Query tasks executed in a concurrent block for performance enhancement
        const [targetMed, allLogs, allInventory] = await Promise.all([
            dbEngine.getMedication ? await dbEngine.getMedication(medId) : (await dbEngine.getAllMedications()).find(m => m.id === medId),
            dbEngine.getAllDoseLogs ? await dbEngine.getAllDoseLogs() : [],
            dbEngine.getAllMedications()
        ]);

        this._medication = targetMed || null;
        
        if (this._medication) {
            this._logs = allLogs.filter(log => log.medicationId === medId);
            this._otherMeds = allInventory.filter(med => med.id !== medId);
            this._lastSavedNotesHash = this._medication.notes || '';
        }
    }

    /**
     * Injects complete, production-grade markup mapping your precise visual language.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderMasterLayout(container) {
        const med = this._medication;
        const nextDoseString = this._calculateNextDoseCountdown();

        // Map visual semantic tags based on pharmacological classifications
        let categoryClass = 'badge--purple';
        const categoryLower = (med.category || 'default').toLowerCase();
        if (categoryLower.includes('antibiotic')) categoryClass = 'badge--success';
        else if (categoryLower.includes('hypertensive') || categoryLower.includes('cardio')) categoryClass = 'badge--info';
        else if (categoryLower.includes('statin') || categoryLower.includes('lipid')) categoryClass = 'badge--warn';
        else if (categoryLower.includes('analgesic') || categoryLower.includes('pain')) categoryClass = 'badge--danger';

        container.innerHTML = `
            <div class="view-panel view-enter flex-col gap-4">
                
                <div class="flex items-center justify-between w-full mb-2">
                    <button id="med-detail-back-btn" class="btn-icon" aria-label="Return to previous screen" style="border-radius: var(--radius-full);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                    </button>
                    <span class="typography-label">Drug Monograph</span>
                    <button id="med-detail-delete-btn" class="btn-icon text-danger" aria-label="Delete this medication" style="border-radius: var(--radius-full); border-color: rgba(232,0,58,0.2); background: rgba(232,0,58,0.05);">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>

                <div class="glass-strong flex-col gap-4">
                    <div class="flex justify-between items-start">
                        <div class="flex-col">
                            <h1 class="typography-display text-hi" style="font-size: var(--fs-3xl);">${Utils.sanitizeString(med.name)}</h1>
                            <p class="typography-caption text-muted mt-1" style="font-family:'Space Grotesk'; font-weight:500;">${Utils.sanitizeString(med.genericName || 'Generic Formulation Missing')}</p>
                        </div>
                        <span class="badge ${categoryClass}">${Utils.sanitizeString(med.category || 'General')}</span>
                    </div>

                    <div class="divider" style="margin: 4px 0;"></div>

                    <div class="flex items-center justify-between gap-2 text-center">
                        <div class="metric-card" style="flex:1; padding: var(--sp-1); background: rgba(0,0,0,0.02); border-radius: var(--radius-md);">
                            <span class="typography-label" style="font-size:10px;">Dosage</span>
                            <p class="list-title mt-1" style="font-size:15px; margin:0;">${Utils.sanitizeString(med.dosage)}</p>
                        </div>
                        <div class="metric-card" style="flex:1; padding: var(--sp-1); background: rgba(0,0,0,0.02); border-radius: var(--radius-md);">
                            <span class="typography-label" style="font-size:10px;">Frequency</span>
                            <p class="list-title mt-1" style="font-size:15px; margin:0; text-transform: capitalize;">${Utils.sanitizeString(med.frequency).replace('_', ' ')}</p>
                        </div>
                        <div class="metric-card" style="flex:1; padding: var(--sp-1); background: rgba(0,0,0,0.02); border-radius: var(--radius-md);">
                            <span class="typography-label" style="font-size:10px;">Next Window</span>
                            <p class="list-title mt-1 text-accent" style="font-size:15px; margin:0;">${nextDoseString}</p>
                        </div>
                    </div>

                    <button id="med-detail-edit-btn" class="btn btn-secondary w-full" style="height:44px; font-size:14px; margin-top:4px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        Modify Schedule Parameters
                    </button>
                </div>

                <div class="glass-standard" style="padding: 0; overflow: hidden; height: 220px;">
                    <div id="webgl-canvas-wrapper" style="width:100%; height:100%; position:relative;">
                        <canvas id="medication-biometrics-canvas" style="width:100%; height:100%; display:block;"></canvas>
                        <div class="typography-caption text-muted" style="position:absolute; bottom:var(--sp-2); left:var(--sp-3); pointer-events:none; font-size:11px; font-weight:600; background:rgba(255,255,255,0.7); padding: 2px 8px; border-radius:var(--radius-sm);">
                            Plasma Concentration Matrix (Estimated 24h)
                        </div>
                    </div>
                    <div id="webgl-fallback-card" class="hidden flex-col items-center justify-center h-full p-6 text-center">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-lo)" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="21.5"></rect><line x1="2" y1="2" x2="22" y2="22"></line></svg>
                        <p class="typography-caption text-muted mt-2">3D molecular visualization is suspended on this legacy hardware context.</p>
                    </div>
                </div>

                <div class="glass-standard flex-col gap-2">
                    <h2 class="typography-h2" style="margin: 0;">Compliance Track</h2>
                    <div class="flex items-center gap-1" style="overflow-x: auto; padding-bottom: 4px; margin-left: calc(var(--sp-5) * -1); margin-right: calc(var(--sp-5) * -1); padding-left: var(--sp-5); padding-right: var(--sp-5); scrollbar-width: none; -webkit-overflow-scrolling: touch;">
                        ${this._generateAdherenceCalendarStrip()}
                    </div>
                </div>

                <div class="glass-standard flex-col gap-3">
                    <div class="flex justify-between items-center">
                        <h2 class="typography-h2" style="margin: 0;">Routine Alarms</h2>
                        <div class="flex gap-1">${this._generateActiveDaysPills()}</div>
                    </div>
                    
                    <div class="flex flex-wrap gap-2">
                        ${med.scheduledTimes.map(time => `
                            <span class="pill pill-purple" style="font-size:11px; padding: 4px 10px;">
                                ⏰ ${this._formatTwelveHourTime(time)}
                            </span>
                        `).join('')}
                    </div>

                    <button id="med-detail-log-btn" class="btn btn-primary w-full" style="height:48px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                        Record Administrative Event
                    </button>
                </div>

                <div class="glass-standard flex-col gap-2">
                    <h2 class="typography-h2" style="margin: 0;">Clinical Interaction Safety</h2>
                    <div id="med-detail-interactions-box" class="flex-col gap-2 mt-1">
                        </div>
                </div>

                <div class="glass-standard flex-col gap-2">
                    <label class="typography-label text-hi" for="med-detail-notes-area">Operator Administrative Directives</label>
                    <textarea id="med-detail-notes-area" class="input-field" style="height:100px; padding:12px; resize:none; font-size:14px; line-height:1.5;" placeholder="Specify localized instructions (e.g. swallow with full glass of water, avoid citrus interactions)...">${Utils.sanitizeString(med.notes || '')}</textarea>
                    <div class="flex items-center justify-between text-muted" style="font-size:11px; padding-top:2px;">
                        <span>Data locked locally</span>
                        <span id="notes-save-status">Changes auto-saved on field defocus</span>
                    </div>
                </div>

            </div>
        `;
    }

    /**
     * Attaches structural events ensuring runtime pipeline compliance.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindDynamicCoreEvents(container) {
        const backBtn = Utils.qs('#med-detail-back-btn', container);
        const deleteBtn = Utils.qs('#med-detail-delete-btn', container);
        const editBtn = Utils.qs('#med-detail-edit-btn', container);
        const logBtn = Utils.qs('#med-detail-log-btn', container);
        const notesArea = Utils.qs('#med-detail-notes-area', container);

        if (backBtn) Utils.on(backBtn, 'click', () => globalRouter.back());
        if (editBtn) Utils.on(editBtn, 'click', () => this._showEditModal(container));
        if (logBtn) Utils.on(logBtn, 'click', () => this._showQuickLogModal(container));
        
        if (deleteBtn) {
            Utils.on(deleteBtn, 'click', () => {
                Utils.showModal(
                    'Purge Schedule Block',
                    `Are you certain you wish to completely wipe ${this._medication.name} and all associated telemetry tracking arrays from your local hard disk files? This action is cryptographically final.`,
                    async () => { await this._executeDestructionSequence(container); }
                );
            });
        }

        if (notesArea) {
            Utils.on(notesArea, 'blur', async (e) => {
                const updatedText = e.target.value.trim();
                if (updatedText === this._lastSavedNotesHash) return; // Terminate if execution would be redundant

                const statusLabel = Utils.qs('#notes-save-status', container);
                if (statusLabel) statusLabel.textContent = 'Synchronizing blocks...';

                try {
                    this._medication.notes = updatedText;
                    
                    // Commit structural delta modification to disk ledger
                    await dbEngine.updateMedication(this._medication.id, { notes: updatedText });
                    
                    // Broadcast mutation across local reactive data layers
                    globalStore.dispatch('MEDICATIONS/UPDATE', this._medication);
                    
                    this._lastSavedNotesHash = updatedText;
                    if (statusLabel) statusLabel.textContent = 'Changes auto-saved';
                    Utils.showToast('Notes synchronized successfully.', 'success');

                } catch (writeError) {
                    console.error('[MedicationDetail:Notes] Local I/O error thrown:', writeError);
                    if (statusLabel) statusLabel.textContent = 'Write sync suspended';
                    Utils.showToast('Failed to commit notes to disk ledger.', 'error');
                }
            });
        }

        // Bind interactive popover tooltips on compliance elements
        const calendarRow = Utils.qs('.view-panel', container);
        if (calendarRow) {
            Utils.on(calendarRow, 'click', (e) => {
                const targetDot = e.target.closest('.calendar-strip-dot');
                if (!targetDot) return;

                const readableLogString = targetDot.getAttribute('data-log-summary');
                Utils.showToast(readableLogString, 'info');
            });
        }

        // Execute background task checking for pharmaceutical drug interaction threats
        this._calculateInteractionsAsync(container);
    }

    /**
     * Instantiates graphic components via the global ThreeDRenderer module wrapper.
     * @private
     * @param {HTMLElement} container 
     */
    static _initializeThreeDContext(container) {
        setTimeout(() => {
            const canvas = Utils.qs('#medication-biometrics-canvas', container);
            const wrapper = Utils.qs('#webgl-canvas-wrapper', container);
            const fallback = Utils.qs('#webgl-fallback-card', container);

            if (!canvas || !wrapper) return;

            try {
                // Hard reset existing context links before creating ones
                threeDRenderer.destroy();
                
                threeDRenderer.init(canvas);
                
                // If initializing drops structural parameters, WebGL verification threw false inside the module
                if (!threeDRenderer._scene) {
                    if (wrapper) wrapper.classList.add('hidden');
                    if (fallback) fallback.classList.remove('hidden');
                    return;
                }

                // Bind states to transform rendering pipelines matching target molecule specs
                threeDRenderer.setMedication(this._medication, this._logs);

            } catch (webGlPipelineCrash) {
                console.warn('[MedicationDetail] Graphical component execution halted:', webGlPipelineCrash);
                if (wrapper) wrapper.classList.add('hidden');
                if (fallback) fallback.classList.remove('hidden');
            }
        }, CANVAS_STABILIZATION_TIMEOUT_MS);
    }

    /**
     * Wipes a complete tracking matrix block and returns to home panels.
     * @private
     * @param {HTMLElement} container 
     */
    static async _executeDestructionSequence(container) {
        try {
            this.destroy(); // Sever components and listeners

            await dbEngine.deleteMedication(this._medication.id);
            globalStore.dispatch('MEDICATIONS/REMOVE', this._medication.id);
            
            Utils.showToast('Medication and all telemetry tracks wiped clean.', 'success');
            globalRouter.navigate('#/dashboard');

        } catch (ioWipeError) {
            console.error('[MedicationDetail:Destruction] Transaction rolled back:', ioWipeError);
            Utils.showToast('Failed to cleanly drop structural records from storage nodes.', 'error');
        }
    }

    // ============================================================================
    // STRING MATH & TELEMETRY RENDERING PIPELINES
    // ============================================================================

    /**
     * Determines hours/minutes remaining until the closest chronological reminder trigger.
     * @private
     * @returns {string} Human readable delta translation.
     */
    static _calculateNextDoseCountdown() {
        if (!this._medication || !this._medication.scheduledTimes || this._medication.scheduledTimes.length === 0) {
            return 'As Needed';
        }

        const now = new Date();
        const currentMinutes = now.getHours() * 60 + now.getMinutes();
        
        let closestTargetMinutes = Infinity;

        // Parse absolute daily timeline markers (HH:MM)
        this._medication.scheduledTimes.forEach(timeString => {
            const [hours, minutes] = timeString.split(':').map(Number);
            const targetMinutes = hours * 60 + minutes;

            if (targetMinutes > currentMinutes && targetMinutes < closestTargetMinutes) {
                closestTargetMinutes = targetMinutes;
            }
        });

        // Loop past midnight boundaries if no target elements remain today
        if (closestTargetMinutes === Infinity) {
            this._medication.scheduledTimes.forEach(timeString => {
                const [hours, minutes] = timeString.split(':').map(Number);
                const targetMinutes = hours * 60 + minutes + 1440; // Add full day min mapping block

                if (targetMinutes < closestTargetMinutes) {
                    closestTargetMinutes = targetMinutes;
                }
            });
        }

        const remMinutes = closestTargetMinutes - currentMinutes;
        const outHours = Math.floor(remMinutes / 60);
        const outMin = remMinutes % 60;

        return outHours > 0 ? `${outHours}h ${outMin}m` : `${outMin}m`;
    }

    /**
     * Assembles string data loops converting strings into 12-hour values.
     * @private
     * @param {string} 24hString - Format "HH:MM"
     * @returns {string} Format "H:MM AM"
     */
    static _formatTwelveHourTime(timeString) {
        if (!timeString || !timeString.includes(':')) return '00:00';
        const [hours, minutes] = timeString.split(':').map(Number);
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 === 0 ? 12 : hours % 12;
        return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
    }

    /**
     * Scans lookback constraints rendering chronological day element matrices.
     * @private
     * @returns {string} Raw HTML string stream tracking compliance vectors.
     */
    static _generateAdherenceCalendarStrip() {
        let htmlBuffer = '';
        const today = new Date();
        const activeDateStringsMap = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

        // Build arrays iterating reverse chronological lookback frames
        for (let i = LOOKBACK_DAYS_HISTORY - 1; i >= 0; i--) {
            const indexDate = new Date(today.getTime() - i * MILLISECONDS_IN_DAY);
            const year = indexDate.getFullYear();
            const month = String(indexDate.getMonth() + 1).padStart(2, '0');
            const dateNum = String(indexDate.getDate()).padStart(2, '0');
            const isoDayStringKey = `${year}-${month}-${dateNum}`;

            const dayLetter = activeDateStringsMap[indexDate.getDay()];
            const displayDayNum = indexDate.getDate();

            // Locate corresponding log structures
            const dayLogs = this._logs.filter(log => {
                const targetString = (log.scheduledAt || log.takenAt || '').split('T')[0];
                return targetString === isoDayStringKey;
            });

            // Evaluate conditional visual configuration state markers
            let visualStatusClass = 'status-dot--offline'; // Default grey pending state
            let summaryText = `No events recorded for ${isoDayStringKey}`;

            if (dayLogs.length > 0) {
                const totalTaken = dayLogs.filter(l => l.status === 'taken').length;
                const totalMissed = dayLogs.filter(l => l.status === 'missed').length;

                if (totalMissed > 0) {
                    visualStatusClass = 'status-dot--error'; // Red fault indicator
                    summaryText = `${totalMissed} doses missed on ${isoDayStringKey}`;
                } else if (totalTaken > 0) {
                    visualStatusClass = 'status-dot--online'; // Green execution verified
                    summaryText = `All ${totalTaken} doses recorded successfully.`;
                }
            }

            // High-contrast highlighting indicating the current epoch node
            const isToday = i === 0;
            const contextOutlineStyle = isToday ? 'outline: 2px solid var(--clr-accent); outline-offset: 2px;' : '';

            htmlBuffer += `
                <div class="calendar-strip-dot flex-col items-center" data-log-summary="${summaryText}" style="flex-shrink:0; width:36px; padding: 4px; border-radius:var(--radius-sm); background:rgba(0,0,0,0.02); ${contextOutlineStyle} cursor:pointer;">
                    <span class="typography-caption text-muted" style="font-size:10px; font-weight:700;">${dayLetter}</span>
                    <div class="status-dot ${visualStatusClass}" style="width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:700; color:${visualStatusClass === 'status-dot--offline' ? 'var(--clr-text-lo)' : '#FFFFFF'}; margin: 2px 0;">
                        ${displayDayNum}
                    </div>
                </div>
            `;
        }

        return htmlBuffer;
    }

    /**
     * Maps week parameter fields into small text capsules.
     * @private
     * @returns {string}
     */
    static _generateActiveDaysPills() {
        const fullWeekMap = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
        const activeList = this._medication.activeDays || [];

        return fullWeekMap.map(day => {
            const isAssigned = activeList.includes(day);
            const styleString = isAssigned 
                ? 'background: var(--clr-pill-orange-bg); color: var(--clr-pill-orange-text); border: 1px solid var(--clr-pill-orange-brd);' 
                : 'opacity: 0.35; background: transparent; border: 1px solid var(--clr-border-inner); color: var(--clr-text-lo);';
            return `
                <span style="font-size:9px; font-weight:700; padding:2px 6px; border-radius:4px; text-transform:uppercase; ${styleString}">
                    ${day.substring(0, 1)}
                </span>
            `;
        }).join('');
    }

    /**
     * Cross-references current generic labels across localized interaction matrices.
     * Runs asynchronously inside the layout load loop to keep page mounting smooth.
     * @private
     * @param {HTMLElement} container 
     */
    static async _calculateInteractionsAsync(container) {
        const box = Utils.qs('#med-detail-interactions-box', container);
        if (!box) return;

        try {
            if (this._otherMeds.length === 0) {
                box.innerHTML = `<p class="typography-caption text-muted">Standalone prescription profile. No other drugs are registered to test conflict intersections.</p>`;
                return;
            }

            const activeDrugName = this._medication.genericName || this._medication.name;
            const comparisonMatrixNames = this._otherMeds.map(med => med.genericName || med.name);

            // Execute local algorithmic checks against our mapped JSON data graphs
            const clashingNodes = [];
            for (const otherName of comparisonMatrixNames) {
                const correlationBlock = interactionGraph.checkInteraction(activeDrugName, otherName);
                if (correlationBlock && correlationBlock.severity !== 'none') {
                    clashingNodes.push(correlationBlock);
                }
            }

            if (clashingNodes.length === 0) {
                box.innerHTML = `
                    <div class="all-clear-banner" style="margin:0; padding: var(--sp-2);">
                        <span style="font-size:13px; color: var(--clr-pill-success-text);">✓ Fully clear of conflict risks with current medical profile assets.</span>
                    </div>
                `;
                return;
            }

            // Slice out limits to maintain view compression balance
            const displaySubset = clashingNodes.slice(0, INTERACTION_RENDERING_LIMIT);
            
            let elementsBufferHtml = '';
            displaySubset.forEach(ix => {
                const severeClass = (ix.severity === 'high' || ix.severity === 'severe') ? 'interaction-row--danger' : 'interaction-row--warn';
                const labelColor = (ix.severity === 'high' || ix.severity === 'severe') ? 'var(--clr-danger)' : 'var(--clr-warn)';
                
                elementsBufferHtml += `
                    <div class="interaction-row ${severeClass}" style="margin:0; padding:var(--sp-2); align-items:center;">
                        <div class="flex-col" style="flex:1;">
                            <span class="typography-label" style="color:${labelColor}; font-size:10px;">${ix.severity.toUpperCase()} CLASH</span>
                            <h4 class="typography-body text-hi" style="font-size:13px; font-weight:700; margin: 2px 0 0 0;">${Utils.sanitizeString(ix.drugA)} ↔ ${Utils.sanitizeString(ix.drugB)}</h4>
                        </div>
                    </div>
                `;
            });

            if (clashingNodes.length > INTERACTION_RENDERING_LIMIT) {
                elementsBufferHtml += `
                    <button id="med-detail-view-all-ix" class="btn btn-ghost w-full" style="height:32px; font-size:12px; margin-top:4px;">
                        View complete verification arrays (${clashingNodes.length} interactions) &rarr;
                    </button>
                `;
            }

            box.innerHTML = elementsBufferHtml;

            // Bind forward mapping hook if extended reports are needed
            const trackingButtonNode = Utils.qs('#med-detail-view-all-ix', container);
            if (trackingButtonNode) {
                Utils.on(trackingButtonNode, 'click', () => globalRouter.navigate('#/interactions'));
            }

        } catch (graphFailureException) {
            console.warn('[MedicationDetail:Safety] Adjacency lookup process dropped context:', graphFailureException);
            box.innerHTML = `<p class="typography-caption text-danger">Safety validation layer encountered an execution runtime exception.</p>`;
        }
    }

    // ============================================================================
    // MODAL WINDOW INTERFACE INJECTIONS
    // ============================================================================

    /**
     * Builds and appends a specialized manual logging sheet directly to document.body.
     * @private
     * @param {HTMLElement} container 
     */
    static _showQuickLogModal(container) {
        const modalOverlay = Utils.createElement('div', ['add-modal-overlay']);
        modalOverlay.setAttribute('role', 'dialog');
        modalOverlay.setAttribute('aria-modal', 'true');

        const timestampStr = new Date().toISOString().slice(0, 16);

        modalOverlay.innerHTML = `
            <div class="add-modal-content">
                <div class="flex-between mb-4">
                    <h2 class="typography-h2" style="margin:0;">Record Adherence Event</h2>
                    <button type="button" class="btn-close-modal btn-icon" style="width:32px; height:32px; border:none; background:transparent; box-shadow:none;">✕</button>
                </div>

                <div class="input-group">
                    <label class="typography-label">Status Classification</label>
                    <select id="log-modal-status" class="input-field select-field">
                        <option value="taken" selected>Taken (Standard Protocol)</option>
                        <option value="missed">Missed (Omission Action)</option>
                        <option value="skipped">Skipped (Clinical Deviation)</option>
                    </select>
                </div>

                <div class="input-group">
                    <label class="typography-label">Execution Time Marker</label>
                    <input type="datetime-local" id="log-modal-time" class="input-field" value="${timestampStr}">
                </div>

                <div class="input-group mb-6">
                    <label class="typography-label">Event Directives / Notes</label>
                    <input type="text" id="log-modal-notes" class="input-field" placeholder="e.g. Delayed due to food constraints">
                </div>

                <div class="flex gap-4">
                    <button type="button" class="btn-cancel-modal btn-ghost flex-1">Cancel</button>
                    <button type="button" id="log-modal-submit-btn" class="btn btn-primary flex-1" style="flex:2;">Log Verification Matrix</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const closeModalClosure = () => {
            modalOverlay.classList.add('hidden');
            setTimeout(() => modalOverlay.remove(), 250);
        };

        Utils.on(Utils.qs('.btn-close-modal', modalOverlay), 'click', closeModalClosure);
        Utils.on(Utils.qs('.btn-cancel-modal', modalOverlay), 'click', closeModalClosure);
        Utils.on(modalOverlay, 'click', (e) => { if (e.target === modalOverlay) closeModalClosure(); });

        const submitBtn = Utils.qs('#log-modal-submit-btn', modalOverlay);
        Utils.on(submitBtn, 'click', async () => {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Writing block...';

            try {
                const logPayload = {
                    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    medicationId: this._medication.id,
                    scheduledAt: new Date(Utils.qs('#log-modal-time', modalOverlay).value).toISOString(),
                    takenAt: Utils.qs('#log-modal-status', modalOverlay).value === 'taken' ? new Date().toISOString() : null,
                    status: Utils.qs('#log-modal-status', modalOverlay).value,
                    notes: Utils.qs('#log-modal-notes', modalOverlay).value.trim()
                };

                // Inject into local log index tables
                if (dbEngine.addDoseLog) {
                    await dbEngine.addDoseLog(logPayload);
                } else {
                    // Fallback routing handling variant maps if bulk engine lacks specific pointers
                    await dbEngine.db.table('doseLogs').add(logPayload);
                }

                Utils.showToast('Adherence log successfully mapped to local disk block.', 'success');
                closeModalClosure();

                // Re-trigger lifecycle sequence to compute updated metrics onto active layers
                await this.render(container, { id: this._medication.id });

            } catch (ioWriteFaultException) {
                console.error('[MedicationDetail:QuickLog] Failure writing entry payload:', ioWriteFaultException);
                Utils.showToast('Data write transaction rolled back.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Log Verification Matrix';
            }
        });
    }

    /**
     * Mounts a full parameter schema management panel.
     * @private
     * @param {HTMLElement} container 
     */
    static _showEditModal(container) {
        const modalOverlay = Utils.createElement('div', ['add-modal-overlay']);
        modalOverlay.setAttribute('role', 'dialog');
        modalOverlay.setAttribute('aria-modal', 'true');

        const med = this._medication;

        modalOverlay.innerHTML = `
            <div class="add-modal-content">
                <div class="flex-between mb-4">
                    <h2 class="typography-h2" style="margin:0;">Modify Configuration</h2>
                    <button type="button" class="btn-close-modal btn-icon" style="width:32px; height:32px; border:none; background:transparent; box-shadow:none;">✕</button>
                </div>

                <div class="input-group">
                    <label class="typography-label">Clinical Formula Identifier</label>
                    <input type="text" id="edit-modal-name" class="input-field" value="${Utils.sanitizeString(med.name)}" required autocomplete="off">
                </div>

                <div class="input-group">
                    <label class="typography-label">Target Mass Dosage</label>
                    <input type="text" id="edit-modal-dosage" class="input-field" value="${Utils.sanitizeString(med.dosage)}" required autocomplete="off">
                </div>

                <div class="input-group mb-6">
                    <label class="typography-label">Frequency Category</label>
                    <select id="edit-modal-frequency" class="input-field select-field">
                        <option value="once_daily" ${med.frequency === 'once_daily' ? 'selected' : ''}>Once daily</option>
                        <option value="twice_daily" ${med.frequency === 'twice_daily' ? 'selected' : ''}>Twice daily</option>
                        <option value="thrice_daily" ${med.frequency === 'thrice_daily' ? 'selected' : ''}>Thrice daily</option>
                        <option value="as_needed" ${med.frequency === 'as_needed' ? 'selected' : ''}>As needed</option>
                    </select>
                </div>

                <div class="flex gap-4">
                    <button type="button" class="btn-cancel-modal btn-ghost flex-1">Cancel</button>
                    <button type="button" id="edit-modal-submit-btn" class="btn btn-primary flex-1" style="flex:2;">Sync Structural Edits</button>
                </div>
            </div>
        `;

        document.body.appendChild(modalOverlay);

        const closeModalClosure = () => {
            modalOverlay.classList.add('hidden');
            setTimeout(() => modalOverlay.remove(), 250);
        };

        Utils.on(Utils.qs('.btn-close-modal', modalOverlay), 'click', closeModalClosure);
        Utils.on(Utils.qs('.btn-cancel-modal', modalOverlay), 'click', closeModalClosure);
        Utils.on(modalOverlay, 'click', (e) => { if (e.target === modalOverlay) closeModalClosure(); });

        const submitBtn = Utils.qs('#edit-modal-submit-btn', modalOverlay);
        Utils.on(submitBtn, 'click', async () => {
            const nameVal = Utils.qs('#edit-modal-name', modalOverlay).value.trim();
            const dosageVal = Utils.qs('#edit-modal-dosage', modalOverlay).value.trim();

            if (!nameVal || !dosageVal) {
                Utils.showToast('Required fields cannot contain empty values.', 'warn');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';

            try {
                const nextFreq = Utils.qs('#edit-modal-frequency', modalOverlay).value;
                let nextTimes = med.scheduledTimes;
                
                // Adjust daily alert markers if frequency shifts structural count rules
                if (nextFreq !== med.frequency) {
                    if (nextFreq === 'once_daily') nextTimes = ['09:00'];
                    else if (nextFreq === 'twice_daily') nextTimes = ['09:00', '21:00'];
                    else if (nextFreq === 'thrice_daily') nextTimes = ['08:00', '14:00', '20:00'];
                    else if (nextFreq === 'as_needed') nextTimes = [];
                }

                const deltaMutationMap = {
                    name: nameVal,
                    dosage: dosageVal,
                    frequency: nextFreq,
                    scheduledTimes: nextTimes
                };

                // Commit record modifications to device IndexedDB blocks
                await dbEngine.updateMedication(med.id, deltaMutationMap);

                // Re-merge memory updates into live single-point objects
                this._medication = { ...med, ...deltaMutationMap };
                globalStore.dispatch('MEDICATIONS/UPDATE', this._medication);

                Utils.showToast('Schedule variables structural matrix synced cleanly.', 'success');
                closeModalClosure();

                // Force full view lifecycle updates using revised variables
                await this.render(container, { id: med.id });

            } catch (dbUpdateExceptionError) {
                console.error('[MedicationDetail:Edit] Transaction aborted on error mapping:', dbUpdateExceptionError);
                Utils.showToast('Disk database layer rejected modification payload.', 'error');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Sync Structural Edits';
            }
        });
    }

    /**
     * Unsubscribes execution parameters, terminates active animation tokens,
     * and clears structural context pointers to prevent system leaks.
     * @returns {void}
     */
    static destroy() {
        console.log('[MedicationDetail] Executing view disposal tasks.');
        
        try {
            threeDRenderer.destroy();
        } catch (rendererTeardownException) {
            console.warn('[MedicationDetail] ThreeDRenderer container teardown fault bypassed:', rendererTeardownException);
        }

        this._medication = null;
        this._logs = [];
        this._otherMeds = [];
        this._lastSavedNotesHash = null;
    }
}