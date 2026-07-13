/**
 * Install View 2 — Native PWA Installation
 * Architecture: Video background. Relies on the global PwaInstallManager banner.
 */

let _deferredPrompt = null;
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

export default class InstallView2 {
  async render() {
    if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true) {
        window.location.hash = '#/dashboard';
        return;
    }

    this.container = document.createElement('div');
    this.container.className = 'force-dark-theme bg-[#0a040f] min-h-[100dvh] w-full flex flex-col relative z-10 text-text-primary font-sans pointer-events-none transition-opacity duration-500';

    this.container.innerHTML = `
      <style>
        @keyframes breathe { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-4px); } }
        .panel-breathe { animation: breathe 6s ease-in-out infinite; }
        
        @keyframes signature-draw-op {
          0% { stroke-dashoffset: 1; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes signature-fill-op {
          0% { fill-opacity: 0; }
          100% { fill-opacity: 1; }
        }
        
        @keyframes liquidExpand {
          0% { clip-path: circle(0% at 50% 50%); opacity: 0; }
          10% { opacity: 1; clip-path: circle(5% at 50% 50%); }
          40% { clip-path: circle(40% at 50% 50%); }
          100% { clip-path: circle(150% at 50% 50%); opacity: 1; }
        }
        
        .liquid-blur-overlay {
          position: absolute;
          inset: 0;
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          background: rgba(10, 4, 15, 0.4);
          z-index: 10;
          pointer-events: none;
          opacity: 0;
          animation: liquidExpand 1.5s cubic-bezier(0.65, 0, 0.05, 1) 0.5s forwards;
        }

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
          background: linear-gradient(145deg, var(--color-secondary) 0%, #3d1228 100%); 
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
        .mc-brand em { font-style: normal; color: var(--color-accent-primary); }
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
          color: var(--color-accent-primary); 
        }
        @keyframes mcFadeUp { to { opacity: 1; transform: translateY(0); } }
      </style>

      <video id="install-bg-video" loop muted playsinline autoplay style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" src="./assets/Bg-Video.webm"></video>
      
      <div id="dynamic-droplets-container" class="absolute inset-0 z-0 pointer-events-none overflow-hidden mix-blend-overlay opacity-30"></div>
      
      <div class="liquid-blur-overlay"></div>
      
      <div class="min-h-[100dvh] w-full flex flex-col relative z-20 text-text-primary font-sans pointer-events-none">
        <main class="flex-1 flex flex-col items-center justify-center text-center relative overflow-hidden pointer-events-auto" style="padding-left:0; padding-right:0;">
          <div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col justify-center items-center flex-1">
            
            <div class="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center panel-breathe">
              
              <div class="mc-hero" style="opacity: 0; transition: opacity 0.5s ease-in-out;" id="signature-container">
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
                <p class="text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-sm md:text-base leading-relaxed font-mono tracking-wide max-w-lg mx-auto font-bold">
                  <span class="typewriter-text" data-text="Install MedCheck as a native app for faster startup, offline access and secure OS-level integration."></span><span class="typewriter-cursor text-accent-primary animate-pulse">|</span>
                </p>
              </div>

            </div>
          </div>
        </main>
      </div>
    `;

    const bgVideo = this.container.querySelector('#install-bg-video');
    if (bgVideo) {
      bgVideo.play().catch(e => console.warn("[InstallView] Autoplay blocked or delayed:", e));
    }

    // Generate programatic realistic droplets
    const dropletsContainer = this.container.querySelector('#dynamic-droplets-container');
    if (dropletsContainer) {
      let dropletsHtml = '';
      for (let i = 0; i < 70; i++) {
        const size = 5 + Math.random() * 45; // 5px to 50px
        const left = Math.random() * 100;
        const top = Math.random() * 100;
        const delay = Math.random() * 2.0; // Showers over 2 seconds
        // Irregular organic shapes using 8-point border-radius
        const br = `${40 + Math.random()*20}% ${40 + Math.random()*20}% ${40 + Math.random()*20}% ${40 + Math.random()*20}% / ${40 + Math.random()*20}% ${40 + Math.random()*20}% ${40 + Math.random()*20}% ${40 + Math.random()*20}%`;
        dropletsHtml += `<div class="water-droplet" style="width: ${size}px; height: ${size}px; left: ${left}%; top: ${top}%; border-radius: ${br}; animation-delay: ${delay}s;"></div>`;
      }
      dropletsContainer.innerHTML = dropletsHtml;
    }

    // Wait 0.5s + 1s blur = 1.5s before drawing signature
    this._typingTimer = setTimeout(() => {
      const sigContainer = this.container.querySelector('#signature-container');
      if (sigContainer) sigContainer.style.opacity = '1';
      this.initTypingEffect();
    }, 1500);

    const cardContainer = this.container.querySelector('.panel-breathe');
    if (cardContainer) {
        const triggerBtn = document.createElement('button');
        triggerBtn.className = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50';
        triggerBtn.setAttribute('aria-label', 'Install MedCheck');
        triggerBtn.style.display = 'none'; // Hidden initially
        
        // Show install button only after blur has expanded
        setTimeout(() => { triggerBtn.style.display = 'block'; }, 1500);
        
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

  destroy() {
    if (this._typeLoop) clearTimeout(this._typeLoop);
    if (this._typingTimer) clearTimeout(this._typingTimer);
  }
}
