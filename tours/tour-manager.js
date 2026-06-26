/**
 * @fileoverview TourManager — Schema-driven, mobile-first onboarding walkthrough engine
 */

const STORAGE_KEY        = 'medcare_tour_completed';
const STORAGE_STEP_KEY   = 'medcare_tour_step';
const MOBILE_BREAKPOINT  = 768;
const TOOLTIP_MARGIN     = 16;   // px gap between highlight rect and tooltip
const OVERLAY_Z          = 8000;
const TOOLTIP_Z          = 8001;
const GUIDE_Z            = 8002;

class TourManager {
  constructor() {
    this._tours         = new Map();
    this._activeTourId  = null;
    this._currentStep   = 0;
    this._steps         = [];         // resolved steps for active tour
    this._overlayEl     = null;
    this._tooltipEl     = null;
    this._guideEl       = null;
    this._resizeObs     = null;
    this._scrollHandler = null;
    this._keyHandler    = null;
    this._guide         = null;       // GuideCharacter instance
    this._isMobile      = () => window.innerWidth < MOBILE_BREAKPOINT;
  }

  // ─── REGISTRATION ──────────────────────────────────────────────────────────

  /**
   * Register one or more tours.
   * @param {TourConfig | TourConfig[]} tours
   */
  register(tours) {
    const list = Array.isArray(tours) ? tours : [tours];
    list.forEach(t => this._tours.set(t.id, t));
    return this;
  }

  // ─── PUBLIC API ────────────────────────────────────────────────────────────

  /**
   * Start a tour by id.
   * @param {string} tourId
   * @param {Object} [opts]
   * @param {boolean} [opts.force]    — Start even if already completed
   * @param {number}  [opts.fromStep] — Start from a specific step index
   */
  start(tourId, opts = {}) {
    const tour = this._tours.get(tourId);
    if (!tour) { console.warn(`[TourManager] Unknown tour: "${tourId}"`); return; }

    // Respect completion state unless forced
    const completed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    if (!opts.force && completed.includes(tourId)) return;

    this._activeTourId = tourId;
    this._steps        = this._resolveSteps(tour.steps);
    if (this._steps.length === 0) return;

    // Restore step if interrupted
    const savedStep = opts.fromStep
      ?? parseInt(localStorage.getItem(`${STORAGE_STEP_KEY}_${tourId}`) || '0', 10);
    this._currentStep = Math.min(savedStep, this._steps.length - 1);

    this._buildOverlay();
    this._buildTooltip();
    this._guide = new GuideCharacter();
    this._guide.mount(document.body, GUIDE_Z);
    this._attachGlobalListeners();
    this._showStep(this._currentStep);
  }

  /** Move to the next step or finish if at end */
  next() {
    if (this._currentStep < this._steps.length - 1) {
      this._currentStep++;
      this._saveProgress();
      this._showStep(this._currentStep);
    } else {
      this.stop(true);
    }
  }

  /** Move to the previous step */
  prev() {
    if (this._currentStep > 0) {
      this._currentStep--;
      this._saveProgress();
      this._showStep(this._currentStep);
    }
  }

  /** Stop and optionally mark as complete */
  stop(markComplete = false) {
    if (markComplete && this._activeTourId) {
      const done = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      if (!done.includes(this._activeTourId)) done.push(this._activeTourId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done));
      localStorage.removeItem(`${STORAGE_STEP_KEY}_${this._activeTourId}`);
    }

    this._destroyOverlay();
    this._destroyTooltip();
    this._guide?.destroy();
    this._guide = null;
    this._detachGlobalListeners();
    this._activeTourId = null;
    this._currentStep  = 0;
    this._steps        = [];
  }

  /** Reset completion state for a tour (or all tours) */
  reset(tourId = null) {
    if (tourId) {
      const done = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      localStorage.setItem(STORAGE_KEY, JSON.stringify(done.filter(id => id !== tourId))));
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  // ─── STEP RESOLUTION ───────────────────────────────────────────────────────

  /**
   * Filters steps based on viewport, element visibility, and dynamic conditions.
   * @param {TourStep[]} steps
   * @returns {TourStep[]}
   */
  _resolveSteps(steps) {
    const mobile = this._isMobile();
    return steps.filter(step => {
      // Viewport filter
      if (step.isMobileOnly  && !mobile) return false;
      if (step.isDesktopOnly &&  mobile) return false;

      // Dynamic condition
      if (typeof step.condition === 'function' && !step.condition()) return false;

      // Resolve selector (use mobileSelector on mobile if available)
      const sel = (mobile && step.mobileSelector) ? step.mobileSelector : step.targetSelector;
      if (sel === '__center__') return true;  // floating step, no target

      const el = document.querySelector(sel);
      if (!el) return false;

      // Skip if element is visually hidden
      const style = window.getComputedStyle(el);
      if (style.display === 'none' || style.visibility === 'hidden') return false;

      return true;
    });
  }

  // ─── STEP DISPLAY ──────────────────────────────────────────────────────────

  _showStep(index) {
    const step   = this._steps[index];
    const mobile = this._isMobile();
    const sel    = (mobile && step.mobileSelector) ? step.mobileSelector : step.targetSelector;
    const target = sel !== '__center__' ? document.querySelector(sel) : null;

    const rect = target
      ? this._getPaddedRect(target)
      : this._getCentreRect();

    this._paintOverlay(rect);
    this._positionTooltip(step, rect, index);
    this._guide?.animate(step.characterAction || 'idle');
    this._guide?.positionNear(rect, this._tooltipEl?.getBoundingClientRect());

    // Scroll target into view if offscreen
    if (target) {
      const inView = rect.top >= 0 && rect.bottom <= window.innerHeight;
      if (!inView) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  // ─── OVERLAY ───────────────────────────────────────────────────────────────

  _buildOverlay() {
    if (this._overlayEl) return;

    this._overlayEl = document.createElement('div');
    this._overlayEl.id = 'tm-overlay';
    this._overlayEl.style.cssText = `
      position: fixed; inset: 0; z-index: ${OVERLAY_Z};
      pointer-events: none; transition: opacity 0.3s;
    `;

    // SVG mask overlay — punches a transparent hole over the target
    this._overlayEl.innerHTML = `
      <svg id="tm-svg-mask" width="100%" height="100%"
           style="position:absolute;inset:0;width:100%;height:100%;">
        <defs>
          <mask id="tm-hole-mask">
            <rect width="100%" height="100%" fill="white"/>
            <rect id="tm-hole" rx="12" ry="12" fill="black"/>
          </mask>
        </defs>
        <rect width="100%" height="100%" fill="rgba(0,0,0,0.62)"
              mask="url(#tm-hole-mask)"/>
      </svg>
    `;

    document.body.appendChild(this._overlayEl);

    // Click-outside to skip step
    this._overlayEl.style.pointerEvents = 'auto';
    this._overlayEl.addEventListener('click', e => {
      if (!this._tooltipEl?.contains(e.target)) this.next();
    });
  }

  _paintOverlay(rect) {
    const hole = document.getElementById('tm-hole');
    if (!hole) return;
    hole.setAttribute('x',      rect.left   - 8);
    hole.setAttribute('y',      rect.top    - 8);
    hole.setAttribute('width',  rect.width  + 16);
    hole.setAttribute('height', rect.height + 16);
  }

  _destroyOverlay() {
    this._overlayEl?.remove();
    this._overlayEl = null;
  }

  // ─── TOOLTIP ───────────────────────────────────────────────────────────────

  _buildTooltip() {
    if (this._tooltipEl) return;

    this._tooltipEl = document.createElement('div');
    this._tooltipEl.id = 'tm-tooltip';
    this._tooltipEl.className = 'tm-tooltip';
    this._tooltipEl.style.cssText = `
      position: fixed; z-index: ${TOOLTIP_Z}; pointer-events: auto;
      transition: top 0.3s cubic-bezier(0.16,1,0.3,1),
                  left 0.3s cubic-bezier(0.16,1,0.3,1),
                  opacity 0.2s;
      opacity: 0;
    `;
    this._tooltipEl.innerHTML = `
      <div class="tm-tooltip-inner">
        <div class="tm-tooltip-header">
          <span id="tm-step-counter" class="tm-step-counter"></span>
          <button id="tm-close" class="tm-close-btn" title="Close tour">✕</button>
        </div>
        <h3  id="tm-title"       class="tm-title"></h3>
        <p   id="tm-description" class="tm-description"></p>
        <div id="tm-progress"    class="tm-progress-bar">
          <div id="tm-progress-fill" class="tm-progress-fill"></div>
        </div>
        <div class="tm-actions">
          <button id="tm-prev"  class="tm-btn tm-btn-ghost">← Back</button>
          <button id="tm-next"  class="tm-btn tm-btn-primary">Next →</button>
        </div>
      </div>
      <div id="tm-arrow" class="tm-arrow"></div>
    `;

    document.body.appendChild(this._tooltipEl);

    document.getElementById('tm-close').onclick = () => this.stop(false);
    document.getElementById('tm-prev').onclick  = () => this.prev();
    document.getElementById('tm-next').onclick  = () => this.next();

    // Animate in
    requestAnimationFrame(() => { this._tooltipEl.style.opacity = '1'; });
  }

  _positionTooltip(step, rect, index) {
    if (!this._tooltipEl) return;

    // Update content
    document.getElementById('tm-title').textContent       = step.title;
    document.getElementById('tm-description').textContent = step.description;
    document.getElementById('tm-step-counter').textContent =
      `${index + 1} / ${this._steps.length}`;

    const fill = document.getElementById('tm-progress-fill');
    fill.style.width = `${((index + 1) / this._steps.length) * 100}%`;

    // Prev button visibility
    document.getElementById('tm-prev').style.visibility =
      index === 0 ? 'hidden' : 'visible';

    // Last step: change Next to Finish
    const nextBtn = document.getElementById('tm-next');
    nextBtn.textContent = index === this._steps.length - 1 ? 'Finish ✓' : 'Next →';

    // Dynamic placement
    this._tooltipEl.style.opacity = '0';
    requestAnimationFrame(() => {
      const tRect    = this._tooltipEl.getBoundingClientRect();
      const placement = this._resolvePlacement(step.placement, rect, tRect);
      const { top, left } = this._calcTooltipPos(placement, rect, tRect);
      this._tooltipEl.style.top  = `${top}px`;
      this._tooltipEl.style.left = `${left}px`;

      // Arrow direction
      const arrow = document.getElementById('tm-arrow');
      arrow.className = `tm-arrow tm-arrow-${placement}`;

      this._tooltipEl.style.opacity = '1';
    });
  }

  /**
   * Resolves the best placement given available viewport space.
   */
  _resolvePlacement(preferred, targetRect, tooltipRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w  = tooltipRect?.width  || 280;
    const h  = tooltipRect?.height || 160;
    const m  = TOOLTIP_MARGIN;

    const fits = {
      bottom: targetRect.bottom + h + m < vh,
      top:    targetRect.top    - h - m > 0,
      right:  targetRect.right  + w + m < vw,
      left:   targetRect.left   - w - m > 0,
      center: true,
    };

    if (preferred && fits[preferred]) return preferred;

    // Auto-fallback order
    for (const p of ['bottom','top','right','left','center']) {
      if (fits[p]) return p;
    }
    return 'center';
  }

  /**
   * Calculates tooltip top/left in viewport coordinates.
   */
  _calcTooltipPos(placement, targetRect, tooltipRect) {
    const tw = tooltipRect?.width  || 280;
    const th = tooltipRect?.height || 160;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m  = TOOLTIP_MARGIN;

    let top, left;

    switch (placement) {
      case 'bottom':
        top  = targetRect.bottom + m;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        break;
      case 'top':
        top  = targetRect.top - th - m;
        left = targetRect.left + targetRect.width / 2 - tw / 2;
        break;
      case 'right':
        top  = targetRect.top + targetRect.height / 2 - th / 2;
        left = targetRect.right + m;
        break;
      case 'left':
        top  = targetRect.top + targetRect.height / 2 - th / 2;
        left = targetRect.left - tw - m;
        break;
      default: // center
        top  = vh / 2 - th / 2;
        left = vw / 2 - tw / 2;
    }

    // Clamp to viewport with padding
    top  = Math.max(8, Math.min(top,  vh - th - 8));
    left = Math.max(8, Math.min(left, vw - tw - 8));

    return { top, left };
  }

  _destroyTooltip() {
    this._tooltipEl?.remove();
    this._tooltipEl = null;
  }

  // ─── GEOMETRY HELPERS ──────────────────────────────────────────────────────

  _getPaddedRect(el) {
    const r = el.getBoundingClientRect();
    return { top: r.top, left: r.left, width: r.width, height: r.height,
             bottom: r.bottom, right: r.right };
  }

  _getCentreRect() {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    return { top: vh * 0.3, left: vw * 0.1, width: vw * 0.8, height: vh * 0.4,
             bottom: vh * 0.7, right: vw * 0.9 };
  }

  // ─── GLOBAL LISTENERS ──────────────────────────────────────────────────────

  _attachGlobalListeners() {
    // Recalculate positions on resize
    this._resizeObs = new ResizeObserver(() => {
      if (this._activeTourId) this._showStep(this._currentStep);
    });
    this._resizeObs.observe(document.documentElement);

    // Recalculate on scroll
    this._scrollHandler = () => {
      if (this._activeTourId) this._showStep(this._currentStep);
    };
    window.addEventListener('scroll', this._scrollHandler, { passive: true });

    // Keyboard navigation
    this._keyHandler = e => {
      if (!this._activeTourId) return;
      if (e.key === 'ArrowRight' || e.key === 'Enter') this.next();
      if (e.key === 'ArrowLeft')                        this.prev();
      if (e.key === 'Escape')                           this.stop(false);
    };
    document.addEventListener('keydown', this._keyHandler);
  }

  _detachGlobalListeners() {
    this._resizeObs?.disconnect();
    this._resizeObs = null;
    if (this._scrollHandler) {
      window.removeEventListener('scroll', this._scrollHandler);
      this._scrollHandler = null;
    }
    if (this._keyHandler) {
      document.removeEventListener('keydown', this._keyHandler);
      this._keyHandler = null;
    }
  }

  // ─── PERSISTENCE ───────────────────────────────────────────────────────────

  _saveProgress() {
    if (this._activeTourId) {
      localStorage.setItem(
        `${STORAGE_STEP_KEY}_${this._activeTourId}`,
        this._currentStep.toString()
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GUIDE CHARACTER — lightweight canvas-based animated doctor
// ─────────────────────────────────────────────────────────────────────────────

class GuideCharacter {
  constructor() {
    this._el        = null;
    this._canvas    = null;
    this._ctx       = null;
    this._animFrame = null;
    this._t         = 0;
    this._action    = 'idle';
    this._actionMap = {
      idle:      this._drawIdle.bind(this),
      wave:      this._drawWave.bind(this),
      point:     this._drawPoint.bind(this),
      celebrate: this._drawCelebrate.bind(this),
    };
  }

  mount(parent, zIndex) {
    this._el = document.createElement('div');
    this._el.id = 'tm-guide';
    this._el.style.cssText = `
      position: fixed; z-index: ${zIndex};
      width: 80px; height: 80px;
      transition: top 0.4s cubic-bezier(0.16,1,0.3,1),
                  left 0.4s cubic-bezier(0.16,1,0.3,1);
      pointer-events: none;
    `;

    this._canvas = document.createElement('canvas');
    this._canvas.width  = 80;
    this._canvas.height = 80;
    this._ctx           = this._canvas.getContext('2d');
    this._el.appendChild(this._canvas);
    parent.appendChild(this._el);

    this._loop();
  }

  /** Position the character near the tooltip / highlight rect */
  positionNear(targetRect, tooltipRect) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const size = 80;

    // Default: bottom-right of target
    let top  = (targetRect.bottom || 0) + 8;
    let left = (targetRect.right  || 0) + 8;

    // Clamp to viewport
    top  = Math.max(8, Math.min(top,  vh - size - 8));
    left = Math.max(8, Math.min(left, vw - size - 8));

    this._el.style.top  = `${top}px`;
    this._el.style.left = `${left}px`;
  }

  /** Trigger a named animation */
  animate(action) {
    this._action = this._actionMap[action] ? action : 'idle';
  }

  destroy() {
    if (this._animFrame) cancelAnimationFrame(this._animFrame);
    this._el?.remove();
  }

  _loop() {
    this._t++;
    const ctx = this._ctx;
    ctx.clearRect(0, 0, 80, 80);

    const draw = this._actionMap[this._action] || this._actionMap.idle;
    draw(ctx, this._t);

    this._animFrame = requestAnimationFrame(() => this._loop());
  }

  // ── DRAW ROUTINES ─────────────────────────────────────────────────────────

  _drawBase(ctx, bodyY = 38) {
    // Head
    ctx.fillStyle = '#FFD3A0';
    ctx.beginPath(); ctx.arc(40, 22, 14, 0, Math.PI * 2); ctx.fill();

    // Eyes
    ctx.fillStyle = '#1c1410';
    ctx.beginPath(); ctx.arc(35, 20, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(45, 20, 2.5, 0, Math.PI * 2); ctx.fill();

    // Smile
    ctx.strokeStyle = '#a06040';
    ctx.lineWidth   = 1.8;
    ctx.beginPath(); ctx.arc(40, 25, 6, 0.2, Math.PI - 0.2); ctx.stroke();

    // Body (doctor white coat)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath(); ctx.roundRect(26, bodyY, 28, 26, 6); ctx.fill();

    // Stethoscope hint
    ctx.strokeStyle = '#7f2f5d';
    ctx.lineWidth   = 2;
    ctx.beginPath(); ctx.arc(40, bodyY + 10, 5, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(35, bodyY + 10); ctx.lineTo(33, bodyY + 18); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(45, bodyY + 10); ctx.lineTo(47, bodyY + 18); ctx.stroke();
  }

  _drawIdle(ctx, t) {
    const bob = Math.sin(t * 0.05) * 2;
    ctx.save(); ctx.translate(0, bob);
    this._drawBase(ctx);
    // Arms down
    ctx.strokeStyle = '#FFD3A0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(26, 42); ctx.lineTo(18, 56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(54, 42); ctx.lineTo(62, 56); ctx.stroke();
    ctx.restore();
  }

  _drawWave(ctx, t) {
    const bob      = Math.sin(t * 0.06) * 2;
    const waveAngle = Math.sin(t * 0.15) * 0.5;
    ctx.save(); ctx.translate(0, bob);
    this._drawBase(ctx);
    // Left arm down, right arm waving
    ctx.strokeStyle = '#FFD3A0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(26, 42); ctx.lineTo(18, 56); ctx.stroke();
    ctx.save();
    ctx.translate(54, 42);
    ctx.rotate(-0.8 + waveAngle);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -10); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  _drawPoint(ctx, t) {
    const bob = Math.sin(t * 0.05) * 1.5;
    ctx.save(); ctx.translate(0, bob);
    this._drawBase(ctx);
    // Left arm down, right arm pointing forward (toward tooltip)
    ctx.strokeStyle = '#FFD3A0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(26, 42); ctx.lineTo(18, 56); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(54, 42); ctx.lineTo(68, 34); ctx.stroke();
    // Pointing finger dot
    ctx.fillStyle = '#FFD3A0';
    ctx.beginPath(); ctx.arc(68, 33, 3, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  _drawCelebrate(ctx, t) {
    const bounce = Math.abs(Math.sin(t * 0.12)) * 5;
    ctx.save(); ctx.translate(0, -bounce);
    this._drawBase(ctx, 36);

    // Both arms raised
    ctx.strokeStyle = '#FFD3A0'; ctx.lineWidth = 4; ctx.lineCap = 'round';
    const swing = Math.sin(t * 0.15) * 0.3;
    ctx.save();
    ctx.translate(26, 40); ctx.rotate(-1.2 - swing);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-14, -8); ctx.stroke();
    ctx.restore();
    ctx.save();
    ctx.translate(54, 40); ctx.rotate(1.2 + swing);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(14, -8); ctx.stroke();
    ctx.restore();

    // Confetti dots
    const confettiColors = ['#ffb88c','#7f2f5d','#10b981','#f59e0b'];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + t * 0.05;
      const r     = 28 + Math.sin(t * 0.1 + i) * 4;
      ctx.fillStyle = confettiColors[i % confettiColors.length];
      ctx.beginPath();
      ctx.arc(40 + Math.cos(angle) * r, 20 + Math.sin(angle) * r, 3, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

export default new TourManager();
