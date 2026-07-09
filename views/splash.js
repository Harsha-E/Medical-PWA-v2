/**
 * MedCare | Splash Screen
 * A pure brand moment — not a loader. Auto-dismisses after brand animations complete.
 */

export default class SplashView {
  async render() {
    this.container = document.createElement('div');
    this.container.id  = 'splash-view-inner';
    this.container.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      display: flex; align-items: center; justify-content: center;
      background: var(--color-surface);
      overflow: hidden;
    `;

    this.container.innerHTML = `
      <!-- Ambient glow orbs -->
      <div style="
        position: absolute; inset: 0; pointer-events: none;
      ">
        <div style="
          position: absolute; top: 20%; left: 50%; transform: translate(-50%, -50%);
          width: 380px; height: 380px; border-radius: 50%;
          background: radial-gradient(circle, rgba(127,47,93,0.35) 0%, rgba(202,82,41,0.12) 50%, transparent 75%);
          filter: blur(60px);
          animation: splash-glow-pulse 3s ease-in-out infinite;
        "></div>
        <div style="
          position: absolute; bottom: 15%; right: 10%;
          width: 200px; height: 200px; border-radius: 50%;
          background: radial-gradient(circle, rgba(255,184,140,0.15) 0%, transparent 70%);
          filter: blur(40px);
          animation: splash-glow-pulse 4s ease-in-out infinite reverse;
        "></div>
      </div>

      <!-- Core brand content -->
      <div style="
        display: flex; flex-direction: column; align-items: center;
        text-align: center; position: relative; z-index: 2;
      ">
        <!-- Logo mark -->
        <div id="splash-logo" style="
          width: 88px; height: 88px; border-radius: 28px;
          background: linear-gradient(145deg, rgba(127,47,93,0.6) 0%, rgba(202,82,41,0.4) 100%);
          border: 1px solid rgba(255,184,140,0.25);
          box-shadow:
            0 0 0 1px rgba(255,184,140,0.08),
            0 24px 48px rgba(0,0,0,0.6),
            inset 0 1px 0 rgba(255,184,140,0.15);
          display: flex; align-items: center; justify-content: center;
          backdrop-filter: blur(20px);
          animation: splash-logo-bloom 0.9s cubic-bezier(0.16,1,0.3,1) 0.1s both;
        ">
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none"
               stroke="url(#splash-grad)" stroke-width="1.5"
               stroke-linecap="round" stroke-linejoin="round">
            <defs>
              <linearGradient id="splash-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stop-color="var(--color-accent-primary)"/>
                <stop offset="100%" stop-color="var(--color-primary-dark)"/>
              </linearGradient>
            </defs>
            <path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"/>
          </svg>
        </div>

        <!-- Wordmark -->
        <h1 id="splash-wordmark" style="
          font-family: 'Inter', sans-serif;
          font-size: 38px; font-weight: 700;
          color: var(--color-text-primary);
          margin: 20px 0 0 0;
          letter-spacing: -0.02em;
          line-height: 1;
          animation: splash-wordmark-rise 0.7s cubic-bezier(0.16,1,0.3,1) 0.55s both;
        ">MedCare</h1>

        <!-- Tagline -->
        <p id="splash-tagline" style="
          font-family: 'Inter', sans-serif;
          font-size: 11px; font-weight: 600;
          color: rgba(255,184,140,0.65);
          margin: 10px 0 0 0;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          animation: splash-tagline-fade 0.6s ease-out 1.1s both;
        ">Clinical Precision &bull; Offline First</p>

        <!-- Decorative line -->
        <div id="splash-line" style="
          width: 48px; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,184,140,0.4), transparent);
          margin: 20px auto 0;
          animation: splash-tagline-fade 0.6s ease-out 1.3s both;
        "></div>
      </div>
    `;

    // Auto-dismiss after brand sequence completes — Fast load
    this._timer = setTimeout(() => {
      this._dismiss();
    }, 400);

    return this.container;
  }

  _dismiss() {
    const htmlSplash = document.getElementById('splash-screen');
    const viewport   = document.getElementById('app-viewport');

    // Animate inner content out
    if (this.container) {
      this.container.style.animation = 'splash-dismiss 0.5s cubic-bezier(0.4,0,0.2,1) forwards';
    }

    // Simultaneously fade out the HTML splash overlay
    if (htmlSplash) {
      htmlSplash.style.transition = 'opacity 0.5s ease';
      htmlSplash.style.opacity    = '0';
      htmlSplash.style.pointerEvents = 'none';
      setTimeout(() => htmlSplash.remove(), 500);
    }

    if (viewport) {
      viewport.style.opacity = '1';
    }
  }

  destroy() {
    if (this._timer) clearTimeout(this._timer);
  }
}
