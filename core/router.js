/**
 * @fileoverview Hash-Based Single Page Application (SPA) Router for MedCare PWA.
 * Architecture: Vanilla JS, Dynamic Imports, Middleware Pipeline, CSS Transitions.
 * Paradigm: Offline-First Edge Node.
 */

import { globalStore } from './store.js';

/**
 * Route definition object mapping hash paths to dynamic import functions.
 * Includes support for dynamic segments (e.g., :id).
 * @type {Object<string, function(): Promise<any>>}
 */
const ROUTE_MAP = {
    '#/splash': () => import('../views/BootSplash.js'),
    '#/auth': () => import('../views/AuthFlow.js'),
    '#/onboarding': () => import('../views/OnboardingFlow.js'),
    '#/dashboard': () => import('../views/DashboardHome.js'),
    '#/scan': () => import('../views/ScannerCamera.js'),
    '#/search': () => import('../views/SearchManual.js'),
    '#/interactions': () => import('../views/InteractionMatrix.js'),
    '#/family': () => import('../views/FamilyHub.js'),
    '#/emergency': () => import('../views/EmergencyCard.js'),
    '#/medication/:id': () => import('../views/MedicationDetail.js'),
    '#/adherence': () => import('../views/AdherenceReport.js'),
    '#/settings': () => import('../views/SettingsProfile.js'),
    '#/admin': () => import('../views/AdminSimulation.js')
};

/**
 * Core Router Class.
 * Handles hash-based navigation, middleware execution, view rendering, and DOM transitions.
 */
class Router {
    constructor() {
        /** @private {Array<string>} */
        this._history = [];
        
        /** @private {Object} */
        this._currentParams = {};
        
        /** @private {Array<Function>} */
        this._middlewares = [];
        
        /** @private {boolean} */
        this._isTransitioning = false;
        
        // FIX: Add a pending navigation queue tracking slot to resolve overlapping route race conditions
        this._pendingNavigation = null;

        this._setupBuiltInMiddleware();
    }

    /**
     * Initializes the router, attaches window event listeners, and triggers the initial route.
     */
    init() {
        console.groupCollapsed('[Router] Initialization Sequence');
        console.log('Mounting window listeners for hashchange and popstate.');
        
        window.addEventListener('hashchange', this._handleHashChange.bind(this));
        window.addEventListener('popstate', this._handlePopState.bind(this));

        const initialHash = window.location.hash;
        
        console.log(`Initial hash detected: ${initialHash || '(empty)'}`);
        console.groupEnd();

        if (!initialHash || initialHash === '#/') {
            this.navigate('#/splash');
        } else {
            this._handleHashChange();
        }
    }

    /**
     * Programmatically navigates to a specified route.
     * @param {string} route - The hash route to navigate to (e.g., '#/dashboard').
     * @param {Object} [params={}] - Optional parameters to pass to the view.
     */
    navigate(route, params = {}) {
        if (typeof route !== 'string' || !route.startsWith('#/')) {
            console.error(`[Router] Invalid route format: ${route}. Must start with '#/'.`);
            return;
        }

        this._currentParams = params;
        this._history.push(route);
        
        // FIX: If the window location hash is already identical to the target route (e.g., when flushing 
        // a post-auth queued navigation), the browser will not fire a 'hashchange' event. 
        // We must force call the handler manually here to prevent application transition freezes.
        if (window.location.hash === route) {
            this._handleHashChange();
        } else {
            window.location.hash = route;
        }
    }

    /**
     * Navigates back to the previous route in the internal history stack.
     * Fallback to '#/dashboard' if no history exists.
     */
    back() {
        if (this._history.length > 1) {
            this._history.pop(); // Remove current
            const previousRoute = this._history.pop(); // Get previous
            this.navigate(previousRoute);
        } else {
            console.warn('[Router] History stack empty. Defaulting to dashboard.');
            this.navigate('#/dashboard');
        }
    }

    /**
     * Registers a middleware function to intercept route changes.
     * @param {Function} middlewareFn - Function accepting (route, next).
     */
    use(middlewareFn) {
        if (typeof middlewareFn !== 'function') {
            throw new TypeError('[Router] Middleware must be a function.');
        }
        this._middlewares.push(middlewareFn);
    }

    /**
     * Internal event handler for hashchange. Kicks off the routing pipeline.
     * @private
     */
    async _handleHashChange() {
        if (this._isTransitioning) {
            // FIX: Store the blocked route destination in the queue buffer instead of dropping the navigation context silently
            const cleanedHash = window.location.hash || '#/dashboard';
            console.warn('[Router] Navigation blocked: queuing', cleanedHash);
            this._pendingNavigation = cleanedHash;
            return;
        }

        const rawHash = window.location.hash;
        
        // Execute middleware pipeline
        this._runMiddlewarePipeline(rawHash, 0, async () => {
            await this._renderPipeline(rawHash);
        });
    }

    /**
     * Internal event handler for popstate to sync internal history.
     * @private
     */
    _handlePopState() {
        // Popstate fires on browser back/forward buttons
        // Hashchange will also fire, so we just manage the history array here
        const currentHash = window.location.hash;
        if (this._history[this._history.length - 1] !== currentHash) {
            this._history.push(currentHash);
        }
    }

    /**
     * Executes middlewares sequentially.
     * @private
     * @param {string} route - The target route.
     * @param {number} index - Current middleware index.
     * @param {Function} onComplete - Executed when all middlewares pass.
     */
    _runMiddlewarePipeline(route, index, onComplete) {
        if (index >= this._middlewares.length) {
            onComplete();
            return;
        }

        const currentMiddleware = this._middlewares[index];
        currentMiddleware(route, () => {
            this._runMiddlewarePipeline(route, index + 1, onComplete);
        });
    }

    /**
     * Matches a raw hash against the route map, extracting dynamic parameters.
     * @private
     * @param {string} rawHash - The current window hash.
     * @returns {{ importFn: Function, routeParams: Object } | null}
     */
    _matchRoute(rawHash) {
        // Direct match
        if (ROUTE_MAP[rawHash]) {
            return { importFn: ROUTE_MAP[rawHash], routeParams: {} };
        }

        // Dynamic match (e.g., #/medication/:id)
        for (const [routePattern, importFn] of Object.entries(ROUTE_MAP)) {
            if (routePattern.includes(':')) {
                const regexPattern = routePattern.replace(/:[^\s/]+/g, '([^/]+)');
                const regex = new RegExp(`^${regexPattern}$`);
                const match = rawHash.match(regex);

                if (match) {
                    const paramNames = routePattern.match(/:[^\s/]+/g).map(name => name.substring(1));
                    const routeParams = {};
                    
                    paramNames.forEach((name, idx) => {
                        routeParams[name] = match[idx + 1];
                    });

                    return { importFn, routeParams };
                }
            }
        }

        return null;
    }

    /**
     * Orchestrates the DOM transition, dynamic module loading, and rendering.
     * @private
     * @param {string} targetRoute - The requested route string.
     */
    async _renderPipeline(targetRoute) {
        this._isTransitioning = true;
        globalStore.dispatch('APP/SET_LOADING', true);

        const viewport = document.querySelector('#app-viewport');
        if (!viewport) {
            console.error('[Router Fatal] #app-viewport element missing from DOM.');
            this._isTransitioning = false;
            return;
        }

        try {
            const matchedRoute = this._matchRoute(targetRoute);
            
            // 1. Exit Animation for current content
            if (viewport.firstElementChild) {
                viewport.classList.add('view-exit');
                await this._sleep(150); // Matches CSS motion rules
                viewport.innerHTML = '';
                viewport.classList.remove('view-exit');
            }

            // Merge dynamic URL params with programmatically passed params
            const finalParams = matchedRoute 
                ? { ...this._currentParams, ...matchedRoute.routeParams }
                : this._currentParams;
            
            // Clear current params for the next navigation
            this._currentParams = {};

            // 2. Resolve Module & Render
            if (matchedRoute) {
                console.log(`[Router] Fetching module for ${targetRoute}...`);
                const module = await matchedRoute.importFn();
                
                // Expecting default export as per architecture requirements
                const ViewClass = module.default;
                
                if (!ViewClass || typeof ViewClass.render !== 'function') {
                    throw new Error(`View module for ${targetRoute} must have a default export with a 'render' method.`);
                }

                await ViewClass.render(viewport, finalParams);
            } else {
                this._render404(viewport, targetRoute);
            }

            // 3. Enter Animation
            viewport.classList.add('view-enter');
            
            // Allow GPU to paint before completing transition lock
            requestAnimationFrame(() => {
                setTimeout(() => {
                    viewport.classList.remove('view-enter');
                    this._isTransitioning = false;
                    globalStore.dispatch('APP/SET_LOADING', false);
                    globalStore.dispatch('APP/SET_VIEW', targetRoute);
                    
                    // FIX: Safely flush, unlock, and execute the backlogged pending navigation target if one was queued
                    if (this._pendingNavigation) {
                        const pendingTarget = this._pendingNavigation;
                        this._pendingNavigation = null;
                        console.log('[Router] Executing queued navigation to', pendingTarget);
                        this.navigate(pendingTarget);
                    }
                }, 280); // Matches CSS viewEnter duration
            });

        } catch (error) {
            console.error(`[Router Fatal] Failed to render route: ${targetRoute}`, error);
            this._render404(viewport, targetRoute);
            this._isTransitioning = false;
            globalStore.dispatch('APP/SET_LOADING', false);
            
            // FIX: Safely flush, unlock, and execute the backlogged pending navigation target if one was queued
            if (this._pendingNavigation) {
                const pendingTarget = this._pendingNavigation;
                this._pendingNavigation = null;
                console.log('[Router] Executing queued navigation to', pendingTarget);
                this.navigate(pendingTarget);
            }
        }
    }

    /**
     * Renders an inline 404 error view if a route is not found or fails to load.
     * @private
     * @param {Element} container - The DOM element to render into.
     * @param {string} failedRoute - The route that caused the error.
     */
    _render404(container, failedRoute) {
        console.warn(`[Router] Rendering 404 for route: ${failedRoute}`);
        
        container.innerHTML = `
            <div class="view-panel" style="align-items: center; justify-content: center; text-align: center;">
                <div class="glass-panel max-w-md p-8">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--clr-danger)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto var(--sp-4) auto;">
                        <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"></polygon>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h1 class="typography-display mb-2">404</h1>
                    <h2 class="typography-h3 mb-4">Module Missing</h2>
                    <button class="btn btn-primary w-full" onclick="window.location.hash='#/auth'">
                        Return to Authenticator
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Utility sleep function to pause execution for CSS transition syncing.
     * @private
     * @param {number} ms - Milliseconds to delay.
     * @returns {Promise<void>}
     */
    _sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Configures mandatory system-level middlewares (e.g., Authorization).
     * @private
     */
    _setupBuiltInMiddleware() {
        this.use((route, next) => {
            const userState = globalStore.getState('user');
            
            // FIX: Append #/auth to the explicit public access allowance array
            const isPublicRoute = route === '#/splash' || route === '#/onboarding' || route === '#/auth';
            
            if (!userState.onboarded && !isPublicRoute) {
                console.warn('[Router Auth] User profile incomplete. Redirecting to auth flow.');
                this.navigate('#/auth');
                return; // Terminate pipeline
            }
            
            next();
        });
    }
}

// Export singleton instance of the Router
export const globalRouter = new Router();