/**
 * @fileoverview PwaInstallManager — Autonomous Global Bottom Banner
 * Injects a floating native-style install banner without local HTML wiring.
 */
import { hapticEngine } from './HapticEngine.js';

export default class PwaInstallManager {
  constructor() {
    // Singleton pattern: Ensure only one banner context exists across app views
    if (window.__pwaManagerInstance) return window.__pwaManagerInstance;
    window.__pwaManagerInstance = this;

    this.deferredPrompt = null;
    this.bannerEl = null;
    this._init();
  }

  /**
   * Initialize PWA setup listeners and verify environment
   * @private
   */
  _init() {
    // If the app is already launched as a standalone PWA, do nothing
    if (this._isStandalone()) return;

    this._createBanner();

    // Intercept Chrome/Android native engine install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this._showBanner('Tap to Install');
    });

    // Handle post-installation platform routing cleanly
    window.addEventListener('appinstalled', () => {
      this._hideBanner();
      setTimeout(() => { window.location.hash = '#/dashboard'; }, 600);
    });

    // iOS Safari and Desktop browser fallbacks
    setTimeout(() => {
      if (!this.deferredPrompt && !this._isStandalone()) {
        if (this._isIos()) {
          this._showBanner('Share → Add to Homescreen');
        } else {
          this._showBanner('Use Browser Menu to Install');
        }
      }
    }, 2000);
  }

  /**
   * Verifies if the app is currently running in standalone display mode
   * @private
   * @returns {boolean}
   */
  _isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  /**
   * Hardware detection for apple target environments
   * @private
   * @returns {boolean}
   */
  _isIos() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isIOSUA = /iphone|ipad|ipod/i.test(ua);
    const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOSUA || isTouchMac;
  }

  /**
   * Generates and injects the floating glassmorphic container to document root body
   * @private
   */
  _createBanner() {
    this.bannerEl = document.createElement('div');
    // Embedded Tailwind structural definitions matching warm luxury architecture
    this.bannerEl.className = 'fixed left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[9999] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none opacity-0';
    this.bannerEl.style.bottom = '-100px';

    this.bannerEl.innerHTML = `
      <div id="pwa-inner-card" class="flex items-center justify-between p-4 bg-[#0a040f]/90 backdrop-blur-xl border border-[#ffb88c]/30 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,184,140,0.05)] pointer-events-auto cursor-pointer group">
        <div class="flex items-center gap-3 pointer-events-none">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7f2f5d] to-[#3d1228] border border-[#ffb88c]/20 flex items-center justify-center shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" stroke="rgba(255,217,181,0.9)" stroke-width="2">
              <path d="M12 4v16m8-8H4"/>
            </svg>
          </div>
          <div class="flex flex-col">
            <span class="text-white text-sm font-bold tracking-wide">MedCare App</span>
            <span id="pwa-banner-text" class="text-[#ffb88c] text-[10px] uppercase tracking-widest font-mono">Install Now</span>
          </div>
        </div>
        <button id="pwa-action-btn" class="bg-[#ffb88c]/10 text-[#ffb88c] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide group-hover:bg-[#ffb88c]/20 transition-colors border border-[#ffb88c]/20 focus:outline-none">
          Get
        </button>
      </div>
    `;

    document.body.appendChild(this.bannerEl);

    // Click logic explicit update: Listen directly on the actionable card wrapper
    const card = this.bannerEl.querySelector('#pwa-inner-card');
    card.addEventListener('click', async (e) => {
      e.stopPropagation();
      
      if (hapticEngine) hapticEngine.triggerHaptic(30);
      
      if (this.deferredPrompt) {
        try {
          // Explicit prompt activation sequence
          this.deferredPrompt.prompt();
          const choiceResult = await this.deferredPrompt.userChoice;
          
          if (choiceResult.outcome === 'accepted') {
            console.log('[PWA Manager] User accepted native installation payload.');
            this._hideBanner();
            this.deferredPrompt = null; // Clear out only after interaction resolves
          } else {
            console.log('[PWA Manager] User dismissed native installation popup.');
          }
        } catch (err) {
          console.error('[PWA Manager] Prompt exception caught:', err);
        }
      } else {
        console.log('[PWA Manager] Trigger hit but native deferredPrompt is absent.');
      }
    });
  }

  /**
   * Slides the banner up into view
   * @private
   * @param {string} subText 
   */
  _showBanner(subText) {
    if (!this.bannerEl) return;
    const textNode = this.bannerEl.querySelector('#pwa-banner-text');
    if (textNode) textNode.textContent = subText;
    
    this.bannerEl.style.opacity = '1';
    this.bannerEl.style.bottom = '24px';
  }

  /**
   * Retracts the banner down out of view
   * @private
   */
  _hideBanner() {
    if (!this.bannerEl) return;
    this.bannerEl.style.opacity = '0';
    this.bannerEl.style.bottom = '-100px';
  }
}