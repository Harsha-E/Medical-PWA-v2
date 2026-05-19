/**
 * @fileoverview Dashboard Home View for MedCare PWA.
 * Architecture: ES6 Module.
 * Paradigm: Dynamic data-driven UI with hardware-accelerated animations,
 * skeleton loading states, and localized time logic.
 */

import { globalStore } from '../core/store.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { Utils } from '../core/utils.js';

/**
 * Main Dashboard View Class.
 * Handles the user's daily triage, adherence metrics, active alerts, and dose execution.
 */
export default class DashboardHome {
    /**
     * Entry point for the router to render the view.
     * @param {HTMLElement} container - The DOM element to inject the view into.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) return;
        
        // 1. Update Global State
        globalStore.dispatch('APP/SET_VIEW', '#/dashboard');

        // 2. Render Initial Skeleton State
        container.innerHTML = this._getSkeletonHtml();

        try {
            // 3. Fetch all parallel data streams
            const [profile, medications, allDoses, alerts] = await Promise.all([
                dbEngine.getFullProfile(),
                dbEngine.getAllMedications(),
                dbEngine.getDosesForDay(new Date()),
                dbEngine.getActiveAlerts()
            ]);

            // 4. Compute Daily Schedule & Adherence
            const schedule = this._computeDailySchedule(medications, allDoses);
            const adherence = this._computeAdherence(schedule);

            // 5. Render Final UI
            container.innerHTML = this._getDashboardHtml(profile, schedule, adherence, alerts, medications.length === 0);

            // 6. Bind Event Listeners & Trigger Animations
            this._bindEvents(container);
            this._animateAdherenceRing(adherence);

        } catch (error) {
            console.error('[DashboardHome] Failed to render dashboard:', error);
            Utils.showToast('Failed to load dashboard data. Please refresh.', 'error');
            container.innerHTML = this._getErrorHtml();
        }
    }

    /**
     * Evaluates the master medication list against today's logs to build a chronological schedule.
     * @private
     * @param {Array<Object>} medications 
     * @param {Array<Object>} todayLogs 
     * @returns {Array<Object>} Sorted array of dose slot objects.
     */
    static _computeDailySchedule(medications, todayLogs) {
        if (!medications || medications.length === 0) return [];

        const dayNames = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
        const currentDayStr = dayNames[new Date().getDay()];
        const now = new Date();
        const schedule = [];

        for (const med of medications) {
            if (!med.activeDays || !med.activeDays.includes(currentDayStr)) continue;

            for (const timeStr of (med.scheduledTimes || [])) {
                // Construct Date object for this scheduled time today
                const [hours, minutes] = timeStr.split(':').map(Number);
                const scheduledDate = new Date();
                scheduledDate.setHours(hours, minutes, 0, 0);

                // Find matching log
                const matchingLog = todayLogs.find(log => 
                    log.medicationId === med.id && 
                    new Date(log.scheduledAt).getHours() === hours
                );

                // Determine Status
                let status = 'pending';
                if (matchingLog) {
                    status = matchingLog.status;
                } else if (scheduledDate < now) {
                    status = 'missed';
                }

                schedule.push({
                    medication: med,
                    timeStr,
                    scheduledDate,
                    status,
                    logId: matchingLog ? matchingLog.id : null
                });
            }
        }

        // Sort chronologically
        return schedule.sort((a, b) => a.scheduledDate - b.scheduledDate);
    }

    /**
     * Calculates the adherence percentage for today.
     * @private
     * @param {Array<Object>} schedule 
     * @returns {number} Integer 0-100
     */
    static _computeAdherence(schedule) {
        if (schedule.length === 0) return 100;
        const taken = schedule.filter(slot => slot.status === 'taken').length;
        return Math.round((taken / schedule.length) * 100);
    }

    /**
     * Generates the complete HTML string for the fully loaded dashboard.
     * @private
     * @param {Object} profile 
     * @param {Array<Object>} schedule 
     * @param {number} adherence 
     * @param {Array<Object>} alerts 
     * @param {boolean} isEmpty 
     * @returns {string}
     */
    static _getDashboardHtml(profile, schedule, adherence, alerts, isEmpty) {
        const userName = profile?.name || 'Patient';
        const dateString = Utils.formatDate(new Date());

        return `
            <div class="view-panel view-enter">
                
                <header class="flex justify-between items-center mb-6 mt-2">
                    <div>
                        <h1 class="typography-h2">Good Morning, ${Utils.sanitizeString(userName)}</h1>
                        <p class="typography-body text-muted">${dateString}</p>
                    </div>
                    <div class="glass-panel" style="width: 48px; height: 48px; border-radius: var(--radius-full); overflow: hidden; display: flex; align-items: center; justify-content: center; background: var(--clr-surface);">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--clr-accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                    </div>
                </header>

                ${this._getAlertsHtml(alerts)}

                ${isEmpty ? this._getEmptyStateHtml() : `
                    <section class="card mb-8 flex justify-between items-center relative overflow-hidden">
                        <div style="position: absolute; right: -20px; top: -20px; opacity: 0.05; pointer-events: none;">
                            <svg width="200" height="200" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2L2 22h20L12 2z"/></svg>
                        </div>
                        <div>
                            <h2 class="typography-h4 mb-1">Today's Progress</h2>
                            <p class="typography-caption text-muted">Daily adherence metric</p>
                        </div>
                        <div class="adherence-ring">
                            <svg width="100" height="100" viewBox="0 0 120 120">
                                <circle cx="60" cy="60" r="50" fill="none" stroke="var(--clr-border)" stroke-width="8" />
                                <circle id="adherence-progress-svg" cx="60" cy="60" r="50" fill="none" stroke="var(--clr-accent)" stroke-width="8"
                                        stroke-dasharray="314.159" stroke-dashoffset="314.159" stroke-linecap="round"
                                        style="transition: stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1); transform: rotate(-90deg); transform-origin: 50% 50%;" />
                            </svg>
                            <div style="position: absolute; text-align: center; width: 100%; top: 50%; transform: translateY(-50%);">
                                <span class="typography-h3" id="adherence-text-val" style="font-family: var(--font-display);">0%</span>
                            </div>
                        </div>
                    </section>

                    <section class="mb-12">
                        <h3 class="typography-h4 mb-4">Today's Schedule</h3>
                        ${this._getTimelineHtml(schedule)}
                    </section>
                `}
                
                <div style="height: 80px;"></div>
            </div>

            ${this._getNavigationBarHtml()}
        `;
    }

    /**
     * Generates HTML for the active alerts strip.
     * @private
     * @param {Array<Object>} alerts 
     * @returns {string}
     */
    static _getAlertsHtml(alerts) {
        if (!alerts || alerts.length === 0) return '';
        
        return alerts.map(alert => `
            <div class="card card--${alert.severity === 'high' ? 'danger' : 'warn'} mb-6 flex items-center gap-4">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-${alert.severity === 'high' ? 'danger' : 'warn'}">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <div style="flex: 1;">
                    <p class="typography-body" style="font-weight: 600;">Interaction Warning</p>
                    <p class="typography-caption">${Utils.sanitizeString(alert.message)}</p>
                </div>
            </div>
        `).join('');
    }

    /**
     * Generates HTML for the chronological timeline of doses.
     * Implements stagger animations.
     * @private
     * @param {Array<Object>} schedule 
     * @returns {string}
     */
    static _getTimelineHtml(schedule) {
        if (schedule.length === 0) {
            return `
                <div class="glass-panel p-6 text-center">
                    <p class="typography-body text-muted">No doses scheduled for today.</p>
                </div>
            `;
        }

        return schedule.map((slot, index) => {
            const delay = index * 40; // 40ms stagger increment
            
            // Determine UI states based on slot status
            let badgeClass = 'badge--neutral';
            let badgeText = 'PENDING';
            let timelineClass = '';
            let actionHtml = '';

            if (slot.status === 'taken') {
                badgeClass = 'badge--success';
                badgeText = 'TAKEN';
                timelineClass = 'dose-timeline--taken';
            } else if (slot.status === 'missed') {
                badgeClass = 'badge--danger';
                badgeText = 'MISSED';
                timelineClass = 'dose-timeline--missed';
            } else {
                // Pending
                actionHtml = `
                    <button class="btn btn-primary btn-take-dose mt-3" data-med-id="${slot.medication.id}" data-time="${slot.scheduledDate.toISOString()}" style="height: 36px; font-size: var(--fs-sm);">
                        Take Now
                    </button>
                `;
            }

            // Localized AM/PM time
            const displayTime = Utils.formatDoseTime(slot.scheduledDate);

            return `
                <div class="dose-timeline ${timelineClass}" style="opacity: 0; animation: viewEnter 280ms ease-out ${delay}ms forwards;">
                    <div class="flex justify-between items-start mb-1">
                        <span class="typography-label text-muted">${displayTime}</span>
                        <span class="badge ${badgeClass}">${badgeText}</span>
                    </div>
                    <div class="card card--flat">
                        <h4 class="typography-h4">${Utils.sanitizeString(slot.medication.name)}</h4>
                        <p class="typography-caption text-muted">${Utils.sanitizeString(slot.medication.dosage)} · ${Utils.sanitizeString(slot.medication.notes || 'No specific instructions')}</p>
                        ${actionHtml}
                    </div>
                </div>
            `;
        }).join('');
    }

    /**
     * Provides a premium empty state if the user has no medications.
     * @private
     * @returns {string}
     */
    static _getEmptyStateHtml() {
        return `
            <div class="flex-col items-center justify-center text-center p-8 mt-12 glass-panel">
                <div class="mb-6 text-accent" style="opacity: 0.6;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="8" x2="12" y2="16"></line>
                        <line x1="8" y1="12" x2="16" y2="12"></line>
                    </svg>
                </div>
                <h3 class="typography-h3 mb-2">No Medications</h3>
                <p class="typography-body text-muted mb-6">Your triage matrix is empty. Add your first medication manually or scan a prescription bottle.</p>
                <div class="flex gap-4 w-full">
                    <button class="btn btn-primary w-full" onclick="window.location.hash='#/scan'">Scan Rx</button>
                    <button class="btn btn-secondary w-full" onclick="window.location.hash='#/search'">Manual</button>
                </div>
            </div>
        `;
    }

    /**
     * Generates a non-blocking skeleton loader.
     * @private
     * @returns {string}
     */
    static _getSkeletonHtml() {
        return `
            <div class="view-panel">
                <header class="flex justify-between items-center mb-6 mt-2">
                    <div class="w-full">
                        <div class="skeleton skeleton-text" style="width: 60%; height: 28px;"></div>
                        <div class="skeleton skeleton-text" style="width: 40%;"></div>
                    </div>
                    <div class="skeleton skeleton-avatar ml-4"></div>
                </header>
                <div class="skeleton skeleton-card mb-8 h-32"></div>
                <div>
                    <div class="skeleton skeleton-text" style="width: 30%; height: 20px; mb-4;"></div>
                    <div class="skeleton skeleton-card mb-4 h-24"></div>
                    <div class="skeleton skeleton-card mb-4 h-24"></div>
                </div>
            </div>
            ${this._getNavigationBarHtml()}
        `;
    }

    /**
     * Provides fallback HTML if catastrophic failure occurs.
     * @private
     * @returns {string}
     */
    static _getErrorHtml() {
        return `
            <div class="view-panel flex-col items-center justify-center text-center">
                <p class="typography-body text-danger mb-4">A critical error occurred loading the dashboard.</p>
                <button class="btn btn-primary" onclick="window.location.reload()">Reload Edge Node</button>
            </div>
        `;
    }

    /**
     * Generates the standard bottom navigation bar.
     * Hardcodes the active class to the Home tab.
     * @private
     * @returns {string}
     */
    static _getNavigationBarHtml() {
        return `
            <nav class="nav-bar">
                <a href="#/dashboard" class="nav-item nav-item--active" aria-label="Home">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                    <span class="mt-1">Home</span>
                </a>
                <a href="#/scan" class="nav-item" aria-label="Scan">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    <span class="mt-1">Scan</span>
                </a>
                <a href="#/interactions" class="nav-item" aria-label="Interactions">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                    <span class="mt-1">Matrix</span>
                </a>
                <a href="#/family" class="nav-item" aria-label="Family Hub">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    <span class="mt-1">Family</span>
                </a>
                <a href="#/settings" class="nav-item" aria-label="Settings">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>
                    <span class="mt-1">Settings</span>
                </a>
            </nav>
        `;
    }

    /**
     * Binds event listeners to dynamic elements via event delegation.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindEvents(container) {
        // Event Delegation for "Take Now" buttons to avoid memory leaks
        container.addEventListener('click', async (e) => {
            const btn = e.target.closest('.btn-take-dose');
            if (!btn) return;

            const medId = parseInt(btn.getAttribute('data-med-id'), 10);
            const scheduledAt = btn.getAttribute('data-time');

            if (isNaN(medId)) return;

            // Optimistic UI update: disable button instantly
            btn.disabled = true;
            btn.textContent = 'Recording...';

            try {
                // Execute DB transaction
                await dbEngine.recordDose(medId, 'taken', '');
                
                // Dispatch notification for sync engines
                globalStore.dispatch('DOSE_LOGS/RECORD', { medicationId: medId, status: 'taken', scheduledAt });
                
                Utils.showToast('Dose recorded successfully.', 'success');
                
                // Hard re-render to update adherence and timeline status natively
                this.render(container);

            } catch (error) {
                console.error('[DashboardHome] Failed to record dose:', error);
                btn.disabled = false;
                btn.textContent = 'Take Now';
                Utils.showToast('Failed to record dose. Please try again.', 'error');
            }
        });
    }

    /**
     * Animates the SVG adherence ring upon rendering completion.
     * @private
     * @param {number} adherencePercentage - 0 to 100
     */
    static _animateAdherenceRing(adherencePercentage) {
        // Yield to the main thread to ensure the DOM is painted
        requestAnimationFrame(() => {
            const circle = document.getElementById('adherence-progress-svg');
            const text = document.getElementById('adherence-text-val');
            
            if (circle && text) {
                // Radius is 50, Circumference is 2 * PI * 50 = ~314.159
                const circumference = 314.159;
                const offset = circumference - (adherencePercentage / 100) * circumference;
                
                // Trigger CSS transition
                circle.style.strokeDashoffset = offset.toString();

                // Counter animation for the text
                let current = 0;
                const duration = 1200; // matching CSS transition
                const stepTime = Math.abs(Math.floor(duration / Math.max(adherencePercentage, 1)));
                
                const timer = setInterval(() => {
                    if (current >= adherencePercentage) {
                        clearInterval(timer);
                        text.textContent = `${adherencePercentage}%`;
                    } else {
                        current += 1;
                        text.textContent = `${current}%`;
                    }
                }, stepTime);
            }
        });
    }
}