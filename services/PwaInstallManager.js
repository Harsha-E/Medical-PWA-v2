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
  async _init() {
    this._runDiagnostics();

    // If the app is already launched as a standalone PWA, do nothing
    if (this._isStandalone()) {
      return;
    }

    this._createBanner();

    // Connect to early-captured prompt or listen for new ones
    const handlePrompt = (e) => {
      e.preventDefault();
      this.deferredPrompt = e;
      this._showBanner('Tap to Install');
      this.onChange?.('ready');
    };

    if (window.deferredInstallPrompt) {
      handlePrompt(window.deferredInstallPrompt);
    }
    window.addEventListener('beforeinstallprompt', handlePrompt);

    // Handle post-installation platform routing cleanly
    window.addEventListener('appinstalled', () => {
      const btn = this.bannerEl?.querySelector('#pwa-action-btn');
      if (btn) {
        btn.textContent = 'Open App';
        btn.classList.add('bg-[#10b981]/20', 'text-[#10b981]', 'border-[#10b981]/50');
        btn.classList.remove('text-[#ffb88c]', 'border-[#ffb88c]/20', 'opacity-70', 'cursor-not-allowed');
      }
      
      const textNode = this.bannerEl?.querySelector('#pwa-banner-text');
      if (textNode) textNode.textContent = 'Ready on Homescreen';
      
      // Enforce visibility restriction for "Open App" state
      if (!window.location.hash.startsWith('#/install')) {
        this._hideBanner();
      }
    });

    // Listen to route changes to strictly control "Open App" banner visibility
    window.addEventListener('hashchange', () => {
      const btn = this.bannerEl?.querySelector('#pwa-action-btn');
      if (btn && btn.textContent === 'Open App') {
        if (window.location.hash.startsWith('#/install')) {
          this._showBanner('Ready on Homescreen');
        } else {
          this._hideBanner();
        }
      }
    });

    await this._validateInstallability();
  }

  _runDiagnostics() {
  }

  async _validateInstallability() {
    const errors = [];

    // Check SW
    if (!navigator.serviceWorker) {
      errors.push('Service Worker API not supported by browser.');
    } else {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg?.active) {
        errors.push('No active service worker.');
      } else {
        if (navigator.serviceWorker.controller) {
        }
      }
    }

    // Check Manifest
    try {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) {
        errors.push('Manifest link tag missing from document.');
      } else {
        const res = await fetch(manifestLink.href);
        if (!res.ok) {
          errors.push(`Manifest fetch failed with status ${res.status}`);
        } else {
          const manifest = await res.json();
          if (!manifest.display || manifest.display !== 'standalone') errors.push('Manifest display is not "standalone".');
          if (!manifest.start_url) errors.push('Manifest start_url is missing or invalid.');
          
          if (!manifest.icons || !Array.isArray(manifest.icons)) {
            errors.push('Manifest icons array missing.');
          } else {
            const has192 = manifest.icons.some(i => i.sizes && i.sizes.includes('192x192'));
            const has512 = manifest.icons.some(i => i.sizes && i.sizes.includes('512x512'));
            if (!has192) errors.push('Manifest icon 192x192 missing.');
            if (!has512) errors.push('Manifest icon 512x512 missing.');
            // if (has192 && has512) console.log('[PWA] Manifest icons valid');
          }
        }
      }
    } catch (e) {
      errors.push(`Manifest validation error: ${e.message}`);
    }

    if (errors.length > 0) {
      console.error('[PWA] Installability requirements not satisfied:');
      errors.forEach(err => console.error(` - ${err}`));
    } else {
      if (this.deferredPrompt || window.deferredInstallPrompt) {
      }
    }
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
   * Generates and injects the floating glassmorphic container to document root body
   * @private
   */
  _createBanner() {
    this.bannerEl = document.createElement('div');
    // Embedded Tailwind structural definitions matching warm luxury architecture
    this.bannerEl.className = 'fixed left-1/2 -translate-x-1/2 w-[90%] max-w-sm z-[9999] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] pointer-events-none opacity-0';
    this.bannerEl.style.bottom = '-100px';

    this.bannerEl.innerHTML = `
      <div id="pwa-inner-card" class="flex items-center justify-between p-4 bg-[#0a040f]/90 backdrop-blur-xl border border-[#ffb88c]/30 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.8),inset_0_0_20px_rgba(255,184,140,0.05)] pointer-events-auto group">
        <div class="flex items-center gap-3 cursor-pointer" id="pwa-main-action-area">
          <img src="./assets/logo.webp" class="w-10 h-10 rounded-xl border border-[#ffb88c]/20 object-cover shadow-inner" alt="MedCare Logo" />
          <div class="flex flex-col">
            <span class="text-white text-sm font-bold tracking-wide">MedCare App</span>
            <span id="pwa-banner-text" class="text-[#ffb88c] text-[10px] uppercase tracking-widest font-mono">Install Now</span>
          </div>
        </div>
        <div class="flex items-center gap-2">
          <button id="pwa-not-now-btn" class="text-gray-400 hover:text-white px-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wide transition-colors focus:outline-none">
            Not Now
          </button>
          <button id="pwa-action-btn" class="bg-[#ffb88c]/10 text-[#ffb88c] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wide hover:bg-[#ffb88c]/20 transition-colors border border-[#ffb88c]/20 focus:outline-none whitespace-nowrap cursor-pointer">
            Install
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(this.bannerEl);

    const mainActionArea = this.bannerEl.querySelector('#pwa-main-action-area');
    const actionBtn = this.bannerEl.querySelector('#pwa-action-btn');
    const notNowBtn = this.bannerEl.querySelector('#pwa-not-now-btn');

    const handleInstallClick = (e) => {
      e.stopPropagation();
      if (hapticEngine) hapticEngine.triggerHaptic(30);
      
      if (actionBtn && actionBtn.textContent.trim() === 'Update') {
        if (this._waitingServiceWorker) {
            this._waitingServiceWorker.postMessage({ type: 'SKIP_WAITING' });
            actionBtn.textContent = 'Updating...';
            setTimeout(() => window.location.reload(), 1000);
        }
        return;
      }
      
      if (actionBtn && actionBtn.textContent.trim() === 'Open App') {
        return;
      }

      this.install();
    };

    mainActionArea.addEventListener('click', handleInstallClick);
    actionBtn.addEventListener('click', handleInstallClick);

    notNowBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      sessionStorage.setItem('pwa_dismissed', 'true');
      this._hideBanner();
    });

    this._listenForUpdates();
  }

  _listenForUpdates() {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(reg => {
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              this._waitingServiceWorker = newWorker;
              this._showUpdateBanner();
            }
          });
        });
      });
    }
  }

  _showUpdateBanner() {
    if (!this.bannerEl) this._createBanner();
    this._showBanner('New Version Available');
    const btn = this.bannerEl.querySelector('#pwa-action-btn');
    if (btn) {
      btn.textContent = 'Update App';
      btn.classList.add('bg-amber-500/20', 'text-amber-400', 'border-amber-500/50');
      btn.classList.remove('text-[#ffb88c]', 'border-[#ffb88c]/20');
    }
  }

  async install() {
    if (!this.deferredPrompt) {
      console.error('[PWA] Native install prompt unavailable');
      console.error('[PWA] Installability requirements not satisfied');
      return;
    }

    try {
      const btn = this.bannerEl.querySelector('#pwa-action-btn');
      if (btn) {
        btn.textContent = 'Installing...';
        btn.disabled = true;
        btn.classList.add('opacity-70', 'cursor-not-allowed');
      }

      await this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;

      if (choice.outcome === 'accepted') {
        this.onChange?.('accepted');
      }

      if (choice.outcome === 'dismissed') {
        this.onChange?.('dismissed');
        if (btn) {
          btn.textContent = 'Install App';
          btn.disabled = false;
          btn.classList.remove('opacity-70', 'cursor-not-allowed');
        }
      }
    } catch (err) {
      console.error('[PWA Manager] Prompt exception caught:', err);
    }

    this.deferredPrompt = null;
  }

  /**
   * Slides the banner up into view
   * @private
   * @param {string} subText 
   */
  _showBanner(subText) {
    if (!this.bannerEl) return;
    if (sessionStorage.getItem('pwa_dismissed') === 'true') return;
    
    const textNode = this.bannerEl.querySelector('#pwa-banner-text');
    if (textNode) textNode.textContent = subText;
    
    this.bannerEl.style.opacity = '1';
    this.bannerEl.style.pointerEvents = 'auto';
    this.bannerEl.style.bottom = '24px';
  }

  /**
   * Retracts the banner down out of view
   * @private
   */
  _hideBanner() {
    if (!this.bannerEl) return;
    this.bannerEl.style.opacity = '0';
    this.bannerEl.style.pointerEvents = 'none';
    this.bannerEl.style.bottom = '-100px';
  }
}