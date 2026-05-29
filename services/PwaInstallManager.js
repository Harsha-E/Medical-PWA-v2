/**
 * PwaInstallManager
 * Vanilla ES6 class to implement a native WebAPK installation flow.
 * - Intercepts `beforeinstallprompt` and stores `deferredPrompt`.
 * - Exposes `attachToButton()` to wire a custom UI button to `deferredPrompt.prompt()`.
 * - Awaits `deferredPrompt.userChoice` and nullifies the prompt after use.
 * - Listens to `appinstalled` for post-install routing.
 * - Provides an iOS fallback state instructing users to use: Share → Add to Homescreen.
 *
 * Usage example:
 * const installer = new PwaInstallManager({ onInstalled: () => location.hash = '#/dashboard' });
 * installer.attachToButton('#install-action');
 */

export default class PwaInstallManager {
  constructor(options = {}) {
    this.deferredPrompt = null;
    this.installButton = null;
    this._beforeInstallPromptFired = false;
    this._boundOnBeforeInstall = this._onBeforeInstall.bind(this);
    this._boundOnAppInstalled = this._onAppInstalled.bind(this);
    this._boundOnResize = this._noop.bind(this);

    // Options
    this.fallbackTimeout = typeof options.fallbackTimeout === 'number' ? options.fallbackTimeout : 2500;
    this.onInstalled = typeof options.onInstalled === 'function' ? options.onInstalled : () => {};
    this.onChange = typeof options.onChange === 'function' ? options.onChange : () => {};

    // Start listening
    this._init();
  }

  // Public: attach a DOM element or selector for install interaction
  attachToButton(buttonOrSelector) {
    if (!buttonOrSelector) return;
    let el = typeof buttonOrSelector === 'string' ? document.querySelector(buttonOrSelector) : buttonOrSelector;
    if (!el) return;
    this.installButton = el;
    this.installButton.setAttribute('aria-haspopup', 'dialog');
    this._updateButtonState();
    this._bindButton();
  }

  // Public: programmatically show the install prompt if available
  async showInstallPrompt() {
    if (!this.deferredPrompt) return { outcome: 'unavailable' };
    try {
      this.deferredPrompt.prompt();
      const choice = await this.deferredPrompt.userChoice;
      // Normalize outcome
      const outcome = choice && choice.outcome ? choice.outcome : 'dismissed';
      if (outcome === 'accepted') this.onChange('accepted');
      else this.onChange('dismissed');
      this.deferredPrompt = null;
      this._updateButtonState();
      return choice;
    } catch (err) {
      this.deferredPrompt = null;
      this._updateButtonState();
      throw err;
    }
  }

  // Stop listeners and teardown
  destroy() {
    window.removeEventListener('beforeinstallprompt', this._boundOnBeforeInstall);
    window.removeEventListener('appinstalled', this._boundOnAppInstalled);
    window.removeEventListener('resize', this._boundOnResize);
    if (this.installButton) this.installButton.removeEventListener('click', this._boundOnInstallClick);
  }

  // --- Internal ---
  _init() {
    // Intercept the event and prevent default mini-infobar
    window.addEventListener('beforeinstallprompt', this._boundOnBeforeInstall);
    window.addEventListener('appinstalled', this._boundOnAppInstalled);

    // If `beforeinstallprompt` never fires, switch to fallback after a short timeout
    // (iOS Safari blocks the API; other browsers may delay it until heuristics are satisfied)
    setTimeout(() => {
      if (!this._beforeInstallPromptFired) {
        // If iOS, immediately switch to fallback state
        if (this._isIos()) this.onChange('ios-fallback');
        else this.onChange('manual-fallback');
        this._updateButtonState();
      }
    }, this.fallbackTimeout);
  }

  _onBeforeInstall(e) {
    e.preventDefault(); // Stop Chrome from showing the mini-infobar
    this._beforeInstallPromptFired = true;
    this.deferredPrompt = e;
    this.onChange('ready');
    this._updateButtonState();
  }

  _onAppInstalled() {
    this.deferredPrompt = null;
    this.onChange('installed');
    this._updateButtonState();
    try { this.onInstalled(); } catch (e) { /* swallow */ }
  }

  _bindButton() {
    if (!this.installButton) return;
    this._boundOnInstallClick = this._onInstallClick.bind(this);
    this.installButton.addEventListener('click', this._boundOnInstallClick);
  }

  async _onInstallClick(e) {
    e && e.preventDefault && e.preventDefault();
    // Vibrate where supported to provide immediate feedback
    if (navigator.vibrate) navigator.vibrate(20);

    if (this.deferredPrompt) {
      this.installButton.disabled = true;
      this.installButton.classList.add('pwa-install--pending');
      this._updateButtonState('prompting');

      try {
        this.deferredPrompt.prompt();
        const choice = await this.deferredPrompt.userChoice;
        const outcome = choice && choice.outcome ? choice.outcome : 'dismissed';
        if (outcome === 'accepted') this.onChange('accepted');
        else this.onChange('dismissed');
      } catch (err) {
        this.onChange('error');
      } finally {
        this.deferredPrompt = null;
        this.installButton.disabled = false;
        this.installButton.classList.remove('pwa-install--pending');
        this._updateButtonState();
      }
    } else if (this._isIos()) {
      // iOS fallback: change the button text to a clear instruction
      this._showIosFallbackInstructions();
      this.onChange('ios-fallback');
    } else {
      // Generic fallback: instruct user to use browser's "Add to Home screen"
      this._showManualFallback();
      this.onChange('manual-fallback');
    }
  }

  _updateButtonState(tempState) {
    if (!this.installButton) return;
    const el = this.installButton;
    const state = tempState || (this.deferredPrompt ? 'ready' : (this._isIos() ? 'ios-fallback' : 'idle'));
    // Update accessible label and visible text conservatively
    switch (state) {
      case 'ready':
        el.textContent = 'Install App';
        el.dataset.pwaState = 'ready';
        el.title = 'Install this app to your device';
        break;
      case 'prompting':
        el.textContent = 'Installing…';
        el.dataset.pwaState = 'prompting';
        el.title = 'Waiting for OS install confirmation';
        break;
      case 'ios-fallback':
        el.textContent = 'Tap Share → Add to Homescreen';
        el.dataset.pwaState = 'ios-fallback';
        el.title = 'iOS: use Share → Add to Homescreen';
        break;
      case 'manual-fallback':
        el.textContent = 'Use browser menu → Add to Homescreen';
        el.dataset.pwaState = 'manual-fallback';
        el.title = 'Use your browser menu to add to homescreen';
        break;
      default:
        el.textContent = 'Install App';
        el.dataset.pwaState = 'idle';
        el.title = 'Install this app';
    }
  }

  _showIosFallbackInstructions() {
    if (!this.installButton) return;
    // For iOS we provide clear short text; apps may also show a tooltip or modal.
    this.installButton.textContent = 'Tap Share → Add to Homescreen';
    this.installButton.dataset.pwaState = 'ios-fallback';
    this.installButton.title = 'Open the Share sheet and choose Add to Homescreen';
  }

  _showManualFallback() {
    if (!this.installButton) return;
    this.installButton.textContent = 'Use browser menu → Add to Homescreen';
    this.installButton.dataset.pwaState = 'manual-fallback';
  }

  _isIos() {
    const ua = navigator.userAgent || navigator.vendor || window.opera;
    const isIOSUA = /iphone|ipad|ipod/i.test(ua);
    // iPadOS 13+ reports MacIntel, but supports touch — detect that too
    const isTouchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
    return isIOSUA || isTouchMac;
  }

  _noop() {}
}

// Usage snippet when included as a module in page scripts:
// import PwaInstallManager from './services/PwaInstallManager.js';
// const pwaInstaller = new PwaInstallManager({ onInstalled: () => { location.hash = '#/dashboard'; } });
// pwaInstaller.attachToButton('#install-action');
