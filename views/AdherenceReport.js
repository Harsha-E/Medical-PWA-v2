/**
 * @fileoverview Adherence Report View Component for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Localized Data Analytics Visualizations and Document Compilations.
 * * Implements dynamic single-page reporting loops, hand-drawn vector charts,
 * compliance calendar heatmaps, and local data export triggers without external dependencies.
 */

import { dbEngine } from '../services/DatabaseEngine.js';
import { analyticsLocal } from '../services/AnalyticsLocal.js';
import { exportEngine } from '../services/ExportEngine.js';
import { Utils } from '../core/utils.js';

// ============================================================================
// COMPONENT CLASS IMPLEMENTATION
// ============================================================================

export default class AdherenceReport {
    /** @private {number} Active timeline filtering frame in days */
    static _currentPeriod = 30;
    /** @private {Object|null} Cached local user demographics data */
    static _profile = null;
    /** @private {Array<Object>} Cached local medication parameters */
    static _medications = [];
    /** @private {Array<Object>} Cached historical telemetry logs */
    static _doseLogs = [];
    /** @private {Object|null} Pre-computed statistical compilation results */
    static _analytics = null;
    /** @private {Array<Object>} Evaluated risky medication items */
    static _riskyMeds = [];
    /** @private {boolean} Visibility state of the action dropdown menu */
    static _dropdownActive = false;

    /**
     * Entry lifecycle point orchestrated by the single-page routing frame.
     * @param {HTMLElement} container - Target injection DOM container.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) return;

        try {
            // Retrieve data states from local IndexedDB storage hubs
            this._profile = await dbEngine.getProfile ? await dbEngine.getProfile() : {};
            this._medications = await dbEngine.getAllMedications() || [];
            this._doseLogs = await dbEngine.getAllDoseLogs ? await dbEngine.getAllDoseLogs() : [];
            this._dropdownActive = false;

            // Handle empty inventory profile boundaries gracefully
            if (this._medications.length === 0) {
                this._renderEmptyState(container);
                return;
            }

            // Run localized analytics computations
            this._calculateMetrics();

            // Inject structural interface markup loops
            this._renderLayout(container);
            this._bindComponentEvents(container);

        } catch (lifecycleError) {
            console.error('[AdherenceReport] Lifecycle execution crashed:', lifecycleError);
            container.innerHTML = `
                <div class="view-panel items-center justify-center">
                    <div class="card card--danger max-w-md w-full text-center">
                        <h3 class="typography-h3 text-danger mb-2">Report Failure</h3>
                        <p class="typography-body text-muted">Analytics engines rejected local logging array streams. Re-verify configuration.</p>
                    </div>
                </div>
            `;
        }
    }

    /**
     * Executes localized math transformations via pure functional analytics libraries.
     * @private
     */
    static _calculateMetrics() {
        this._analytics = analyticsLocal.computeAdherenceRate(this._doseLogs, this._medications, this._currentPeriod);
        this._riskyMeds = analyticsLocal.identifyRiskyMedications(this._doseLogs, this._medications) || [];
    }

    /**
     * Renders structural markup shells onto the target DOM context viewport.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderLayout(container) {
        const overallPct = this._analytics ? Math.round(this._analytics.overall * 100) : 0;
        
        // Map color token metrics matching standard semantic rules
        let complianceColorClass = 'text-danger';
        if (overallPct >= 90) complianceColorClass = 'text-success';
        else if (overallPct >= 70) complianceColorClass = 'text-warn';

        const streakData = analyticsLocal.computeStreak(this._doseLogs, this._medications) || { currentStreak: 0 };
        const totalScheduled = (this._medications.reduce((acc, med) => acc + (med.scheduledTimes ? med.scheduledTimes.length : 1), 0)) * this._currentPeriod;
        const totalTaken = this._doseLogs.filter(log => {
            const logTime = new Date(log.scheduledAt || log.takenAt).getTime();
            const cutoff = Date.now() - (this._currentPeriod * 24 * 60 * 60 * 1000);
            return logTime >= cutoff && log.status === 'taken';
        }).length;

        const scopedCSS = `
            <style id="adherence-report-scoped-css">
                .report-header-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--sp-3); position: relative; }
                .export-dropdown-wrapper { position: relative; }
                .export-menu { position: absolute; top: 110%; right: 0; width: 160px; background: var(--clr-glass-95); border: 1px solid var(--clr-border-88); border-radius: var(--radius-md); box-shadow: var(--shadow-lg); display: none; flex-direction: column; z-index: var(--z-modal); backdrop-filter: var(--blur-glass-strong); -webkit-backdrop-filter: var(--blur-glass-strong); overflow: hidden; }
                .export-menu--active { display: flex; }
                .export-item { width: 100%; padding: var(--sp-1-5) var(--sp-2); text-align: left; font-size: var(--fs-sm); font-weight: 600; color: var(--clr-text-hi); cursor: pointer; transition: background var(--time-fast) ease; }
                .export-item:hover { background: var(--clr-pill-orange-bg); color: var(--clr-pill-orange-text); }
                
                .report-grid-table { display: flex; flex-direction: column; gap: var(--sp-1); background: var(--clr-glass-52); border: 1px solid var(--clr-border-80); border-radius: var(--radius-md); padding: var(--sp-2); box-shadow: var(--shadow-sm); }
                .grid-row-med { display: grid; grid-template-columns: 2fr 1fr 1.2fr 0.5fr; padding: var(--sp-1-5) var(--sp-1); align-items: center; border-radius: var(--radius-sm); font-size: var(--fs-sm); }
                .grid-row-med:nth-child(even) { background: rgba(0, 0, 0, 0.02); }
                .grid-header-med { font-weight: 700; border-bottom: 1px solid var(--clr-divider); color: var(--clr-text-hi); padding-bottom: var(--sp-1); margin-bottom: var(--sp-1); }

                .heatmap-scroll-box { overflow-x: auto; padding-bottom: var(--sp-2); scrollbar-width: none; -ms-overflow-style: none; }
                .heatmap-scroll-box::-webkit-scrollbar { display: none; }
                .heatmap-grid-assembly { display: grid; grid-template-rows: repeat(7, 14px); grid-auto-flow: column; grid-auto-columns: 14px; gap: 3px; }
                .heatmap-cell { width: 14px; height: 14px; border-radius: 3px; background-color: var(--clr-glass-85); transition: transform var(--time-fast) ease; position: relative; }
                .heatmap-cell:hover { transform: scale(1.15); z-index: var(--z-content); }

                .insight-card-entry { animation: itemReveal var(--time-enter) cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(8px); }
                @keyframes itemReveal { to { opacity: 1; transform: translateY(0); } }
            </style>
        `;

        container.innerHTML = `
            ${scopedCSS}
            <div class="view-panel view-enter flex-col gap-4">
                
                <div class="report-header-row">
                    <div class="flex-col">
                        <h1 class="typography-h1" style="margin:0;">Adherence Report</h1>
                        <span class="typography-caption text-muted">Chronological window: Last ${this._currentPeriod} days</span>
                    </div>
                    
                    <div class="export-dropdown-wrapper">
                        <button id="btn-export-dropdown" class="btn btn-secondary" style="height:40px; padding:0 var(--sp-3); font-size:13px;" aria-label="Open export file formats menu">
                            Export Report ▾
                        </button>
                        <div id="export-actions-menu" class="export-menu">
                            <button class="export-item" data-action="pdf">Download PDF Report</button>
                            <button class="export-item" data-action="csv">Download CSV Logs</button>
                        </div>
                    </div>
                </div>

                <div class="flex gap-2">
                    <button class="filter-chip ${this._currentPeriod === 7 ? 'filter-chip--active' : ''}" data-range="7">7 Days</button>
                    <button class="filter-chip ${this._currentPeriod === 30 ? 'filter-chip--active' : ''}" data-range="30">30 Days</button>
                    <button class="filter-chip ${this._currentPeriod === 90 ? 'filter-chip--active' : ''}" data-range="90">90 Days</button>
                </div>

                ${this._generateRiskyMedsAlertHtml()}

                <div class="flex gap-2 text-center">
                    <div class="glass-panel flex-col items-center justify-center" style="flex:1; padding: var(--sp-2);">
                        <span class="typography-label" style="font-size:10px;">Adherence</span>
                        <span class="typography-h1 ${complianceColorClass}" style="font-size:26px; margin:0;">${overallPct}%</span>
                    </div>
                    <div class="glass-panel flex-col items-center justify-center" style="flex:1; padding: var(--sp-2);">
                        <span class="typography-label" style="font-size:10px;">Current Streak</span>
                        <span class="typography-h1 text-purple" style="font-size:26px; margin:0;">
                            ${streakData.currentStreak}d ${streakData.currentStreak >= 7 ? '🔥' : ''}
                        </span>
                    </div>
                    <div class="glass-panel flex-col items-center justify-center" style="flex:1; padding: var(--sp-2);">
                        <span class="typography-label" style="font-size:10px;">Doses Logged</span>
                        <span class="typography-body text-hi" style="font-weight:700; font-size:14px; margin-top:4px;">
                            ${totalTaken} / ${totalScheduled}
                        </span>
                    </div>
                </div>

                <div class="glass-standard flex-col gap-2">
                    <h2 class="typography-h2" style="margin:0;">Weekly Timeline Trend</h2>
                    <div style="width:100%; overflow-x:auto; scrollbar-width:none; -ms-overflow-style:none;">
                        ${this._renderTrendChartHtml()}
                    </div>
                </div>

                <div class="glass-standard flex-col gap-2">
                    <h2 class="typography-h2" style="margin:0;">Compliance Matrix Grid</h2>
                    <p class="typography-caption text-muted">8-week lookback mapping density (Hover for native metadata parameters)</p>
                    <div class="heatmap-scroll-box mt-2">
                        <div class="flex gap-3 items-start">
                            <div class="flex-col gap-0-5 typography-label text-muted" style="font-size:9px; line-height:14px; padding-top:2px; font-weight:700; width:12px;">
                                <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span><span>S</span>
                            </div>
                            ${this._renderHeatmapGridHtml()}
                        </div>
                    </div>
                </div>

                <div class="flex-col gap-2">
                    <h2 class="typography-h2" style="margin:0;">Formulation Performance Hierarchy</h2>
                    <div class="report-grid-table mt-1">
                        <div class="grid-row-med grid-header-med">
                            <span>Medication</span>
                            <span>Score</span>
                            <span>Recorded</span>
                            <span class="text-right">Trend</span>
                        </div>
                        ${this._generateMedicationRowsHtml()}
                    </div>
                </div>

                <div class="flex-col gap-2">
                    <h2 class="typography-h2" style="margin:0;">Clinical Execution Insights</h2>
                    <div class="flex-col gap-2 mt-1">
                        ${this._generateInsightCardsHtml()}
                    </div>
                </div>

            </div>
        `;
    }

    /**
     * Attaches action closures handling data refreshes and dropdown logic.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindComponentEvents(container) {
        const rangeChips = Utils.qsAll('[data-range]', container);
        const dropdownBtn = Utils.qs('#btn-export-dropdown', container);
        const menu = Utils.qs('#export-actions-menu', container);

        // Range filtering click routing
        rangeChips.forEach(chip => {
            Utils.on(chip, 'click', (e) => {
                this._currentPeriod = Number(e.currentTarget.getAttribute('data-range'));
                this._calculateMetrics();
                this._renderLayout(container);
                this._bindComponentEvents(container);
            });
        });

        // Dropdown toggle mechanism
        if (dropdownBtn && menu) {
            Utils.on(dropdownBtn, 'click', (e) => {
                e.stopPropagation();
                this._dropdownActive = !this._dropdownActive;
                if (this._dropdownActive) menu.classList.add('export-menu--active');
                else menu.classList.remove('export-menu--active');
            });

            // Global click interception to cleanly collapse floating panels
            const collapseClosure = () => {
                if (this._dropdownActive) {
                    this._dropdownActive = false;
                    menu.classList.remove('export-menu--active');
                }
            };
            Utils.on(document.body, 'click', collapseClosure);
        }

        // Export Action Item Interception
        const exportItems = Utils.qsAll('.export-item', container);
        exportItems.forEach(item => {
            Utils.on(item, 'click', async (e) => {
                const action = e.currentTarget.getAttribute('data-action');
                await this._executeExportTransaction(action);
            });
        });
    }

    // ============================================================================
    // VECTOR GRAPHICS & HEATMAP DRAWING GENERATORS
    // ============================================================================

    /**
     * Draws an explicit inline vector line graph chart tracking compliance trends across time.
     * @private
     * @returns {string} Inline SVG string representation.
     */
    static _renderTrendChartHtml() {
        const trendData = analyticsLocal.computeTrendLine(this._doseLogs, this._medications, 6) || [];
        if (trendData.length === 0) {
            return `<p class="typography-caption text-muted text-center py-6">Insufficient historical timeline entries to map trend vectors.</p>`;
        }

        // Operational Dimensions Mapping Constraints
        const totalCanvasWidth = 600;
        const totalCanvasHeight = 160;
        const padLeft = 40;
        const padRight = 24;
        const padTop = 16;
        const padBottom = 32;

        const graphWidth = totalCanvasWidth - padLeft - padRight;
        const graphHeight = totalCanvasHeight - padTop - padBottom;

        // Generate Horizontal Background Gridlines (20% steps)
        let gridlinesHtml = '';
        for (let percentStep = 0; percentStep <= 100; percentStep += 20) {
            const yCoordinate = padTop + graphHeight * (1 - percentStep / 100);
            gridlinesHtml += `
                <line x1="${padLeft}" y1="${yCoordinate}" x2="${totalCanvasWidth - padRight}" y2="${yCoordinate}" 
                      stroke="rgba(180, 60, 0, 0.08)" stroke-width="1" stroke-dasharray="4,4" />
                <text x="${padLeft - 8}" y="${yCoordinate + 4}" fill="rgba(110, 55, 0, 0.5)" font-size="9px" text-anchor="end" font-weight="600">${percentStep}%</text>
            `;
        }

        // Calculate chronological vector point positions
        const calculatedCoordinates = trendData.map((dataBlock, idx) => {
            const stepFraction = trendData.length > 1 ? idx / (trendData.length - 1) : 0.5;
            const x = padLeft + graphWidth * stepFraction;
            const y = padTop + graphHeight * (1 - Math.min(1.0, Math.max(0.0, dataBlock.rate)));
            return { x, y, label: dataBlock.weekLabel, rawRate: Math.round(dataBlock.rate * 100) };
        });

        // Assemble Polyline Paths
        let pathString = '';
        let areaClosedPathString = calculatedCoordinates.length > 0 ? `M ${calculatedCoordinates[0].x} ${padTop + graphHeight} ` : '';
        
        calculatedCoordinates.forEach((coord, idx) => {
            const prefixCmd = idx === 0 ? 'M' : 'L';
            pathString += `${prefixCmd} ${coord.x} ${coord.y} `;
            areaClosedPathString += `L ${coord.x} ${coord.y} `;
        });

        if (calculatedCoordinates.length > 0) {
            areaClosedPathString += `L ${calculatedCoordinates[calculatedCoordinates.length - 1].x} ${padTop + graphHeight} Z`;
        }

        // Create interactive point vectors
        let pointsAndLabelsHtml = '';
        calculatedCoordinates.forEach((coord) => {
            pointsAndLabelsHtml += `
                <g class="chart-interactive-group">
                    <circle cx="${coord.x}" cy="${coord.y}" r="4.5" fill="var(--clr-accent)" stroke="#FFFFFF" stroke-width="1.5" style="transition: r var(--time-fast) ease; cursor:pointer;" />
                    <text x="${coord.x}" y="${totalCanvasHeight - 8}" fill="rgba(80, 35, 0, 0.7)" font-size="9px" font-weight="700" text-anchor="middle">${coord.label}</text>
                    <title>${coord.label}: ${coord.rawRate}% Compliance</title>
                </g>
            `;
        });

        return `
            <svg viewBox="0 0 ${totalCanvasWidth} ${totalCanvasHeight}" width="100%" height="${totalCanvasHeight}" style="display:block; overflow:visible; font-family:'Space Grotesk', sans-serif;">
                ${gridlinesHtml}
                ${calculatedCoordinates.length > 1 ? `<path d="${areaClosedPathString}" fill="var(--clr-accent)" opacity="0.08" />` : ''}
                ${calculatedCoordinates.length > 1 ? `<path d="${pathString}" fill="none" stroke="var(--clr-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />` : ''}
                ${pointsAndLabelsHtml}
            </svg>
        `;
    }

    /**
     * Pulls log matrix streams mapping values to incremental opacity variations over custom shapes.
     * @private
     * @returns {string} HTML collection of grid elements.
     */
    static _renderHeatmapGridHtml() {
        const heatmapMatrix = analyticsLocal.computeMissedDoseHeatmap(this._doseLogs, 8) || [];
        if (heatmapMatrix.length === 0 || !heatmapMatrix[0]) {
            return `<p class="typography-caption text-muted py-4">Grid matrix compilation deferred.</p>`;
        }

        let gridBufferHtml = '<div class="heatmap-grid-assembly">';
        const rowsCount = heatmapMatrix.length;
        const columnsCount = heatmapMatrix[0].length;

        // Iterate coordinates to project the custom grid flow
        for (let colIdx = 0; colIdx < columnsCount; colIdx++) {
            for (let rowIdx = 0; rowIdx < rowsCount; rowIdx++) {
                const cellData = heatmapMatrix[rowIdx][colIdx];
                
                if (cellData) {
                    // Compute compliance color opacity levels
                    const opacityRatio = cellData.takenCount > 0 ? 0.15 + (cellData.rate * 0.85) : 0.05;
                    const colorStyle = cellData.takenCount > 0 
                        ? `background-color: rgba(255, 107, 53, ${opacityRatio}); border: 1px solid rgba(255, 107, 53, calc(${opacityRatio} * 0.4));`
                        : cellData.missedCount > 0 
                        ? 'background-color: rgba(232, 0, 58, 0.25); border: 1px solid rgba(232, 0, 58, 0.15);'
                        : 'background-color: var(--clr-glass-80);';

                    const tooltipText = `${cellData.date} · Taken: ${cellData.takenCount}, Missed: ${cellData.missedCount} (${Math.round(cellData.rate * 100)}%)`;
                    
                    gridBufferHtml += `<div class="heatmap-cell" style="${colorStyle}" title="${Utils.sanitizeString(tooltipText)}"></div>`;
                } else {
                    gridBufferHtml += `<div class="heatmap-cell" style="background-color:transparent;"></div>`;
                }
            }
        }

        gridBufferHtml += '</div>';
        return gridBufferHtml;
    }

    // ============================================================================
    // DATA ROW & CARD HTML RENDER LOOPS
    // ============================================================================

    /**
     * Renders table entry items sorted ascending by compliance level.
     * @private
     * @returns {string} Markup template structure.
     */
    static _generateMedicationRowsHtml() {
        if (this._medications.length === 0) return '';
        
        // Sort active collection worst performance first
        const sortedMedicationsList = [...this._medications].sort((a, b) => {
            const scoreA = this._analytics?.perMedication?.get(a.id) ?? 1.0;
            const scoreB = this._analytics?.perMedication?.get(b.id) ?? 1.0;
            return scoreA - scoreB;
        });

        return sortedMedicationsList.map(med => {
            const currentScore = this._analytics?.perMedication?.get(med.id) ?? 1.0;
            const scorePct = Math.round(currentScore * 100);

            // Compute taken vs missed volumes inside active boundaries
            const validMedLogs = this._doseLogs.filter(log => log.medicationId === med.id);
            const takenCount = validMedLogs.filter(l => l.status === 'taken').length;
            const missedCount = validMedLogs.filter(l => l.status === 'missed').length;

            // Trend arrow mapping logic (simulated directional metrics)
            const isImproving = currentScore >= 0.75;
            const trendArrowGlyph = isImproving ? '↑' : '↓';
            const trendColorClass = isImproving ? 'text-success' : 'text-danger';

            return `
                <div class="grid-row-med" style="cursor:pointer;" onclick="window.location.hash='#/medication/${med.id}'">
                    <span class="text-hi" style="font-weight:600;">${Utils.sanitizeString(med.name)}</span>
                    <span style="font-weight:700;">${scorePct}%</span>
                    <span class="text-muted" style="font-size:12px;">${takenCount}T / ${missedCount}M</span>
                    <span class="text-right ${trendColorClass}" style="font-weight:700; font-size:15px;">${trendArrowGlyph}</span>
                </div>
            `;
        }).join('');
    }

    /**
     * Renders formatted list arrays using staggered transitions.
     * @private
     * @returns {string} HTML stream mapping insight cards.
     */
    static _generateInsightCardsHtml() {
        if (!this._analytics) return '';

        // Extract historical delta lists to provide contextual triggers
        const messages = analyticsLocal.generateInsightMessages(this._analytics, this._riskyMeds) || [];
        
        return messages.map((msg, index) => `
            <div class="card insight-card-entry flex-row gap-3" style="animation-delay: ${index * 40}ms; align-items:flex-start; margin:0;">
                <div class="text-accent mt-0-5" style="flex-shrink:0;">💡</div>
                <p class="typography-body text-md" style="margin:0; line-height:1.4;">${Utils.sanitizeString(msg)}</p>
            </div>
        `).join('');
    }

    /**
     * Compiles hazardous notification blocks if active thresholds drop.
     * @private
     * @returns {string} Container markup.
     */
    static _generateRiskyMedsAlertHtml() {
        if (this._riskyMeds.length === 0) return '';

        const riskyNamesList = this._riskyMeds.map(riskItem => 
            `${Utils.sanitizeString(riskItem.medication?.name || 'Unknown')} (${Math.round(riskItem.rate * 100)}%)`
        ).join(', ');

        return `
            <div class="card card--danger flex-col gap-1 view-enter" style="margin:0;">
                <div class="flex items-center gap-2 text-danger" style="font-weight:700;">
                    <span>⚠️</span> <h3 class="typography-h4 text-danger" style="margin:0; font-size:15px;">Compliance Threshold Deficit</h3>
                </div>
                <p class="typography-caption mt-1" style="color: var(--clr-danger); line-height:1.4;">
                    Critical compliance anomalies detected across these formulations: <strong style="font-weight:700;">${riskyNamesList}</strong>. Review administration loops promptly.
                </p>
            </div>
        `;
    }

    // ============================================================================
    // DATA EXPORT PIPELINE HANDLING
    // ============================================================================

    /**
     * Routes structural execution variables down to native client-side file serializers.
     * @private
     * @param {string} fileFormatType - Target type 'pdf' or 'csv'
     * @returns {Promise<void>}
     */
    static async _executeExportTransaction(fileFormatType) {
        Utils.showToast('Assembling localized data document matrices...', 'info');

        try {
            await Utils.sleep(400); // Allow hardware paint buffer loops to relax

            if (fileFormatType === 'pdf') {
                await exportEngine.exportAdherencePDF(this._profile, this._medications, this._doseLogs, this._analytics);
                Utils.showToast('Adherence PDF report generated cleanly.', 'success');
            } else if (fileFormatType === 'csv') {
                const inventoryMap = new Map(this._medications.map(med => [med.id, med]));
                await exportEngine.exportDoseLogsCSV(this._doseLogs, inventoryMap);
                Utils.showToast('Dose log CSV ledger downloaded.', 'success');
            }

        } catch (exportTransactionError) {
            console.error('[AdherenceReport:Export] Operational pipeline failed:', exportTransactionError);
            Utils.showToast('Local generation transaction aborted.', 'error');
        }
    }

    /**
     * Standard boundary display shown if no baseline elements reside inside memory.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderEmptyState(container) {
        container.innerHTML = `
            <div class="view-panel items-center justify-center">
                <div class="empty-state max-w-md w-full">
                    <div class="icon-box" style="background: var(--clr-glass-65); color: var(--clr-text-lo); width:80px; height:80px; margin-bottom: var(--sp-4);">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21.21 15.89A10 10 0 1 1 8 2.83"></path><path d="M22 12A10 10 0 0 0 12 2v10z"></path></svg>
                    </div>
                    <h2 class="typography-h2 text-hi mb-2">Metrics Inactive</h2>
                    <p class="typography-body text-muted mb-6">No medication entries are registered. Add active items to generate structural adherence matrices.</p>
                    <button class="btn btn-primary w-full" onclick="window.location.hash='#/search'">Go to Search &rarr;</button>
                </div>
            </div>
        `;
    }

    /**
     * Clears local cache targets and references upon teardown loops.
     * @returns {void}
     */
    static destroy() {
        this._profile = null;
        this._medications = [];
        this._doseLogs = [];
        this._analytics = null;
        this._riskyMeds = [];
        if (this._debounceTimer) {
            clearTimeout(this._debounceTimer);
            this._debounceTimer = null;
        }
    }
}