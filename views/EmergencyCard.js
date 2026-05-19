/**
 * @fileoverview Emergency Card View for MedCare PWA.
 * Architecture: ES6 Module.
 * Paradigm: High-contrast, full-screen lockscreen overlay designed for 
 * extreme stress situations. Utilizes the WakeLock API to keep the screen active.
 */

import { globalStore } from '../core/store.js';
import { globalRouter } from '../core/router.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { Utils } from '../core/utils.js';

/**
 * EmergencyCard View Class.
 * Renders vital clinical data (Blood Type, Allergies, Active Meds) in an 
 * instantly readable format for first responders.
 */
export default class EmergencyCard {
    /** @type {WakeLockSentinel|null} */
    static _wakeLock = null;
    
    /** @type {Function|null} */
    static _visibilityHandler = null;

    /**
     * Renders the Emergency Card view.
     * @param {HTMLElement} container - The target DOM container.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) return;

        globalStore.dispatch('APP/SET_VIEW', '#/emergency');

        // Render skeleton loader for immediate feedback
        container.innerHTML = this._getSkeletonHtml();

        try {
            const [profile, medications] = await Promise.all([
                dbEngine.getFullProfile(),
                dbEngine.getAllMedications()
            ]);

            container.innerHTML = this._getEmergencyHtml(profile, medications);
            
            this._bindEvents(container);
            await this._requestWakeLock();
            this._setupVisibilityListener();

        } catch (error) {
            console.error('[EmergencyCard] Failed to load critical data:', error);
            Utils.showToast('Failed to load emergency data.', 'error');
            container.innerHTML = this._getErrorHtml();
        }
    }

    /**
     * Requests a screen wake lock to prevent the device from sleeping.
     * @private
     * @returns {Promise<void>}
     */
    static async _requestWakeLock() {
        if ('wakeLock' in navigator) {
            try {
                this._wakeLock = await navigator.wakeLock.request('screen');
                console.log('[EmergencyCard] Screen Wake Lock activated.');
                
                this._wakeLock.addEventListener('release', () => {
                    console.log('[EmergencyCard] Screen Wake Lock released.');
                });
            } catch (err) {
                console.warn('[EmergencyCard] Wake Lock request failed or denied:', err);
            }
        } else {
            console.warn('[EmergencyCard] WakeLock API not supported on this browser.');
        }
    }

    /**
     * Releases the active wake lock if it exists.
     * @private
     */
    static _releaseWakeLock() {
        if (this._wakeLock !== null) {
            this._wakeLock.release()
                .then(() => {
                    this._wakeLock = null;
                })
                .catch(err => console.error('[EmergencyCard] Failed to release Wake Lock:', err));
        }
    }

    /**
     * Re-acquires the wake lock if the user minimizes the app and returns.
     * @private
     */
    static _setupVisibilityListener() {
        // Clean up previous listener to prevent memory leaks
        if (this._visibilityHandler) {
            document.removeEventListener('visibilitychange', this._visibilityHandler);
        }

        this._visibilityHandler = async () => {
            if (this._wakeLock !== null && document.visibilityState === 'visible') {
                await this._requestWakeLock();
            }
        };

        document.addEventListener('visibilitychange', this._visibilityHandler);
    }

    /**
     * Generates the primary HTML structure for the emergency display.
     * @private
     * @param {Object} profile - User profile data from IndexedDB.
     * @param {Array<Object>} medications - List of active medications.
     * @returns {string}
     */
    static _getEmergencyHtml(profile, medications) {
        const name = profile?.name || 'UNKNOWN PATIENT';
        const bloodType = profile?.bloodType || 'UNKNOWN';
        const allergies = this._parseAllergies(profile?.allergies);
        
        const iceName = profile?.iceName || 'Not configured';
        const icePhone = profile?.icePhone || '';
        const iceRelation = profile?.iceRelation || '';

        return `
            <div class="emergency-lockscreen view-enter" style="overflow-y: auto;">
                
                <header class="flex justify-between items-center w-full max-w-md mx-auto mb-8">
                    <div class="flex items-center gap-3">
                        <div style="animation: pulse 1.5s infinite cubic-bezier(0.4, 0, 0.2, 1); color: var(--clr-danger);">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                                <path d="M19 10.5h-5.5V5h-3v5.5H5v3h5.5V19h3v-5.5H19v-3z"></path>
                            </svg>
                        </div>
                        <span class="typography-label text-danger" style="font-size: 1.2rem;">MEDICAL EMERGENCY</span>
                    </div>
                    <button id="btn-exit-emergency" class="btn btn-icon" style="border-color: rgba(255,255,255,0.2);" aria-label="Close Emergency Card">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                </header>

                <main class="w-full max-w-md mx-auto flex-col" style="flex: 1;">
                    
                    <section class="mb-10">
                        <h1 class="typography-display" style="color: #ffffff; margin-bottom: var(--sp-2); word-break: break-word;">
                            ${Utils.sanitizeString(name).toUpperCase()}
                        </h1>
                        <div class="glass-panel inline-flex items-center gap-4 px-6 py-3" style="background: rgba(239, 68, 68, 0.15); border-color: var(--clr-danger);">
                            <span class="typography-h4 text-danger">BLOOD TYPE:</span>
                            <span class="typography-display" style="font-size: 2.5rem; color: var(--clr-danger); line-height: 1;">
                                ${Utils.sanitizeString(bloodType)}
                            </span>
                        </div>
                    </section>

                    <section class="mb-8 border-t border-b py-6" style="border-color: rgba(255,255,255,0.1);">
                        <h2 class="typography-label text-muted mb-4">SEVERE ALLERGIES</h2>
                        ${this._getAllergiesHtml(allergies)}
                    </section>

                    <section class="mb-8">
                        <h2 class="typography-label text-muted mb-4">ACTIVE MEDICATIONS</h2>
                        ${this._getMedicationsHtml(medications)}
                    </section>

                    <section class="mb-8 glass-panel p-6" style="background: rgba(255,255,255,0.05);">
                        <h2 class="typography-label text-muted mb-3">IN CASE OF EMERGENCY CONTACT</h2>
                        <h3 class="typography-h3" style="color: #ffffff;">${Utils.sanitizeString(iceName)}</h3>
                        ${iceRelation ? `<p class="typography-body text-muted mb-4">${Utils.sanitizeString(iceRelation)}</p>` : ''}
                        
                        ${icePhone ? `
                            <a href="tel:${Utils.sanitizeString(icePhone)}" class="btn btn-secondary w-full flex justify-center mt-4" style="height: 56px;">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mr-2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                                Call Contact
                            </a>
                        ` : `<p class="typography-caption text-muted mt-2">No phone number configured.</p>`}
                    </section>

                </main>

                <footer class="w-full max-w-md mx-auto mt-auto pt-6 pb-4">
                    <a href="tel:911" class="btn btn-danger w-full flex justify-center items-center gap-3" style="height: 72px; box-shadow: 0 8px 32px rgba(239, 68, 68, 0.4);">
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                        <span class="typography-h3" style="color: #ffffff;">CALL 911</span>
                    </a>
                </footer>

                <style>
                    @keyframes pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50% { opacity: 0.5; transform: scale(0.95); }
                    }
                </style>
            </div>
        `;
    }

    /**
     * Parses the allergies data from the profile into a clean array.
     * @private
     * @param {string|Array} allergiesRaw 
     * @returns {string[]}
     */
    static _parseAllergies(allergiesRaw) {
        if (!allergiesRaw) return [];
        if (Array.isArray(allergiesRaw)) return allergiesRaw;
        if (typeof allergiesRaw === 'string') {
            return allergiesRaw.split(',').map(a => a.trim()).filter(Boolean);
        }
        return [];
    }

    /**
     * Generates HTML for the allergies section using danger badges.
     * @private
     * @param {string[]} allergies 
     * @returns {string}
     */
    static _getAllergiesHtml(allergies) {
        if (allergies.length === 0) {
            return `<div class="badge badge--success" style="font-size: 1rem; padding: 8px 16px;">NO KNOWN ALLERGIES (NKA)</div>`;
        }

        return `
            <div class="flex" style="flex-wrap: wrap; gap: var(--sp-3);">
                ${allergies.map(allergy => `
                    <div class="badge badge--danger" style="font-size: 1rem; padding: 8px 16px; border-width: 2px;">
                        ${Utils.sanitizeString(allergy).toUpperCase()}
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Generates highly readable HTML for the active medications list.
     * @private
     * @param {Array<Object>} medications 
     * @returns {string}
     */
    static _getMedicationsHtml(medications) {
        if (!medications || medications.length === 0) {
            return `<p class="typography-h4 text-muted">None currently recorded.</p>`;
        }

        return `
            <div class="flex-col gap-4">
                ${medications.map(med => `
                    <div class="flex justify-between items-baseline border-b pb-2" style="border-color: rgba(255,255,255,0.05);">
                        <span class="typography-h3" style="color: #ffffff;">${Utils.sanitizeString(med.name)}</span>
                        <span class="typography-h4 text-accent">${Utils.sanitizeString(med.dosage)}</span>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Provides a non-blocking skeleton loader for emergency initialization.
     * @private
     * @returns {string}
     */
    static _getSkeletonHtml() {
        return `
            <div class="emergency-lockscreen view-enter">
                <div class="w-full max-w-md mx-auto h-full flex-col">
                    <div class="skeleton skeleton-text mt-8" style="height: 64px; width: 80%;"></div>
                    <div class="skeleton skeleton-text mt-4" style="height: 40px; width: 50%;"></div>
                    <div class="skeleton skeleton-card mt-12" style="height: 120px;"></div>
                    <div class="skeleton skeleton-card mt-8" style="height: 200px;"></div>
                </div>
            </div>
        `;
    }

    /**
     * Provides an extreme fallback HTML if data fails to parse.
     * @private
     * @returns {string}
     */
    static _getErrorHtml() {
        return `
            <div class="emergency-lockscreen flex-col items-center justify-center p-6 text-center">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--clr-danger)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="mb-4"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                <h1 class="typography-display text-danger mb-4">DATA UNAVAILABLE</h1>
                <p class="typography-h4 mb-8">Unable to access local encrypted storage.</p>
                <a href="tel:911" class="btn btn-danger w-full flex justify-center py-4 typography-h3" style="height: auto;">CALL 911</a>
                <button id="btn-exit-error" class="btn btn-ghost mt-6 text-muted">Return to Dashboard</button>
            </div>
        `;
    }

    /**
     * Binds exit and interactive events.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindEvents(container) {
        const exitBtn = Utils.qs('#btn-exit-emergency', container) || Utils.qs('#btn-exit-error', container);
        
        if (exitBtn) {
            Utils.on(exitBtn, 'click', () => {
                this._releaseWakeLock();
                if (this._visibilityHandler) {
                    document.removeEventListener('visibilitychange', this._visibilityHandler);
                    this._visibilityHandler = null;
                }
                globalRouter.navigate('#/dashboard');
            });
        }
    }
}