/**
 * MEDCARE PWA - Application Bootstrapper
 * Architecture: ES6 Modules, Offline-First, Event Bus
 */

import { globalStore } from './core/store.js';
import { globalRouter } from './core/router.js';
import { dbEngine } from './services/DatabaseEngine.js';
import { Utils } from './core/utils.js';

const App = {
    // Expose core modules globally for easy access in HTML event listeners
    Store: globalStore,
    Router: globalRouter,
    DB: dbEngine,
    Utils: Utils,

    async boot() {
        console.log("[Kernel] Bootstrapping MedCare Architecture...");
        
        // 1. Register Service Worker for Offline Caching
        this.registerServiceWorker();
        
        try {
            // 2. Ignite Local Database
            await this.DB.open();
            
            // 3. Ignite Router (This will automatically navigate to #/splash)
            this.Router.init();

        } catch (error) {
            console.error("[Kernel Fatal] Boot sequence failed:", error);
            this.Utils.showToast("Critical system failure during boot.", "error");
        }
    },

    registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./sw.js')
                    .then(reg => console.log('[PWA] ServiceWorker scoped to:', reg.scope))
                    .catch(err => console.error('[PWA] ServiceWorker registration failed:', err));
            });
        }
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.boot());