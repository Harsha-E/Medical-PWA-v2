/**
 * @fileoverview Onboarding Flow Wizard for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Multi-step interactive wizard with strict offline-first data handling.
 * Features: Client-side validation, custom cryptographic PIN pad, native permissions.
 */

import { globalStore } from '../core/store.js';
import { globalRouter } from '../core/router.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { cryptoVault } from '../services/CryptoVault.js';
import { notificationEngine } from '../services/NotificationEngine.js';
import { Utils } from '../core/utils.js';

// ============================================================================
// CONSTANTS
// ============================================================================
const ANIMATION_DURATION_MS = 250;
const TOTAL_STEPS = 5;

/**
 * Multi-step onboarding view initializing the user's encrypted local profile.
 */
export default class OnboardingFlow {
    /** @private {number} Current active step (0-4) */
    static _currentStep = 0;

    /** @private {Object} Aggregated user profile configuration */
    static _data = {
        name: '',
        bloodType: '',
        dob: '',
        weight: '',
        allergies: [],
        pin: null,
        permissions: { camera: false, notifications: false }
    };

    /** @private {'setup'|'confirm'} Current state of the PIN generation sequence */
    static _pinMode = 'setup';
    /** @private {string} Initial PIN entry buffer */
    static _tempPin = '';
    /** @private {string} Active PIN entry buffer */
    static _currentPinInput = '';
    /** @private {boolean} Flag indicating a PIN validation failure */
    static _pinError = false;

    /** @private {string} Active validation error message */
    static _validationError = '';

    /**
     * Initializes and renders the onboarding wizard into the designated viewport.
     * @param {HTMLElement} container - The target DOM element.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) return;

        // Reset wizard state on explicit render calls
        this._currentStep = 0;
        this._data = { name: '', bloodType: '', dob: '', weight: '', allergies: [], pin: null, permissions: {} };
        this._pinMode = 'setup';
        this._tempPin = '';
        this._currentPinInput = '';
        this._pinError = false;
        this._validationError = '';

        globalStore.dispatch('APP/SET_VIEW', '#/onboarding');

        // Inject foundational wizard layout and scoped animation rules
        container.innerHTML = `
            <style>
                .wizard-container { position: relative; width: 100%; height: 100%; overflow: hidden; display: flex; flex-direction: column; background: var(--clr-bg); }
                .wizard-track { position: relative; flex: 1; width: 100%; height: 100%; display: flex; }
                .wizard-step { position: absolute; inset: 0; display: flex; flex-direction: column; padding: var(--sp-4); padding-bottom: var(--sp-10); overflow-y: auto; overflow-x: hidden; }
                
                .step-dots { display: flex; justify-content: center; gap: var(--sp-1); padding: var(--sp-4) 0; z-index: var(--z-overlay); }
                .step-dot { width: var(--sp-1); height: var(--sp-1); border-radius: var(--radius-full); background: var(--clr-border-85); transition: background var(--time-base) ease, transform var(--time-base) ease; }
                .step-dot--active { background: var(--clr-accent); transform: scale(1.2); }
                .step-dot--completed { background: var(--clr-orange-light); }

                /* Transitions */
                .slide-in-right { animation: slideInRight ${ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .slide-out-left { animation: slideOutLeft ${ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .slide-in-left { animation: slideInLeft ${ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                .slide-out-right { animation: slideOutRight ${ANIMATION_DURATION_MS}ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }

                @keyframes slideInRight { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOutLeft { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-100%); opacity: 0; } }
                @keyframes slideInLeft { from { transform: translateX(-100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
                @keyframes slideOutRight { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }

                /* Pin Pad Styles */
                .pin-dots { display: flex; justify-content: center; gap: var(--sp-3); margin-bottom: var(--sp-6); }
                .pin-dot { width: var(--sp-2); height: var(--sp-2); border-radius: var(--radius-full); border: 2px solid var(--clr-text-lo); transition: all 150ms ease; }
                .pin-dot--filled { background: var(--clr-accent); border-color: var(--clr-accent); transform: scale(1.1); }
                .pin-dot--success { background: var(--clr-success); border-color: var(--clr-success); }
                .pin-dot--error { background: var(--clr-danger); border-color: var(--clr-danger); }
                
                .pin-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--sp-2); max-width: 320px; margin: 0 auto; }
                .pin-btn { height: var(--sp-10); border-radius: var(--radius-full); font-size: var(--fs-2xl); font-weight: 600; color: var(--clr-text-hi); background: var(--clr-glass-60); border: 1px solid var(--clr-border-88); box-shadow: var(--shadow-sm); cursor: pointer; transition: all 100ms ease; display: flex; align-items: center; justify-content: center; -webkit-tap-highlight-color: transparent; }
                .pin-btn:active { transform: scale(0.92); background: var(--clr-glass-85); }
                .pin-btn--empty { visibility: hidden; pointer-events: none; }

                .shake-animation { animation: shake 400ms cubic-bezier(.36,.07,.19,.97) both; }
                @keyframes shake { 10%, 90% { transform: translate3d(-2px, 0, 0); } 20%, 80% { transform: translate3d(4px, 0, 0); } 30%, 50%, 70% { transform: translate3d(-8px, 0, 0); } 40%, 60% { transform: translate3d(8px, 0, 0); } }

                /* SVG Animation */
                .welcome-shield { opacity: 0; transform: scale(0.9); animation: shieldReveal 800ms cubic-bezier(0.16, 1, 0.3, 1) forwards; }
                @keyframes shieldReveal { to { opacity: 1; transform: scale(1); } }
            </style>
            <div class="wizard-container">
                <div id="onboarding-dots" class="step-dots"></div>
                <div id="wizard-track" class="wizard-track"></div>
            </div>
        `;

        this._renderStepDots(container);
        this._mountStep(container, 'slide-in-right');
    }

    /**
     * Renders the progressive dot indicators mapping the user's location in the sequence.
     * @private
     * @param {HTMLElement} container - The host DOM context.
     */
    static _renderStepDots(container) {
        const dotsContainer = Utils.qs('#onboarding-dots', container);
        if (!dotsContainer) return;

        let dotsHtml = '';
        for (let i = 0; i < TOTAL_STEPS; i++) {
            let stateClass = '';
            if (i === this._currentStep) stateClass = 'step-dot--active';
            else if (i < this._currentStep) stateClass = 'step-dot--completed';
            dotsHtml += `<div class="step-dot ${stateClass}" aria-hidden="true"></div>`;
        }
        dotsContainer.innerHTML = dotsHtml;
    }

    /**
     * Orchestrates the transition injection of the active conceptual step.
     * @private
     * @param {HTMLElement} container - The root viewport element.
     * @param {string} animationClass - CSS class driving the entrance keyframes.
     */
    static _mountStep(container, animationClass) {
        const track = Utils.qs('#wizard-track', container);
        if (!track) return;

        const stepElement = Utils.createElement('div', ['wizard-step', animationClass]);
        
        switch (this._currentStep) {
            case 0: stepElement.innerHTML = this._getStep1Html(); break;
            case 1: stepElement.innerHTML = this._getStep2Html(); break;
            case 2: stepElement.innerHTML = this._getStep3Html(); break;
            case 3: stepElement.innerHTML = this._getStep4Html(); break;
            case 4: stepElement.innerHTML = this._getStep5Html(); break;
            default: return;
        }

        track.appendChild(stepElement);
        this._bindStepEvents(container, stepElement);

        // Remove the animation class upon completion to restore native scrolling
        setTimeout(() => {
            stepElement.classList.remove(animationClass);
        }, ANIMATION_DURATION_MS);
    }

    /**
     * Progresses the wizard forward or backward, executing the correlating transition animations.
     * @private
     * @param {HTMLElement} container - The root viewport.
     * @param {number} targetIndex - The numerical index of the target step.
     */
    static _transitionToStep(container, targetIndex) {
        const track = Utils.qs('#wizard-track', container);
        if (!track) return;

        const currentStepElement = track.lastElementChild;
        const isForward = targetIndex > this._currentStep;
        
        const outClass = isForward ? 'slide-out-left' : 'slide-out-right';
        const inClass = isForward ? 'slide-in-right' : 'slide-in-left';

        // Animate the active element out
        if (currentStepElement) {
            currentStepElement.classList.add(outClass);
            setTimeout(() => {
                currentStepElement.remove();
            }, ANIMATION_DURATION_MS);
        }

        this._currentStep = targetIndex;
        this._renderStepDots(container);
        this._mountStep(container, inClass);
    }

    // ============================================================================
    // STEP 1: WELCOME
    // ============================================================================
    
    /**
     * Generates the markup for the initial trust-building welcome screen.
     * @private
     * @returns {string}
     */
    static _getStep1Html() {
        return `
            <div class="flex-col items-center justify-center h-full text-center mt-6">
                <svg class="welcome-shield mb-8" width="120" height="140" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stop-color="var(--clr-orange-light)" />
                            <stop offset="50%" stop-color="var(--clr-orange-mid)" />
                            <stop offset="100%" stop-color="var(--clr-red-dark)" />
                        </linearGradient>
                    </defs>
                    <path d="M50 5 L90 25 L90 60 Q90 95 50 115 Q10 95 10 60 L10 25 Z" fill="url(#shieldGrad)"/>
                    <path d="M35 50 h10 v-10 h10 v10 h10 v10 h-10 v10 h-10 v-10 h-10 z" fill="#FFFFFF" opacity="0.95"/>
                </svg>
                
                <h1 class="typography-display mb-4">Your health,<br>in your hands.</h1>
                <p class="typography-body text-muted mb-8 max-w-md">MedCare keeps all your medication data secured on your device. Nothing leaves your phone. No accounts. No servers.</p>
                
                <div class="flex justify-center gap-4 mb-12 flex-wrap">
                    <div class="flex items-center gap-2"><span class="badge badge--neutral">🔒 100% Offline</span></div>
                    <div class="flex items-center gap-2"><span class="badge badge--neutral">🩺 No Cloud Storage</span></div>
                    <div class="flex items-center gap-2"><span class="badge badge--neutral">⚡ Instant Access</span></div>
                </div>

                <div class="mt-auto w-full max-w-md">
                    <button id="btn-next-1" class="btn btn-primary w-full">Get Started &rarr;</button>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // STEP 2: PROFILE SETUP
    // ============================================================================

    /**
     * Generates the markup for essential demographic and physical inputs.
     * @private
     * @returns {string}
     */
    static _getStep2Html() {
        return `
            <div class="flex-col h-full max-w-md w-full" style="margin: 0 auto;">
                <h2 class="typography-h1 mb-6">Tell us about you</h2>
                
                <div class="input-group">
                    <label class="typography-label" for="ob-name">Full Name <span class="text-danger">*</span></label>
                    <input type="text" id="ob-name" class="input-field" placeholder="Your name" value="${Utils.sanitizeString(this._data.name)}">
                </div>

                <div class="input-group">
                    <label class="typography-label" for="ob-blood">Blood Type</label>
                    <select id="ob-blood" class="input-field select-field">
                        <option value="" disabled ${!this._data.bloodType ? 'selected' : ''}>Select blood type</option>
                        ${['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(type => 
                            `<option value="${type}" ${this._data.bloodType === type ? 'selected' : ''}>${type}</option>`
                        ).join('')}
                    </select>
                </div>

                <div class="flex gap-4">
                    <div class="input-group" style="flex: 1;">
                        <label class="typography-label" for="ob-dob">Date of Birth</label>
                        <input type="date" id="ob-dob" class="input-field" value="${this._data.dob}">
                    </div>
                    <div class="input-group" style="flex: 1;">
                        <label class="typography-label" for="ob-weight">Weight (kg)</label>
                        <input type="number" id="ob-weight" class="input-field" placeholder="e.g. 70" min="1" max="300" value="${this._data.weight}">
                    </div>
                </div>

                ${this._validationError ? `<p class="typography-caption text-danger mt-2">${this._validationError}</p>` : ''}

                <div class="mt-auto pt-6 flex gap-4 w-full">
                    <button id="btn-back-2" class="btn btn-ghost flex-1">&larr; Back</button>
                    <button id="btn-next-2" class="btn btn-primary flex-1">Next &rarr;</button>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // STEP 3: ALLERGIES
    // ============================================================================

    /**
     * Generates the markup for the interactive dynamic allergy tagging interface.
     * @private
     * @returns {string}
     */
    static _getStep3Html() {
        const renderedTags = this._data.allergies.map(allergy => `
            <span class="badge badge--danger flex items-center gap-2">
                ${Utils.sanitizeString(allergy)}
                <button type="button" class="btn-remove-tag text-hi" data-tag="${Utils.sanitizeString(allergy)}" aria-label="Remove ${Utils.sanitizeString(allergy)}">✕</button>
            </span>
        `).join('');

        const commonAllergens = ['Penicillin', 'Sulfonamides', 'NSAIDs', 'Aspirin', 'Latex', 'Iodine'];
        const quickAdds = commonAllergens.map(allergen => `
            <button type="button" class="pill pill-neutral btn-quick-add" data-tag="${allergen}">+ ${allergen}</button>
        `).join('');

        return `
            <div class="flex-col h-full max-w-md w-full" style="margin: 0 auto;">
                <h2 class="typography-h1 mb-2">Known allergies</h2>
                <p class="typography-body text-muted mb-6">Tap to add common allergens or type your own to ensure safety cross-checks.</p>
                
                <div class="input-group mb-4">
                    <input type="text" id="ob-allergy-input" class="input-field" placeholder="Type allergy and press Enter...">
                </div>

                <div id="ob-tags-container" class="flex flex-wrap gap-2 mb-6 min-h-[40px]">
                    ${renderedTags}
                </div>

                <div class="divider"></div>
                <h3 class="typography-label mb-3">Quick Add</h3>
                <div class="flex flex-wrap gap-2 mb-6">
                    ${quickAdds}
                </div>

                <div class="mt-auto pt-6 flex gap-4 w-full">
                    <button id="btn-back-3" class="btn btn-ghost flex-1">&larr; Back</button>
                    <button id="btn-next-3" class="btn btn-primary flex-1">${this._data.allergies.length > 0 ? 'Next &rarr;' : 'No allergies &rarr;'}</button>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // STEP 4: SECURITY PIN
    // ============================================================================

    /**
     * Generates the markup for the specialized cryptographic PIN entry pad.
     * @private
     * @returns {string}
     */
    static _getStep4Html() {
        const headline = this._pinMode === 'setup' ? 'Set a security PIN' : 'Confirm your PIN';
        const description = this._pinMode === 'setup' 
            ? 'Your data is encrypted with this PIN. If forgotten, your vault cannot be recovered.'
            : 'Re-enter your PIN to verify the encryption parameters.';

        // Generate dot indicators mapping the input length
        let dotsHtml = '';
        const currentLength = this._currentPinInput.length;
        for (let i = 0; i < 4; i++) {
            let dotClass = 'pin-dot';
            if (this._pinError) dotClass += ' pin-dot--error';
            else if (this._pinMode === 'confirm' && currentLength === 4) dotClass += ' pin-dot--success';
            else if (i < currentLength) dotClass += ' pin-dot--filled';
            
            dotsHtml += `<div class="${dotClass}"></div>`;
        }

        // Generate 1-9, empty, 0, backspace numpad
        const keys = [1, 2, 3, 4, 5, 6, 7, 8, 9, '', 0, '⌫'];
        const gridHtml = keys.map(key => {
            if (key === '') return `<div class="pin-btn pin-btn--empty"></div>`;
            return `<button type="button" class="pin-btn num-key" data-val="${key}" aria-label="Key ${key}">${key}</button>`;
        }).join('');

        return `
            <div class="flex-col h-full max-w-md w-full" style="margin: 0 auto;">
                <h2 class="typography-h1 mb-2">${headline}</h2>
                <div class="card card--danger mb-8 p-4">
                    <p class="typography-caption" style="color: var(--clr-danger);">${description}</p>
                </div>
                
                <div class="pin-dots ${this._pinError ? 'shake-animation' : ''}">
                    ${dotsHtml}
                </div>

                <div class="pin-grid mb-8">
                    ${gridHtml}
                </div>

                <div class="mt-auto pt-6 flex gap-4 w-full">
                    <button id="btn-back-4" class="btn btn-ghost flex-1">&larr; Back</button>
                    ${this._pinMode === 'setup' ? `<button id="btn-skip-pin" class="btn btn-ghost flex-1 text-muted">Skip Security</button>` : ''}
                </div>
            </div>
        `;
    }

    // ============================================================================
    // STEP 5: PERMISSIONS & FINISH
    // ============================================================================

    /**
     * Generates the markup mapping system-level hardware and API access cards.
     * @private
     * @returns {string}
     */
    static _getStep5Html() {
        const camState = this._data.permissions.camera;
        const notifState = this._data.permissions.notifications;

        return `
            <div class="flex-col h-full max-w-md w-full" style="margin: 0 auto;">
                <h2 class="typography-h1 mb-2">One last thing</h2>
                <p class="typography-body text-muted mb-8">MedCare operates best with access to your device's native hardware.</p>

                <div class="card mb-4 flex items-center gap-4">
                    <div class="icon-box grad-purple"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg></div>
                    <div style="flex: 1;">
                        <h3 class="typography-label text-hi mb-1">Camera Access</h3>
                        <p class="typography-caption text-muted">Scan medication labels instantly via local OCR.</p>
                    </div>
                    ${camState 
                        ? `<span class="badge badge--success">Granted</span>` 
                        : `<button id="btn-allow-cam" class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px;">Allow</button>`
                    }
                </div>

                <div class="card mb-8 flex items-center gap-4">
                    <div class="icon-box grad-orange"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg></div>
                    <div style="flex: 1;">
                        <h3 class="typography-label text-hi mb-1">Notifications</h3>
                        <p class="typography-caption text-muted">Never miss a critical dose schedule.</p>
                    </div>
                    ${notifState 
                        ? `<span class="badge badge--success">Granted</span>` 
                        : `<button id="btn-allow-notif" class="btn btn-secondary" style="height: 36px; padding: 0 12px; font-size: 12px;">Allow</button>`
                    }
                </div>

                <div class="mt-auto pt-6 flex gap-4 w-full">
                    <button id="btn-back-5" class="btn btn-ghost flex-1">&larr; Back</button>
                    <button id="btn-finish" class="btn btn-primary flex-1" style="flex: 2;">Start Using MedCare &rarr;</button>
                </div>
            </div>
        `;
    }

    // ============================================================================
    // EVENT BINDING & BUSINESS LOGIC
    // ============================================================================

    /**
     * Attaches isolated, context-aware event listeners strictly for the active step layout.
     * @private
     * @param {HTMLElement} container - The root viewport element.
     * @param {HTMLElement} stepElement - The active transitioning step wrapper.
     */
    static _bindStepEvents(container, stepElement) {
        // Step 1
        const btnNext1 = Utils.qs('#btn-next-1', stepElement);
        if (btnNext1) Utils.on(btnNext1, 'click', () => this._transitionToStep(container, 1));

        // Step 2
        const btnBack2 = Utils.qs('#btn-back-2', stepElement);
        const btnNext2 = Utils.qs('#btn-next-2', stepElement);
        if (btnBack2) Utils.on(btnBack2, 'click', () => {
            this._validationError = '';
            this._transitionToStep(container, 0);
        });
        if (btnNext2) Utils.on(btnNext2, 'click', () => {
            const nameInput = Utils.qs('#ob-name', stepElement).value.trim();
            if (!nameInput) {
                this._validationError = 'Name is required to establish your medical vault.';
                this._mountStep(container, ''); // Trigger direct re-render to display error message
                return;
            }
            this._validationError = '';
            this._data.name = nameInput;
            this._data.bloodType = Utils.qs('#ob-blood', stepElement).value;
            this._data.dob = Utils.qs('#ob-dob', stepElement).value;
            this._data.weight = Utils.qs('#ob-weight', stepElement).value;
            this._transitionToStep(container, 2);
        });

        // Step 3
        const btnBack3 = Utils.qs('#btn-back-3', stepElement);
        const btnNext3 = Utils.qs('#btn-next-3', stepElement);
        const allergyInput = Utils.qs('#ob-allergy-input', stepElement);
        
        if (btnBack3) Utils.on(btnBack3, 'click', () => this._transitionToStep(container, 1));
        if (btnNext3) Utils.on(btnNext3, 'click', () => this._transitionToStep(container, 3));
        
        if (allergyInput) {
            Utils.on(allergyInput, 'keyup', (e) => {
                if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const newTag = allergyInput.value.replace(',', '').trim();
                    if (newTag && !this._data.allergies.includes(newTag)) {
                        this._data.allergies.push(newTag);
                        this._mountStep(container, ''); // Immediate re-render
                    }
                    allergyInput.value = '';
                }
            });
        }

        // Tag Deletion
        const removeBtns = Utils.qsAll('.btn-remove-tag', stepElement);
        removeBtns.forEach(btn => {
            Utils.on(btn, 'click', (e) => {
                const targetTag = e.currentTarget.getAttribute('data-tag');
                this._data.allergies = this._data.allergies.filter(a => a !== targetTag);
                this._mountStep(container, '');
            });
        });

        // Quick Adds
        const quickAddBtns = Utils.qsAll('.btn-quick-add', stepElement);
        quickAddBtns.forEach(btn => {
            Utils.on(btn, 'click', (e) => {
                const targetTag = e.currentTarget.getAttribute('data-tag');
                if (!this._data.allergies.includes(targetTag)) {
                    this._data.allergies.push(targetTag);
                    this._mountStep(container, '');
                }
            });
        });

        // Step 4
        const btnBack4 = Utils.qs('#btn-back-4', stepElement);
        const btnSkipPin = Utils.qs('#btn-skip-pin', stepElement);
        const numKeys = Utils.qsAll('.num-key', stepElement);
        
        if (btnBack4) Utils.on(btnBack4, 'click', () => {
            if (this._pinMode === 'confirm') {
                // Return to setup mode if backing out from confirmation
                this._pinMode = 'setup';
                this._tempPin = '';
                this._currentPinInput = '';
                this._mountStep(container, 'slide-in-left');
            } else {
                this._transitionToStep(container, 2);
            }
        });

        if (btnSkipPin) Utils.on(btnSkipPin, 'click', () => {
            this._data.pin = null;
            this._transitionToStep(container, 4);
        });

        numKeys.forEach(btn => {
            Utils.on(btn, 'click', (e) => {
                const val = e.currentTarget.getAttribute('data-val');
                this._pinError = false;

                if (val === '⌫') {
                    this._currentPinInput = this._currentPinInput.slice(0, -1);
                    this._mountStep(container, ''); // Re-render to update dots
                } else if (this._currentPinInput.length < 4) {
                    this._currentPinInput += val;
                    this._mountStep(container, ''); // Re-render to update dots

                    // Execute auto-validation when payload length is reached
                    if (this._currentPinInput.length === 4) {
                        setTimeout(() => this._handlePinCompletion(container), 200);
                    }
                }
            });
        });

        // Step 5
        const btnBack5 = Utils.qs('#btn-back-5', stepElement);
        const btnFinish = Utils.qs('#btn-finish', stepElement);
        const btnAllowCam = Utils.qs('#btn-allow-cam', stepElement);
        const btnAllowNotif = Utils.qs('#btn-allow-notif', stepElement);

        if (btnBack5) Utils.on(btnBack5, 'click', () => {
            this._currentPinInput = '';
            this._mountStep(container, 'slide-in-left');
            this._currentStep = 3;
            this._renderStepDots(container);
        });

        if (btnAllowCam) Utils.on(btnAllowCam, 'click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Requesting...';
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                // Release hardware track instantly, we only require the initial authorization mapping
                stream.getTracks().forEach(track => track.stop());
                this._data.permissions.camera = true;
            } catch (err) {
                console.warn('[Onboarding] Camera permission denied.', err);
                this._data.permissions.camera = false;
                Utils.showToast('Camera permission denied.', 'warn');
            }
            this._mountStep(container, '');
        });

        if (btnAllowNotif) Utils.on(btnAllowNotif, 'click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Requesting...';
            try {
                const granted = await notificationEngine.requestPermission();
                this._data.permissions.notifications = granted;
                if (!granted) Utils.showToast('Notification permission denied.', 'warn');
            } catch (err) {
                this._data.permissions.notifications = false;
            }
            this._mountStep(container, '');
        });

        if (btnFinish) Utils.on(btnFinish, 'click', async (e) => {
            const btn = e.currentTarget;
            btn.disabled = true;
            btn.textContent = 'Securing Vault...';
            await this._finalizeOnboarding();
        });
    }

    /**
     * Evaluates the sequence conditions upon a full 4-digit PIN entry sequence.
     * @private
     * @param {HTMLElement} container - The host DOM context.
     */
    static _handlePinCompletion(container) {
        if (this._pinMode === 'setup') {
            // Buffer the established sequence and shift to secondary confirmation mode
            this._tempPin = this._currentPinInput;
            this._pinMode = 'confirm';
            this._currentPinInput = '';
            this._mountStep(container, 'slide-in-right');
        } else if (this._pinMode === 'confirm') {
            if (this._tempPin === this._currentPinInput) {
                // PIN Authenticated
                this._data.pin = this._tempPin;
                this._transitionToStep(container, 4);
            } else {
                // PIN Mismatch Detected
                this._pinError = true;
                this._currentPinInput = '';
                this._mountStep(container, '');
                Utils.showToast('PIN entries do not match. Please verify.', 'error');
            }
        }
    }

    /**
     * Submits the aggregated configuration payload to local encrypted memory banks.
     * Concludes the setup wizard and routs the active user to the unified dashboard.
     * @private
     * @returns {Promise<void>}
     */
    static async _finalizeOnboarding() {
        try {
            // Persist standard relational datasets into the database engine
            await dbEngine.setProfileField('name', this._data.name);
            await dbEngine.setProfileField('bloodType', this._data.bloodType);
            await dbEngine.setProfileField('dob', this._data.dob);
            await dbEngine.setProfileField('weight', this._data.weight);
            await dbEngine.setProfileField('allergies', this._data.allergies);
            await dbEngine.setProfileField('onboarded', true);

            // Establish the AES-GCM local cryptographic vault lock
            if (this._data.pin) {
                await cryptoVault.setupPin(this._data.pin);
            }

            // Sync structural states up into the Redux-like event matrix
            globalStore.dispatch('USER/SET_PROFILE', {
                name: this._data.name,
                bloodType: this._data.bloodType,
                allergies: this._data.allergies,
                onboarded: true
            });

            // Conclude interaction cycle
            globalRouter.navigate('#/dashboard');

        } catch (fatalError) {
            console.error('[OnboardingFlow:Finalize] Write cycle to encrypted node failed:', fatalError);
            Utils.showToast('Catastrophic failure securing local vault parameters.', 'error');
            
            // Re-enable interactive block elements on failure condition
            const finishBtn = document.getElementById('btn-finish');
            if (finishBtn) {
                finishBtn.disabled = false;
                finishBtn.textContent = 'Start Using MedCare →';
            }
        }
    }
}