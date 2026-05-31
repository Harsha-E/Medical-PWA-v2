export default class SplashView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'splash-container';

    this.container.innerHTML = `
      <div class="splash-content">
        <div class="logo-wrapper">
          <svg width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"/>
          </svg>
        </div>
        <h1 class="font-display text-4xl mt-4">MedCare</h1>
        <p class="text-xs font-bold text-muted mt-2 tracking-[0.2em] uppercase">Clinical Precision &bull; Offline First</p>
        <div class="loading-track mt-16">
          <div class="loading-bar"></div>
        </div>
      </div>

      <style>
        .splash-container { height:100vh;display:flex;align-items:center;justify-content:center; }
        .splash-content { text-align:center;max-width:300px;width:100%; }
        .logo-wrapper { margin-bottom:var(--space-6);animation:logo-pop 0.8s cubic-bezier(0.34,1.56,0.64,1); }
        @keyframes logo-pop { 0%{transform:scale(0.5);opacity:0} 100%{transform:scale(1);opacity:1} }
        .loading-track { width:200px;height:4px;background:rgba(255,107,53,0.1);border-radius:var(--radius-full);margin:0 auto;overflow:hidden; }
        .loading-bar { width:0%;height:100%;background:var(--color-primary);border-radius:var(--radius-full);transition:width 2s cubic-bezier(0.65,0,0.35,1); }
      </style>
    `;

    requestAnimationFrame(() => {
      const bar = this.container.querySelector('.loading-bar');
      if (bar) setTimeout(() => { bar.style.width = '100%'; }, 50);
    });

    const htmlSplash = document.getElementById('splash-screen');
    const viewport = document.getElementById('app-viewport');
    
    this._timer = setTimeout(() => {
      if (htmlSplash) { 
        htmlSplash.style.opacity = '0'; 
        htmlSplash.style.pointerEvents = 'none'; 
      }
      if (viewport) { 
        viewport.style.opacity = '1'; 
      }
    }, 800);

    return this.container;
  }

  destroy() {
    if (this._timer) clearTimeout(this._timer);
  }
}