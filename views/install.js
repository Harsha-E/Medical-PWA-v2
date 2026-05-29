/**
 * Install View — Native PWA Installation
 * Architecture: Buttonless trigger (handled externally), Premium Ethereal Aura background.
 */
import StoryEngine from '../core/StoryEngine.js';
import PwaInstallManager from '../services/PwaInstallManager.js';

export default class InstallView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col relative z-10 text-gray-100 font-sans pointer-events-none';

    this.container.innerHTML = `
      <style>
        /* ── Hero (top half) ──────────────────────────────────── */
        .mc-hero {
          display: flex; flex-direction: column;
          align-items: center;
          z-index: 10; pointer-events: none;
          margin-bottom: 2rem;
        }

        /* Logo mark */
        .mc-mark {
          width: 68px; height: 68px; border-radius: 20px;
          background: linear-gradient(145deg, #7f2f5d 0%, #3d1228 100%);
          border: 1px solid rgba(255,184,140,0.25);
          display: flex; align-items: center; justify-content: center;
          box-shadow:
            0 0 0 1px rgba(255,184,140,0.08),
            0 0 40px rgba(127,47,93,0.45),
            0 12px 40px rgba(0,0,0,0.6);
          animation: mcMarkFloat 7s ease-in-out infinite;
        }

        @keyframes mcMarkFloat {
          0%, 100% { transform: translateY(0px);  box-shadow: 0 0 0 1px rgba(255,184,140,0.08), 0 0 40px rgba(127,47,93,0.45), 0 12px 40px rgba(0,0,0,0.6); }
          50%       { transform: translateY(-7px); box-shadow: 0 0 0 1px rgba(255,184,140,0.18), 0 0 65px rgba(127,47,93,0.65), 0 20px 55px rgba(0,0,0,0.7); }
        }

        .mc-mark svg { width: 34px; height: 34px; }

        /* Ping rings */
        .mc-ping {
          position: absolute; inset: -6px; border-radius: 26px;
          border: 1px solid rgba(255,184,140,0.22);
          animation: mcPing 3s ease-out infinite;
          pointer-events: none;
        }
        .mc-ping:nth-child(2) {
          inset: -14px; border-radius: 34px;
          border-color: rgba(127,47,93,0.25);
          animation-delay: 1.4s;
        }

        @keyframes mcPing {
          0%       { opacity: 1; transform: scale(1); }
          75%, 100%{ opacity: 0; transform: scale(1.7); }
        }

        /* Brand name */
        .mc-brand {
          margin-top: 18px;
          font-family: 'Cormorant Garamond', 'Georgia', serif;
          font-weight: 600; font-size: 38px;
          letter-spacing: -0.5px; line-height: 1;
          color: #ffd9b5;
          opacity: 0; transform: translateY(12px);
          animation: mcFadeUp 0.9s 0.2s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .mc-brand em { font-style: normal; color: #ffb88c; }

        /* Tagline */
        .mc-tagline {
          margin-top: 6px;
          font-family: 'Courier New', monospace;
          font-size: 10px; letter-spacing: 3.5px; text-transform: uppercase;
          color: rgba(255,217,181,0.45);
          opacity: 0;
          animation: mcFadeUp 0.9s 0.45s cubic-bezier(0.16,1,0.3,1) forwards;
        }

        /* Rating / trust row */
        .mc-trust {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-top: 14px;
          opacity: 0;
          animation: mcFadeUp 0.9s 0.65s cubic-bezier(0.16,1,0.3,1) forwards;
        }
        .mc-stars { color: #ffb88c; font-size: 11px; letter-spacing: 2px; }
        .mc-trust-label {
          font-family: 'Courier New', monospace;
          font-size: 10px; color: rgba(255,217,181,0.22);
        }
        .mc-chip {
          padding: 3px 10px; border-radius: 20px;
          background: rgba(127,47,93,0.2);
          border: 1px solid rgba(255,184,140,0.2);
          font-family: 'Courier New', monospace;
          font-size: 9px; letter-spacing: 1.5px; text-transform: uppercase;
          color: #ffb88c;
        }
        @keyframes mcFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      </style>

      <canvas id="install-canvas" class="absolute inset-0 w-full h-full z-0 pointer-events-none"></canvas>
      
      <div class="absolute inset-0 backdrop-blur-[80px] bg-[#050203]/40 z-10 pointer-events-none"></div>
      
      <div class="min-h-[100dvh] w-full flex flex-col relative z-20 text-gray-100 font-sans pointer-events-none">
        <main class="flex-1 flex flex-col items-center justify-center text-center px-6 relative overflow-hidden pointer-events-auto">
          
          <div class="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
            
            <div class="mc-hero">
              <div class="mc-mark" style="position:relative;">
                <div class="mc-ping"></div>
                <div class="mc-ping"></div>
                <svg viewBox="0 0 34 34" fill="none" xmlns="http://www.w3.org/2000/svg" class="">
                  <!-- Plus cross -->
                  <rect x="13" y="2" width="8" height="30" rx="2.5" fill="rgba(255,217,181,0.95)"></rect>
                  <rect x="2" y="13" width="30" height="8" rx="2.5" fill="rgba(255,217,181,0.95)"></rect>
                </svg>
              </div>

              <div class="mc-brand">Med<em>Check</em></div>
              <div class="mc-tagline">Medically ALL SET!</div>

              <div class="mc-trust">
                
                <span class="mc-chip">Free</span>
                <span class="mc-chip">Offline</span>
              </div>
            </div>

            <div class="mb-8 h-6 flex items-center justify-center relative">
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
    this.statusEl = this.container.querySelector('#install-status');

    this._initVisuals();

    // Initialize PWA Manager to update status text, even if the button click 
    // happens in your external popup/module.
    this.pwaInstaller = new PwaInstallManager({
      onInstalled: () => {
        this.setStatus('Installed — Launching...');
        setTimeout(() => { window.location.hash = '#/dashboard'; }, 1200);
      },
      onChange: (s) => {
        switch (s) {
          case 'ready': this.setStatus('Ready to install — tap external prompt'); break;
          case 'accepted': this.setStatus('OS accepted install — packaging'); break;
          case 'dismissed': this.setStatus('Install dismissed by user'); break;
          case 'ios-fallback': this.setStatus('iOS fallback — use Share → Add to Homescreen'); break;
          case 'manual-fallback': this.setStatus('Use browser menu → Add to Homescreen'); break;
          case 'installed': this.setStatus('Installed — Redirecting...'); break;
          default: this.setStatus('Awaiting System Trigger...');
        }
      }
    });

    this._typingTimer = setTimeout(() => this.initTypingEffect(), 100);
    this._storyTimer = setTimeout(() => {
      const storyBtn = this.container.querySelector('#trigger-story');
      if (storyBtn) {
        storyBtn.addEventListener('click', () => {
          const engine = new StoryEngine();
          engine.mount();
        });
      }
    }, 150);

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

  setStatus(text) {
    if (this.statusEl) {
      this.statusEl.style.opacity = '0.5';
      setTimeout(() => {
        this.statusEl.textContent = text;
        this.statusEl.style.opacity = '1';
      }, 150);
    }
  }

  // ==========================================
  // PREMIUM ETHEREAL AURA ENGINE
  // ==========================================
  _initVisuals() {
    if (!this.canvas || !this.ctx) return;
    
    // Parallax tracking
    this.mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    this._pointerHandler = (e) => {
      this.mouse.x += (e.clientX - this.mouse.x) * 0.05;
      this.mouse.y += (e.clientY - this.mouse.y) * 0.05;
    };
    window.addEventListener('pointermove', this._pointerHandler);

    this._resizeCanvas();
    this._boundResize = this._resizeCanvas.bind(this);
    window.addEventListener('resize', this._boundResize);

    // Create 3 massive, slow-moving aura orbs using the warm palette
    this.orbs = [
      { x: 0.3, y: 0.3, radius: 0.4, color: 'rgba(255, 217, 181, 0.4)', speed: 0.001, offset: 0 }, // #ffd9b5
      { x: 0.7, y: 0.6, radius: 0.5, color: 'rgba(255, 184, 140, 0.3)', speed: 0.0015, offset: 2 }, // #ffb88c
      { x: 0.5, y: 0.8, radius: 0.6, color: 'rgba(127, 47, 93, 0.5)', speed: 0.0008, offset: 4 }    // #7f2f5d
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

    // Deep Base Background
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.fillStyle = '#050203';
    this.ctx.fillRect(0, 0, w, h);

    // Mouse Parallax Offsets
    const dx = (this.mouse.x - w / 2) * 0.05;
    const dy = (this.mouse.y - h / 2) * 0.05;

    // Use lighter composite to blend the auras organically
    this.ctx.globalCompositeOperation = 'lighter';

    this.orbs.forEach((orb, i) => {
      // Calculate slow orbital movement
      const x = (orb.x * w) + Math.sin(this._t * orb.speed + orb.offset) * (w * 0.15) + (dx * (i + 1));
      const y = (orb.y * h) + Math.cos(this._t * orb.speed + orb.offset) * (h * 0.15) + (dy * (i + 1));
      const r = orb.radius * Math.max(w, h); // Size scales with screen

      // Draw soft radial gradient aura
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
    if (this.pwaInstaller && typeof this.pwaInstaller.destroy === 'function') this.pwaInstaller.destroy();
    if (this._pointerHandler) window.removeEventListener('pointermove', this._pointerHandler);
    if (this._boundResize) window.removeEventListener('resize', this._boundResize);
    if (this._typingTimer) clearTimeout(this._typingTimer);
    if (this._storyTimer) clearTimeout(this._storyTimer);
    if (this._typeLoop) clearTimeout(this._typeLoop);
    if (this._raf) cancelAnimationFrame(this._raf);
  }
}