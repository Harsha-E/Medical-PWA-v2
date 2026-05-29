/**
 * @fileoverview PwaManager � Custom Installation Flow & Standalone Detection
 */

export class PwaManager {
  constructor() {
    this.deferredPrompt = null;
    this.installBanner = null;
    this.dismissTimeout = null;
  }

  get isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  }

  init() {
    if (this.isStandalone) {
      document.body.classList.add('pwa-mode');
      return; // Already installed, do nothing
    }

    this._injectInstallBanner();
    this._attachInstallListeners();
  }

  _injectInstallBanner() {
    this.installBanner = document.createElement('div');
    this.installBanner.className = 'pwa-install-banner';
    this.installBanner.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 42px; height: 42px; border-radius: 12px; background: linear-gradient(135deg, #7f2f5d, #4a1532); display: flex; align-items: center; justify-content: center; border: 1px solid rgba(255,184,140,0.3);">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffb88c" stroke-width="2"><path d="M12 2v10M12 12l3-3M12 12l-3-3M2 22h20"/></svg>
          </div>
          <div style="display: flex; flex-direction: column;">
            <span style="color: white; font-size: 14px; font-weight: 700; letter-spacing: -0.02em;">Install MedCare</span>
            <span style="color: rgba(255,255,255,0.6); font-size: 11px;">Add to Home Screen</span>
          </div>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="pwa-install-btn" style="background: #ffb88c; color: #1a0a12; padding: 8px 16px; border-radius: 12px; font-weight: 700; font-size: 13px; border: none; cursor: pointer;">Install</button>
        </div>
      </div>
    `;
    document.body.appendChild(this.installBanner);

    this.installBanner.querySelector('#pwa-install-btn').addEventListener('click', () => this.handleInstall());
  }

  _attachInstallListeners() {
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault(); // Stop the ugly browser default
      this.deferredPrompt = e;
      // Show the install banner immediately (no dismiss option)
      this.manuallyShowBanner();
    });

    window.addEventListener('appinstalled', () => {
      this.installBanner.style.display = 'none';
      this.deferredPrompt = null;
      document.body.classList.add('pwa-mode');
    });
  }

  manuallyShowBanner() {
    if (this.installBanner && !this.isStandalone) {
      // Make banner visible and require explicit install
      this.installBanner.style.display = 'block';
    }
  }

  async handleInstall() {
    if (!this.deferredPrompt) return;
    this.installBanner.style.display = 'none';
    this.deferredPrompt.prompt();
    const { outcome } = await this.deferredPrompt.userChoice;
    this.deferredPrompt = null;
  }
}

export const pwaManager = new PwaManager();
