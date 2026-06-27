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
          0% { stroke-dashoffset: 100; opacity: 0; }
          1% { stroke-dashoffset: 100; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: 1; }
        }
        @keyframes signature-fade {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes signature-draw-op {
          0% { opacity: 0; stroke-dashoffset: 100; }
          1% { opacity: 1; stroke-dashoffset: 100; }
          100% { opacity: 1; stroke-dashoffset: 0; }
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
          animation: liquidExpand 1.5s cubic-bezier(0.65, 0, 0.05, 1) 3s forwards;
        }

      </style>

      <video id="install-bg-video" loop muted playsinline autoplay style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; z-index: 0;" src="./assets/Bg-Video.webm"></video>
      
      <div class="liquid-blur-overlay"></div>
      
      <div class="min-h-[100dvh] w-full flex flex-col relative z-20 text-text-primary font-sans pointer-events-none">
        <main class="flex-1 flex flex-col items-center justify-start pt-24 text-center relative overflow-hidden pointer-events-auto" style="padding-left:0; padding-right:0;">
          <div class="px-6 w-full max-w-7xl mx-auto flex flex-col justify-start items-center">
            
            <div class="relative w-full max-w-4xl mx-auto flex flex-col items-center justify-center panel-breathe">
              
              <div id="signature-container" class="mb-8 flex items-center justify-center relative z-20" style="filter: drop-shadow(0 0 15px rgba(255,0,128,0.4)) drop-shadow(0 0 30px rgba(255,0,128,0.2)); opacity: 0; transition: opacity 0.5s ease-in-out;">
                <!-- SVG Signature will be injected here -->
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

    // Wait 3s + 1.5s full blur fade = 4.5s before drawing signature
    this._typingTimer = setTimeout(() => {
      const sigContainer = this.container.querySelector('#signature-container');
      if (sigContainer) sigContainer.style.opacity = '1';
      this.initSignatureEffect();
    }, 4500);

    const cardContainer = this.container.querySelector('.panel-breathe');
    if (cardContainer) {
        const triggerBtn = document.createElement('button');
        triggerBtn.className = 'absolute inset-0 w-full h-full opacity-0 cursor-pointer z-50';
        triggerBtn.setAttribute('aria-label', 'Install MedCare');
        triggerBtn.style.display = 'none'; // Hidden initially
        
        // Show install button only after blur has expanded
        setTimeout(() => { triggerBtn.style.display = 'block'; }, 4500);
        
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

  async initSignatureEffect() {
    if (!window.opentype) {
      try {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      } catch (e) {
        console.error("Failed to load opentype.js", e);
        return;
      }
    }

    const text = "Med Check";
    const color = "#ff0080";
    const fillColor = "#ffffff";
    const fontSize = 120;
    
    try {
      let font;
      const fontPaths = [
          "https://www.componentry.fun/LastoriaBoldRegular.otf",
          "/LastoriaBoldRegular.otf"
      ];

      for (const path of fontPaths) {
        try {
          font = await opentype.load(path);
          if (font) break;
        } catch (e) {
          // Fallback to next path
        }
      }

      if (!font) throw new Error("Font could not be loaded");

      const horizontalPadding = fontSize * 0.1;
      const topMargin = fontSize * 1.5;
      const baseline = topMargin;
      let x = horizontalPadding;
      
      const paths = [];
      for (const char of text) {
        const glyph = font.charToGlyph(char);
        const path = glyph.getPath(x, baseline, fontSize);
        paths.push(path.toPathData(3));
        
        const advanceWidth = glyph.advanceWidth || font.unitsPerEm;
        x += advanceWidth * (fontSize / font.unitsPerEm);
      }
      
      const width = x + horizontalPadding;
      const height = fontSize * 3;
      const maskId = 'signature-reveal-mask';
      const duration = 1; // Each letter takes 1s to draw
      const stagger = 0.5; // Stagger next letter by 0.5s (Total for 9 letters = 5s)

      let svgContent = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" class="overflow-visible" style="max-width: 100%; height: auto;">
        <defs>
          <mask id="${maskId}" maskUnits="userSpaceOnUse">
            ${paths.map((d, i) => `
              <path d="${d}" stroke="white" stroke-width="${fontSize * 0.22}" fill="none" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" style="opacity: 0; animation: signature-draw-op ${duration}s linear ${i * stagger}s forwards;" />
            `).join('')}
          </mask>
        </defs>

        <!-- Base outline strokes -->
        ${paths.map((d, i) => `
          <path d="${d}" stroke="${color}" stroke-width="2" fill="none" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round" pathLength="100" stroke-dasharray="100" style="opacity: 0; animation: signature-draw-op ${duration}s linear ${i * stagger}s forwards;" />
        `).join('')}

        <!-- Filled body (rendered directly without mask to ensure perfect solid fill) -->
        ${paths.map((d, i) => `
          <path d="${d}" fill="${fillColor}" fill-rule="nonzero" style="opacity: 0; animation: signature-fade 0.5s ease-out ${i * stagger + duration - 0.2}s forwards;" />
        `).join('')}
      </svg>`;

      const container = this.container.querySelector('#signature-container');
      if (container) {
        container.innerHTML = svgContent;
      }
    } catch (err) {
      console.error("Signature rendering failed:", err);
      const container = this.container.querySelector('#signature-container');
      if (container) {
        container.innerHTML = `<h1 style="color: ${color}; font-size: 5rem; font-family: cursive; text-shadow: 0 0 20px rgba(255,0,128,0.8);">${text}</h1>`;
      }
    }
  }

  destroy() {
  }
}
