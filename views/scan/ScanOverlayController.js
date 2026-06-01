/**
 * @fileoverview Scan Overlay Controller
 * Manages terminal overlay logs, visual progress rings, and locked particle animations.
 */

export default class ScanOverlayController {
  /**
   * @param {Object} view - The main ScanView context
   */
  constructor(view) {
    this.view = view;
  }

  /**
   * Updates the visual confidence radar progress circle and status.
   * @returns {void}
   */
  updateConfidenceUI() {
    if (!this.view._confRing || !this.view._confText || !this.view._autoCenter) return;

    const offset = 283 - (this.view.confidenceTracker / 100) * 283;
    this.view._confRing.style.strokeDashoffset = offset;
    this.view._confText.textContent = `${Math.floor(this.view.confidenceTracker)}%`;

    if (this.view.confidenceTracker > 50) {
      this.view._autoCenter.style.background = 'rgba(16,185,129,0.3)';
      this.view._autoCenter.style.borderColor = 'rgba(16,185,129,0.8)';
    } else {
      this.view._autoCenter.style.background = 'rgba(16,185,129,0.1)';
      this.view._autoCenter.style.borderColor = 'rgba(16,185,129,0.3)';
    }
  }

  /**
   * Appends a log line inside the green terminal diagnostic log block.
   * @param {string} msg
   * @returns {void}
   */
  appendLog(msg) {
    if (this.view._terminalLog) {
      const line = document.createElement('div');
      line.textContent = `> ${msg}`;
      this.view._terminalLog.appendChild(line);
      this.view._terminalLog.scrollTop = this.view._terminalLog.scrollHeight;
    }
  }

  /**
   * Updates coordinates of active overlay particles (haptic animation loop).
   * @returns {void}
   */
  updateParticles() {
    if (!this.view.targetBBox) return;

    for (let i = this.view.particles.length - 1; i >= 0; i--) {
      const p = this.view.particles[i];
      p.life -= p.decay;

      if (p.life <= 0) {
        p.el.remove();
        this.view.particles.splice(i, 1);
        continue;
      }

      const currentX = this.view.targetBBox.x0 + p.offsetX;
      const currentY = this.view.targetBBox.y0 + p.offsetY;

      p.el.style.left = `${currentX}px`;
      p.el.style.top = `${currentY}px`;
      p.el.style.opacity = p.life;
      p.el.style.transform = `scale(${p.life})`;
    }
  }

  /**
   * Spawns particle clouds centered on the bounding box of matched text.
   * @param {Object} bbox
   * @returns {void}
   */
  spawnPinnedParticles(bbox) {
    if (!bbox || !this.view._particleHost) return;

    const vpRect = this.view.container.getBoundingClientRect();
    let x0, y0, x1, y1;

    if (this.view._video && this.view._video.videoWidth > 0) {
      const vW = this.view._video.videoWidth;
      const vH = this.view._video.videoHeight;
      const scale = Math.max(vpRect.width / vW, vpRect.height / vH);
      const scaledW = vW * scale;
      const scaledH = vH * scale;
      const offsetX = (vpRect.width - scaledW) / 2;
      const offsetY = (vpRect.height - scaledH) / 2;

      x0 = bbox.x0 * scale + offsetX;
      y0 = bbox.y0 * scale + offsetY;
      x1 = bbox.x1 * scale + offsetX;
      y1 = bbox.y1 * scale + offsetY;
    } else {
      x0 = bbox.x0; y0 = bbox.y0; x1 = bbox.x1; y1 = bbox.y1;
    }

    this.view.targetBBox = { x0, y0, x1, y1, width: x1 - x0, height: y1 - y0 };

    for (let i = 0; i < 40; i++) {
      const p = {
        el: document.createElement('div'),
        offsetX: Math.random() * this.view.targetBBox.width,
        offsetY: Math.random() * this.view.targetBBox.height,
        life: 1.0,
        decay: 0.015 + Math.random() * 0.02
      };
      p.el.className = 'particle-dot';
      const size = 3 + Math.random() * 5;
      p.el.style.cssText = `
        position: absolute;
        width: ${size}px; height: ${size}px;
        background: #10b981;
        border-radius: 50%;
        pointer-events: none;
        box-shadow: 0 0 ${size * 3}px #10b981;
        z-index: 100;
      `;
      this.view._particleHost.appendChild(p.el);
      this.view.particles.push(p);
    }
  }

  /**
   * Emits a radial wave of particles on the center of the viewport during locking.
   * @param {number} cx
   * @param {number} cy
   * @param {number} [spread=40]
   * @returns {void}
   */
  emitTargetedParticleCloud(cx, cy, spread = 40) {
    if (!this.view._particleHost) return;

    for (let i = 0; i < 15; i++) {
      const el = document.createElement('div');
      el.className = 'particle-dot';
      const px = cx + (Math.random() - 0.5) * spread;
      const py = cy + (Math.random() - 0.5) * spread;
      const size = 3 + Math.random() * 5;
      el.style.cssText = `
        width: ${size}px; height: ${size}px; background: #10b981;
        left: ${px}px; top: ${py}px; --dur: ${0.8 + Math.random()}s;
        opacity: 0; box-shadow: 0 0 ${size * 3}px #10b981;
      `;
      this.view._particleHost.appendChild(el);
      setTimeout(() => el.remove(), 1800);
    }
  }
}
