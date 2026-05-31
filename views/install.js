/**
 * Install View — Native PWA Installation
 * Architecture: Ethereal Aura background. Relies on the global PwaInstallManager banner.
 */

/**
 * @type {Event|null}
 * Holds the deferred native install prompt event.
 */
let _deferredPrompt = null;

/**
 * @type {boolean}
 * Flag indicating if the application is currently installable.
 */
let _installable = false;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    _installable = true;
});

window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    _installable = false;
    window.location.hash = '#/dashboard';
});

export default class InstallView {
  async render() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        window.location.hash = '#/dashboard';
        return;
    }

    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col relative z-10 text-gray-100 font-sans pointer-events-none transition-opacity duration-500';

    this.container.innerHTML = `
      <style>
        .mc-hero { 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          z-index: 10; 
          pointer-events: none; 
          margin-bottom: 2rem; 
        }
        .mc-mark { 
          width: 68px; 
          height: 68px; 
          border-radius: 20px; 
          background: linear-gradient(145deg, #7f2f5d 0%, #3d1228 100%); 
          border: 1px solid rgba(255,184,140,0.25); 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          box-shadow: 0 0 0 1px rgba(255,184,140,0.08), 0 0 40px rgba(127,47,93,0.45), 0 12px 40px rgba(0,0,0,0.6); 
          animation: mcMarkFloat 7s ease-in-out infinite; 
        }
        @keyframes mcMarkFloat { 
          0%, 100% { transform: translateY(0px); box-shadow: 0 0 0 1px rgba(255,184,140,0.08), 0 0 40px rgba(127,47,93,0.45), 0 12px 40px rgba(0,0,0,0.6); } 
          50% { transform: translateY(-7px); box-shadow: 0 0 0 1px rgba(255,184,140,0.18), 0 0 65px rgba(127,47,93,0.65), 0 20px 55px rgba(0,0,0,0.7); } 
        }
        .mc-ping { 
          position: absolute; 
          inset: -6px; 
          border-radius: 26px; 
          border: 1px solid rgba(255,184,140,0.22); 
          animation: mcPing 3s ease-out infinite; 
          pointer-events: none; 
        }
        .mc-ping:nth-child(2) { 
          inset: -14px; 
          border-radius: 34px; 
          border-color: rgba(127,47,93,0.25); 
          animation-delay: 1.4s; 
        }
        @keyframes mcPing { 
          0% { opacity: 1; transform: scale(1); } 
          75%, 100%{ opacity: 0; transform: scale(1.7); } 
        }
        .mc-brand { 
          margin-top: 18px; 
          font-family: 'Cormorant Garamond', 'Georgia', serif; 
          font-weight: 600; 
          font-size: 38px; 
          letter-spacing: -0.5px; 
          line-height: 1; 
          color: #ffd9b5; 
          opacity: 0; 
          transform: translateY(12px); 
          animation: mcFadeUp 0.9s 0.2s cubic-bezier(0.16,1,0.3,1) forwards; 
        }
        .mc-brand em { font-style: normal; color: #ffb88c; }
        .mc-tagline { 
          margin-top: 6px; 
          font-family: 'Courier New', monospace; 
          font-size: 10px; 
          letter-spacing: 3.5px; 
          text-transform: uppercase; 
          color: rgba(255,217,181,0.45); 
          opacity: 0; 
          animation: mcFadeUp 0.9s 0.45s cubic-bezier(0.16,1,0.3,1) forwards; 
        }
        .mc-trust { 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 10px; 
          margin-top: 14px; 
          opacity: 0; 
          animation: mcFadeUp 0.9s 0.65s cubic-bezier(0.16,1,0.3,1) forwards; 
        }
        .mc-chip { 
          padding: 3px 10px; 
          border-radius: 20px; 
          background: rgba(127,47,93,0.2); 
          border: 1px solid rgba(255,184,140,0.2); 
          font-family: 'Courier New', monospace; 
          font-size: 9px; 
          letter-spacing: 1.5px; 
          text-transform: uppercase; 
          color: #ffb88c; 
        }
        @keyframes mcFadeUp { to { opacity: 1; transform: translateY(0); } }
        @keyframes breathe { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        .panel-breathe { animation: breathe 6s ease-in-out infinite; }
      </style>

      <canvas id="install-canvas" class="absolute inset-0 w-full h-full z-0 pointer-events-none"></canvas>
      <div class="absolute inset-0 backdrop-blur-[80px] bg-[#050203]/40 z-10 pointer-events-none"></div>
      
      <div class="min-h-[100dvh] w-full flex flex-col relative z-20 text-gray-100 font-sans pointer-events-none">
        <main class="flex-1 flex flex-col items-center justify-center text-center px-6 relative overflow-hidden pointer-events-auto">
          
          <div class="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center panel-breathe">
            
            <div class="mc-hero">
              <div class="mc-mark" style="position:relative;">
                <div class="mc-ping"></div>
                <div class="mc-ping"></div>
                <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="13" y="2" width="8" height="30" rx="2.5" fill="rgba(255,217,181,0.95)"></rect>
                  <rect x="2" y="13" width="30" height="8" rx="2.5" fill="rgba(255,217,181,0.95)"></rect>
                </svg>
              </div>
              <div class="mc-brand">Med<em>Care</em></div>
              <div class="mc-tagline">Clinical Environment</div>
              <div class="mc-trust">
                <span class="mc-chip">Encrypted</span>
                <span class="mc-chip">Offline Ready</span>
              </div>
            </div>

            <div class="mb-8 h-6 flex items-center justify-center relative z-20">
              <p class="text-gray-300 text-sm md:text-base leading-relaxed font-mono tracking-wide max-w-lg mx-auto">
                <span class="typewriter-text" data-text="Install MedCare as a native app for faster startup, offline access and secure OS-level integration."></span><span class="typewriter-cursor text-[#ffb88c] animate-pulse">|</span>
              </p>
            </div>

          </div>
        </main>
      </div>
    `;

    this.canvas = this.container.querySelector('#install-canvas');
    this.ctx = this.canvas.getContext ? this.canvas.getContext('2d') : null;

    this._initVisuals();
    this._typingTimer = setTimeout(() => this.initTypingEffect(), 100);

    const cardContainer = this.container.querySelector('.panel-breathe');
    if (cardContainer) {
        const triggerBtn = document.createElement('button');
        triggerBtn.className = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50';
        triggerBtn.setAttribute('aria-label', 'Install MedCare');
        
        triggerBtn.addEventListener('click', async () => {
            if (!_deferredPrompt) {
                console.warn('[Install View] No deferred prompt available.');
                return;
            }
            try {
                _deferredPrompt.prompt();
                const { outcome } = await _deferredPrompt.userChoice;
                _deferredPrompt = null;
                _installable = false;
            } catch (err) {
                console.error('[Install View] Install prompt failed', err);
            }
        });
        
        cardContainer.appendChild(triggerBtn);
    }

    return this.container;
  }

  initTypingEffect() {
    const el = this.container.querySelector('.typewriter-text');
    if (!el) return;
    const fullText = el.dataset.text || '';
    let index = 0;
    el.textContent = '';
    const type = () => {
      if (index < fullText.length) {
        el.textContent += fullText.charAt(index);
        index++;
        this._typeLoop = setTimeout(type, 30 + Math.random() * 30);
      }
    };
    this._typeLoop = setTimeout(type, 600);
  }

  _initVisuals() {
    if (!this.canvas || !this.ctx) return;
    
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this._pointerHandler = (e) => {
      this.mouse.x += (e.clientX - this.mouse.x) * 0.05;
      this.mouse.y += (e.clientY - this.mouse.y) * 0.05;
    };
    window.addEventListener('pointermove', this._pointerHandler);

    this._resizeCanvas();
    this._boundResize = this._resizeCanvas.bind(this);
    window.addEventListener('resize', this._boundResize);

    this.orbs = [
      { x: 0.3, y: 0.3, radius: 0.4, color: 'rgba(255, 217, 181, 0.4)', speed: 0.001, offset: 0 }, 
      { x: 0.7, y: 0.6, radius: 0.5, color: 'rgba(255, 184, 140, 0.3)', speed: 0.0015, offset: 2 }, 
      { x: 0.5, y: 0.8, radius: 0.6, color: 'rgba(127, 47, 93, 0.5)', speed: 0.0008, offset: 4 }    
    ];

    this._t = 0;
    this._render = this._render.bind(this);
    this._render();
  }

  _resizeCanvas() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.floor(window.innerWidth * dpr);
    this.canvas.height = Math.floor(window.innerHeight * dpr);
    if (this.ctx) this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  _render() {
    this._raf = requestAnimationFrame(this._render);
    this._t += 1;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#050203';
    this.ctx.fillRect(0, 0, w, h);

    const dx = (this.mouse.x - w / 2) * 0.05;
    const dy = (this.mouse.y - h / 2) * 0.05;

    this.ctx.globalCompositeOperation = 'lighter';

    this.orbs.forEach((orb, i) => {
      const x = (orb.x * w) + Math.sin(this._t * orb.speed + orb.offset) * (w * 0.15) + (dx * (i + 1));
      const y = (orb.y * h) + Math.cos(this._t * orb.speed + orb.offset) * (h * 0.15) + (dy * (i + 1));
      const r = orb.radius * Math.max(w, h);

      const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, r);
      gradient.addColorStop(0, orb.color);
      gradient.addColorStop(1, 'rgba(0,0,0,0)');

      this.ctx.beginPath();
      this.ctx.arc(x, y, r, 0, Math.PI * 2);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    });
  }

  destroy() {
    if (this._pointerHandler) window.removeEventListener('pointermove', this._pointerHandler);
    if (this._boundResize) window.removeEventListener('resize', this._boundResize);
    if (this._typingTimer) clearTimeout(this._typingTimer);
    if (this._typeLoop) clearTimeout(this._typeLoop);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}