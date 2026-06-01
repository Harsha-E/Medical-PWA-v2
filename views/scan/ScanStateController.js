/**
 * @fileoverview Scan State Controller
 * Manages scanner state machines (IDLE, HUNTING, LOCKING, VERIFYING, RESULT),
 * state transitions, and auto-lock processes.
 */

export default class ScanStateController {
  /**
   * @param {Object} view - The main ScanView context
   */
  constructor(view) {
    this.view = view;
  }

  /**
   * Safe setter for Scanner state transitions.
   * @param {'IDLE'|'HUNTING'|'LOCKING'|'VERIFYING'|'RESULT'} newState
   * @returns {void}
   */
  setState(newState) {
    if (this.view.state === newState) return;
    this.view.state = newState;

    if (this.view._statusText) {
      switch (newState) {
        case 'IDLE':
          this.view._statusText.textContent = 'SYSTEM IDLE';
          this.view._statusText.style.color = '#ffffff';
          break;
        case 'HUNTING':
          this.view._statusText.textContent = 'HUNTING FOR MATCH';
          this.view._statusText.style.color = '#ffb88c';
          break;
        case 'LOCKING':
          this.view._statusText.textContent = 'ACQUIRING LOCK';
          this.view._statusText.style.color = '#10b981';
          break;
        case 'VERIFYING':
          this.view._statusText.textContent = 'VERIFYING DATA';
          this.view._statusText.style.color = '#3b82f6';
          break;
        case 'RESULT':
          this.view._statusText.textContent = 'LOCKED';
          this.view._statusText.style.color = '#10b981';
          this.triggerAutoLock();
          if (this.view.currentResults) {
            const cacheObj = { ...this.view.currentResults, croppedBlob: null };
            sessionStorage.setItem('medcare_scan_cache', JSON.stringify(cacheObj));
          }
          break;
      }
    }
  }

  /**
   * Auto-lock event: triggers haptic vibration, spawns particles, and opens bottom sheet.
   * @returns {void}
   */
  triggerAutoLock() {
    this.view.isAutoLocked = true;
    if (this.view._video) this.view._video.pause();

    // Trigger device vibration
    if (navigator.vibrate) {
      navigator.vibrate([30, 50, 30]);
    }

    if (this.view._autoCenter) {
      this.view._autoCenter.style.animation = 'pulseRing 1s ease-out forwards';
    }
    if (this.view._confText) {
      this.view._confText.textContent = 'LOCKED';
    }

    const vpRect = this.view.container.getBoundingClientRect();
    const cx = vpRect.width / 2;
    const cy = vpRect.height / 2;

    // Emit locked particle explosion
    for (let i = 0; i < 3; i++) {
      setTimeout(() => {
        this.view.overlay.emitTargetedParticleCloud(cx, cy, 100);
      }, i * 150);
    }

    setTimeout(() => {
      this.view.resultController.showResultSheet(this.view.currentResults);
    }, 500);
  }
}
