/**
 * MedCare | Landing View (Ultra-Lightweight)
 * WebGL Particle Engine transplanted to StoryEngine.js
 * Added WebGLLiquid Background Animation
 */
import StoryEngine from '../core/StoryEngine.js';
import WebGLLiquid from '../core/WebGLLiquid.js';

export default class LandingView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'force-dark-theme min-h-[100dvh] w-full flex flex-col relative z-10 text-text-primary font-sans pointer-events-none';

    this.container.innerHTML = `
      <!-- WebGL Background Layer -->
      <div id="liquid-host" class="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#0a0407]">
        <canvas id="liquid-canvas" aria-hidden="true" class="absolute inset-0 w-full h-full block pointer-events-none"></canvas>
        <!-- Soft vignette overlay to ensure text readability around edges without crushing contrast -->
        <div class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(9,9,11,0.6)_100%)] pointer-events-none"></div>
      </div>

      <main class="flex-1 flex items-center justify-center relative overflow-hidden pointer-events-auto z-10 w-full h-[100dvh] pt-20">
        <div class="w-full max-w-7xl mx-auto px-6 md:px-12 grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          
          <!-- Left Content Panel -->
          <div class="relative z-20 flex flex-col items-start text-left">
            <span class="inline-block text-accent-bright/80 tracking-[0.4em] text-xs font-mono uppercase mb-6 animate-fade-in py-1 px-3 rounded-full border border-accent-bright/20 bg-accent-primary/5 backdrop-blur-sm">
              Clinical Health Sentinel
            </span>
            
            <h1 class="text-6xl lg:text-7xl xl:text-8xl font-bold leading-[0.95] tracking-tighter drop-shadow-2xl animate-fade-in-up mb-8 flex flex-wrap items-center gap-x-4 gap-y-2" style="font-family: var(--font-display);">
              <span class="bg-gradient-to-br from-[#ca5229] via-[#ffb88c] to-[#9a3915] bg-clip-text text-transparent">Secured in One</span>
              <span class="mix-blend-difference text-white">GO.</span>
            </h1>

            <div class="h-12 mb-10 flex items-center justify-start relative z-20">
              <p class="text-text-secondary text-lg leading-relaxed font-body max-w-md">
                <span class="typewriter-text" data-text="A unified, secure biomedical ledger and high-fidelity drug interaction engine."></span><span class="typewriter-cursor text-accent-primary animate-pulse font-bold">|</span>
              </p>
            </div>

            <div class="flex flex-col gap-5 w-full sm:w-auto z-20 animate-fade-in-up" style="animation-delay: 200ms; animation-fill-mode: both;">
              <button id="trigger-story" class="w-full group relative px-8 py-4 rounded-full text-text-primary font-mono text-sm uppercase tracking-widest hover:-translate-y-1 active:translate-y-1 transition-transform duration-300 flex items-center justify-center gap-3 overflow-hidden bg-[#150a10] shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.05),inset_-4px_-4px_8px_rgba(0,0,0,0.8),inset_4px_4px_8px_rgba(255,255,255,0.1)] border border-white/5">
                <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                <span class="relative z-10 flex items-center gap-2">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="text-accent-primary"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  Explore Platform
                </span>
              </button>
              
              <div class="flex flex-row gap-5 w-full">
                <a href="#/login" class="flex-1 py-3 rounded-full text-text-primary font-mono text-xs font-bold uppercase tracking-widest hover:-translate-y-1 active:translate-y-1 transition-transform duration-300 flex items-center justify-center bg-[#150a10] shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.05),inset_-4px_-4px_8px_rgba(0,0,0,0.8),inset_4px_4px_8px_rgba(255,255,255,0.1)] border border-white/5">
                  Login
                </a>
                <a href="#/register" class="group flex-1 py-3 rounded-full text-[#2a0802] font-mono text-xs font-bold uppercase tracking-widest hover:-translate-y-1 active:translate-y-1 transition-transform duration-300 flex items-center justify-center bg-gradient-to-br from-[#ca5229] to-[#9a3915] shadow-[8px_8px_16px_rgba(0,0,0,0.6),-4px_-4px_10px_rgba(255,255,255,0.1),inset_-4px_-4px_8px_rgba(100,20,5,0.6),inset_4px_4px_12px_rgba(255,184,140,0.9)] border border-[#ffb88c]/50 relative overflow-hidden">
                  <div class="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                  <span class="relative z-10">Register</span>
                </a>
              </div>
            </div>
          </div>

          <!-- Right Floating Elements Panel (Glassmorphic Mock UI) -->
          <div class="hidden lg:flex relative z-20 h-[600px] items-center justify-center">
            
            <!-- Main Hero Card -->
            <div class="absolute right-0 w-[420px] rounded-3xl bg-surface-elevated/40 backdrop-blur-2xl border border-border/40 shadow-[0_32px_64px_rgba(0,0,0,0.6)] p-8 animate-fade-in-up" style="animation-delay: 400ms; animation-fill-mode: both; transform-style: preserve-3d; transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);">
              <div class="flex justify-between items-start mb-8">
                <div>
                  <h3 class="text-sm font-mono tracking-widest text-text-secondary uppercase mb-1">Live Adherence</h3>
                  <div class="text-3xl font-display font-bold text-text-primary">94.2%</div>
                </div>
                <div class="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center border border-success/30 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--color-success)" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
                </div>
              </div>
              
              <div class="space-y-4">
                <div class="w-full bg-surface-deep/60 rounded-full h-2 overflow-hidden border border-border/20">
                  <div class="bg-gradient-to-r from-success to-emerald-400 h-full rounded-full w-[94.2%] shadow-[0_0_10px_rgba(16,185,129,0.5)] relative">
                    <div class="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-r from-transparent to-white/30 animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
                <div class="flex justify-between text-xs font-mono text-text-muted">
                  <span>Weekly Target</span>
                  <span class="text-success">+2.4% ↑</span>
                </div>
              </div>

              <div class="mt-8 pt-8 border-t border-border/30">
                <div class="flex items-center gap-4">
                  <div class="w-10 h-10 rounded-xl bg-accent-soft flex items-center justify-center border border-accent-primary/20">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-primary)" stroke-width="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-text-primary">Secure Vault</div>
                    <div class="text-xs text-text-muted">End-to-end encrypted ledger</div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Floating Mini Card 1 -->
            <div class="absolute right-[320px] top-[80px] w-48 rounded-2xl bg-surface-elevated/50 backdrop-blur-3xl border border-border/40 shadow-2xl p-4 animate-fade-in-up" style="animation-delay: 600ms; animation-fill-mode: both; transform: translateZ(50px);">
              <div class="flex items-center gap-3 mb-2">
                <div class="w-2 h-2 rounded-full bg-primary animate-pulse shadow-[0_0_8px_var(--color-primary)]"></div>
                <span class="text-xs font-mono text-text-secondary">System Status</span>
              </div>
              <div class="text-sm font-bold text-text-primary">All nodes active</div>
            </div>

            <!-- Floating Mini Card 2 -->
            <div class="absolute right-[-40px] bottom-[120px] w-56 rounded-2xl bg-surface-elevated/60 backdrop-blur-3xl border border-border/50 shadow-2xl p-5 animate-fade-in-up" style="animation-delay: 800ms; animation-fill-mode: both; transform: translateZ(80px);">
              <div class="flex justify-between items-center mb-3">
                <span class="text-xs font-mono text-text-secondary">Network Shield</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent-bright)" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
              </div>
              <div class="flex gap-1 mb-1">
                <div class="flex-1 h-1.5 bg-accent-bright rounded-full shadow-[0_0_8px_var(--color-accent-bright)]"></div>
                <div class="flex-1 h-1.5 bg-accent-bright rounded-full shadow-[0_0_8px_var(--color-accent-bright)]"></div>
                <div class="flex-1 h-1.5 bg-accent-bright rounded-full shadow-[0_0_8px_var(--color-accent-bright)]"></div>
              </div>
              <div class="text-[10px] text-text-muted mt-2 text-right">Maximum Protection</div>
            </div>

          </div>
        </div>
      </main>
    `;

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

    // Boot the liquid animation once the container is appended
    setTimeout(() => {
      const canvas = this.container.querySelector('#liquid-canvas');
      const host = this.container.querySelector('#liquid-host');
      if (canvas && host) {
        this._liquidAnimation = new WebGLLiquid(canvas, host);
      }
    }, 50);

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
    if (this._typingTimer) clearTimeout(this._typingTimer);
    if (this._storyTimer) clearTimeout(this._storyTimer);
    if (this._typeLoop) clearTimeout(this._typeLoop);
    if (this._liquidAnimation) this._liquidAnimation.destroy();
    document.querySelector('.story-engine-overlay')?.remove();
  }
}
