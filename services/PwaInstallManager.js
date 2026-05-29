/**
 * @fileoverview PwaInstallManager — Autonomous Global Bottom Banner
 * Injects a floating native-style install banner without HTML wiring.
 */
import { hapticEngine } from './HapticEngine.js';

export default class PwaInstallManager {
  constructor() {
    // Singleton pattern: Ensure only one banner exists even if called multiple times
    if (window.__pwaManagerInstance) return window.__pwaManagerInstance;
    window.__pwaManagerInstance = this;

    this.deferredPrompt = null;
    this.bannerEl = null;
    this._init();
  }

  _init() {
    // If the app is already installed/standalone, do absolutely nothing.
    if (this._isStandalone()) return;

    this._createBanner();

    // Intercept Chrome/Android native prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this._showBanner('Tap to Install');
    });

    // Detect successful installation
    window.addEventListener('appinstalled', () => {
      this._hideBanner();
      setTimeout(() => { window.location.hash = '#/dashboard'; }, 600);
    });

    // iOS Safari & Desktop Fallback (Shows up after 2 seconds if OS blocks the prompt)
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

  _isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  _isIos() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    return /iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  _createBanner() {
    this.bannerEl = document.createElement('div');
    // Start completely hidden off the bottom of the screen
    this.bannerEl.className = 'fixed left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[9999] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none opacity-0';
    this.bannerEl.style.bottom = '-100px';

    this.bannerEl.innerHTML = `
      <div class="flex items-center justify-between p-4 bg-[#0a040f]/90 backdrop-blur-xl border border-[#ffb88c]/30 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,184,140,0.05)] pointer-events-auto cursor-pointer group">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7f2f5d] to-[#3d1228] border border-[#ffb88c]/20 flex items-center justify-center shadow-inner">
            <svg viewBox="0 0 24 24" fill="none" class="w-5 h-5" stroke="rgba(255,217,181,0.9)" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>
          </div>
          <div class="flex flex-col">
            <span class="text-white text-sm font-bold tracking-wide">MedCare App</span>
            <span id="pwa-banner-text" class="text-[#ffb88c] text-[10px] uppercase tracking-widest font-mono">Install Now</span>
          </div>
        </div>
        <div class="bg-[#ffb88c]/10 text-[#ffb88c] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide group-hover:bg-[#ffb88c]/20 transition-colors border border-[#ffb88c]/20">
          Get
        </div>
      </div>
    `;

    document.body.appendChild(this.bannerEl);

    // Global click listener for the banner
    this.bannerEl.addEventListener('click', async () => {
      if (hapticEngine) hapticEngine.triggerHaptic(30);
      
      if (this.deferredPrompt) {
        try {
          this.deferredPrompt.prompt();
          const { outcome } = await this.deferredPrompt.userChoice;
          if (outcome === 'accepted') {
            this._hideBanner();
          }
        } catch (err) {
          console.error('[PWA] Prompt blocked', err);
        } finally {
          this.deferredPrompt = null;
        }
      }
    });
  }

  _showBanner(subText) {
    if (!this.bannerEl) return;
    const textNode = this.bannerEl.querySelector('#pwa-banner-text');
    if (textNode) textNode.textContent = subText;
    
    // Slide up seamlessly into view
    this.bannerEl.style.opacity = '1';
    this.bannerEl.style.bottom = '24px';
  }

  _hideBanner() {
    if (!this.bannerEl) return;
    // Slide back down
    this.bannerEl.style.opacity = '0';
    this.bannerEl.style.bottom = '-100px';
  }
}
