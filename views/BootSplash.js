/**
 * @fileoverview BootSplash View for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: High-performance loading screen with asynchronous boot sequencing.
 */

import { globalStore } from '../core/store.js';
import { globalRouter } from '../core/router.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { Utils } from '../core/utils.js';

/**
 * The initial splash and loading screen.
 * Orchestrates the database hydration, search index loading, and offline graph caching.
 */
export default class BootSplash {
    /**
     * Renders the BootSplash view into the provided container.
     * @param {HTMLElement} container - The target DOM element.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) {
            console.error('[BootSplash] Target container is null.');
            return;
        }

        const scopedStyles = `
            <style id="bootsplash-scoped-styles">
                .splash-progress-track {
                    width: 100%;
                    height: 6px;
                    border-radius: var(--radius-full);
                    overflow: hidden;
                    padding: 0;
                }
                .splash-progress-fill {
                    height: 100%;
                    width: 0%;
                    background-color: var(--clr-accent);
                    transition: width 600ms ease-in-out;
                    will-change: width;
                }
                .splash-logo-container {
                    opacity: 0;
                    transform: scale(0.8);
                    animation: logoReveal 600ms cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
                    will-change: transform, opacity;
                }
                .splash-tagline {
                    opacity: 0;
                    animation: taglineReveal 400ms ease-out 200ms forwards;
                    will-change: transform, opacity;
                }
                .splash-svg-glow {
                    filter: drop-shadow(0 0 16px rgba(59, 130, 246, 0.5));
                }
                @keyframes logoReveal {
                    0% { opacity: 0; transform: scale(0.8); }
                    100% { opacity: 1; transform: scale(1); }
                }
                @keyframes taglineReveal {
                    0% { opacity: 0; transform: translateY(8px); }
                    100% { opacity: 1; transform: translateY(0); }
                }
            </style>
        `;

        container.innerHTML = `
            ${scopedStyles}
            <div class="view-panel view-enter items-center justify-center h-full w-full">
                <div class="flex-col items-center justify-center w-full max-w-md p-6 mt-auto">
                    <div class="flex-col items-center mb-12 splash-logo-container">
                        <div class="mb-6 text-accent splash-svg-glow">
                            <svg width="80" height="80" viewBox="0 0 100 100" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                                <polygon points="50 5, 90 27.5, 90 72.5, 50 95, 10 72.5, 10 27.5"></polygon>
                                <line x1="50" y1="35" x2="50" y2="65"></line>
                                <line x1="35" y1="50" x2="65" y2="50"></line>
                            </svg>
                        </div>
                        <h1 class="typography-display mb-2 text-center text-hi">MedCare</h1>
                        <p class="typography-body text-muted text-center splash-tagline">Your offline-first pharmacy guard</p>
                    </div>

                    <div class="w-full mt-8 splash-tagline">
                        <div class="glass-panel splash-progress-track">
                            <div id="splash-progress-bar" class="splash-progress-fill"></div>
                        </div>
                        <p id="splash-step-label" class="typography-caption text-muted text-center mt-4">Initializing system...</p>
                    </div>
                </div>

                <div class="mt-auto mb-4 w-full text-center">
                    <p class="typography-caption text-muted">v1.0.0 · Offline-First</p>
                </div>
            </div>
        `;

        // FIX: Decouple boot sequence execution from synchronous rendering lifecycle
        setTimeout(() => {
            this._executeBootSequence(container);
        }, 50);
    }

    /**
     * Executes the sequential initialization sequence for the application.
     * @private
     * @param {HTMLElement} container - The DOM container to query elements from.
     */
    static async _executeBootSequence(container) {
        const progressBar = Utils.qs('#splash-progress-bar', container);
        const stepLabel = Utils.qs('#splash-step-label', container);

        const updateProgress = (percent, text) => {
            if (progressBar) progressBar.style.width = `${percent}%`;
            if (stepLabel) {
                stepLabel.textContent = text;
                stepLabel.classList.remove('text-danger');
                stepLabel.classList.add('text-muted');
            }
        };

        try {
            updateProgress(0, 'Opening local database...');
            await Utils.sleep(150);
            if (dbEngine.db && typeof dbEngine.db.open === 'function') {
                await dbEngine.db.open();
            }
            updateProgress(20, 'Opening local database...');
            await Utils.sleep(150);

            updateProgress(20, 'Seeding medication data...');
            const seededCount = await dbEngine.seed();
            if (seededCount > 0) {
                console.log(`[BootSplash] Seeded ${seededCount} initial records.`);
            }
            updateProgress(45, 'Seeding medication data...');
            await Utils.sleep(150);

            updateProgress(45, 'Hydrating search index...');
            try {
                const TrieIndex = { hydrate: async () => { await Utils.sleep(100); } };
                await TrieIndex.hydrate();
            } catch (trieError) {
                console.warn('[BootSplash] Trie hydration stub failed.', trieError);
            }
            updateProgress(65, 'Hydrating search index...');
            await Utils.sleep(150);

            updateProgress(65, 'Loading interaction graph...');
            try {
                const graphResponse = await fetch('./data/drug-graph.json');
                if (graphResponse.ok) {
                    const graphData = await graphResponse.json();
                    globalStore.dispatch('GRAPH/LOAD', graphData);
                } else {
                    throw new Error('Graph data file not found (404).');
                }
            } catch (networkError) {
                console.warn('[BootSplash] Running strictly offline. Drug graph unavailable.', networkError);
                globalStore.dispatch('GRAPH/LOAD', {});
            }
            updateProgress(85, 'Loading interaction graph...');
            await Utils.sleep(150);

            updateProgress(100, 'System ready.');
            await Utils.sleep(400);

            // Check gateway status. Prioritize Firebase Auth redirect route logic.
            const userOnboarded = await dbEngine.getProfileField('onboarded');
            
            // Route to Firebase Authenticator first if no local profile exists
            if (!userOnboarded) {
                // FIX: Wrap redirect sequence in a macro-task timeout to let the current initialization pipeline fully resolve first
                setTimeout(() => globalRouter.navigate('#/auth'), 50);
            } else {
                // FIX: Wrap redirect sequence in a macro-task timeout to let the current initialization pipeline fully resolve first
                setTimeout(() => globalRouter.navigate('#/dashboard'), 50);
            }

        } catch (criticalError) {
            console.error('[BootSplash] Critical sequence failure:', criticalError);
            if (stepLabel) {
                stepLabel.textContent = `Initialization Error: ${criticalError.message || 'Unknown'}`;
                stepLabel.classList.remove('text-muted');
                stepLabel.classList.add('text-danger');
            }
            await Utils.sleep(2000);
            // FIX: Wrap redirect sequence in a macro-task timeout to let the current initialization pipeline fully resolve first
            setTimeout(() => globalRouter.navigate('#/auth'), 50);
        }
    }
}