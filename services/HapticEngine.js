/**
 * @fileoverview HapticEngine — Simulates Native 3D Touch / Long Press
 */

export class HapticEngine {
  constructor() {
    this.touchTimer = null;
    this.longPressThreshold = 400; // ms
    this.enableLogging = false;
  }

  init() {
    this._attachHapticInteractions();
  }

  triggerHaptic(pattern = 50) {
    if (navigator.vibrate) {
      navigator.vibrate(pattern);
      if (this.enableLogging) console.log(`[HapticEngine] Vibrate: ${pattern}ms`);
    }
  }

  _attachHapticInteractions() {
    // Prevent default context menu globally (except inputs)
    window.addEventListener('contextmenu', (e) => {
      if (!e.target.closest('input, textarea, [contenteditable="true"]')) {
        e.preventDefault();
      }
    });

    window.addEventListener('touchstart', (e) => {
      // Ignore interactive elements where long-press is expected natively
      if (e.target.closest('input, textarea, button, a, [role="button"], [data-haptic-ignore]')) return;
      
      this.touchTimer = setTimeout(() => {
        this.triggerHaptic();
      }, this.longPressThreshold);
    }, { passive: true });

    const cancelTouch = () => clearTimeout(this.touchTimer);
    window.addEventListener('touchmove', cancelTouch, { passive: true });
    window.addEventListener('touchend', cancelTouch, { passive: true });
    window.addEventListener('touchcancel', cancelTouch, { passive: true });
  }
}

export const hapticEngine = new HapticEngine();
