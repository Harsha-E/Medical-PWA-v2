/**
 * @fileoverview Scan State Controller
 * Manages the 13-state architecture (7 core states + 6 failure sub-states)
 * and handles transitions and side-effects.
 */

import { dexieManager } from '../../storage/DexieManager.js';

export default class ScanStateController {
  constructor(view) {
    this.view = view;
  }

  /**
   * Sets the core state.
   * Core States: IDLE, SEARCHING, LOCKING, TRACKING, RECOVERING, VALIDATING, IDENTIFIED, FAILED
   */
  setState(newState, failureReason = null) {
    if (this.view.state === newState) return;
    this.view.state = newState;

    if (this.view._statusText) {
      switch (newState) {
        case 'IDLE':
          this.view._statusText.textContent = 'SYSTEM IDLE';
          this.view._statusText.style.color = '#ffffff';
          break;
        case 'SEARCHING':
          this.view._statusText.textContent = 'SEARCHING...';
          this.view._statusText.style.color = '#ffffff';
          break;
        case 'LOCKING':
          this.view._statusText.textContent = 'ACQUIRING LOCK';
          this.view._statusText.style.color = '#fbbf24'; // Amber
          break;
        case 'TRACKING':
          this.view._statusText.textContent = 'TRACKING STRIP';
          this.view._statusText.style.color = '#60a5fa'; // Blue
          break;
        case 'RECOVERING':
          this.view._statusText.textContent = 'STRIP LOST. RECOVERING...';
          this.view._statusText.style.color = '#f43f5e'; // Rose
          break;
        case 'VALIDATING':
          this.view._statusText.textContent = 'VALIDATING MATCH';
          this.view._statusText.style.color = '#a78bfa'; // Purple
          break;
        case 'IDENTIFIED':
          this.view._statusText.textContent = 'IDENTIFIED';
          this.view._statusText.style.color = '#10b981'; // Emerald
          
          if (this.view.currentResults) {
            dexieManager.getDB().then(db => {
               db.scan_cache.put({ id: 'latest_scan', ...this.view.currentResults });
            });
          }
          
          this.triggerAutoLock();
          break;
        case 'FAILED':
          this.view._statusText.textContent = `FAILED: ${failureReason || 'UNKNOWN'}`;
          this.view._statusText.style.color = '#ef4444'; // Red
          break;
      }
    }
  }

  /**
   * Auto-lock event triggered when IDENTIFIED.
   */
  triggerAutoLock() {
    this.view.isAutoLocked = true;
    if (this.view._video) this.view._video.pause();

    // Trigger device vibration safely
    if (navigator.vibrate && navigator.userActivation && navigator.userActivation.hasBeenActive) {
      try {
        navigator.vibrate([30, 50, 30]);
      } catch (e) {
        // Ignore if blocked
      }
    }

    if (this.view._autoCenter) {
      this.view._autoCenter.style.animation = 'pulseRing 1s ease-out forwards';
    }
    if (this.view._confText) {
      this.view._confText.textContent = '100%';
    }

    const vpRect = this.view.container.getBoundingClientRect();
    const cx = vpRect.width / 2;
    const cy = vpRect.height / 2;

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
