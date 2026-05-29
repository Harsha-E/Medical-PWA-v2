/**
 * MedCheck | Landing View (Ultra-Lightweight)
 * WebGL Particle Engine transplanted to StoryEngine.js
 */
import StoryEngine from '../core/StoryEngine.js';

export default class LandingView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col relative z-10 text-gray-100 font-sans pointer-events-none';

    this.container.innerHTML = `
      <main class="flex-1 flex flex-col items-center justify-center text-center px-6 relative overflow-hidden pointer-events-auto pt-24 md:pt-32">
        <div class="relative z-10 w-full max-w-4xl mx-auto flex flex-col items-center justify-center">
          
          <div class="mb-6 relative z-20">
            <span class="block text-white/40 tracking-[0.3em] text-xs font-mono uppercase mb-4 animate-fade-in">
              Clinical Health Sentinel
            </span>
            <h1 class="text-white text-5xl md:text-7xl font-semibold leading-[0.9] tracking-tighter drop-shadow-2xl animate-fade-in-up">
              Secured in one <span class="bg-linear-to-r from-[#ffd9b5] via-[#ffb88c] to-[#7f2f5d] bg-clip-text text-transparent">GO</span>
            </h1>
          </div>

          <div class="mb-12 h-6 flex items-center justify-center relative z-20">
            <p class="text-gray-400 text-sm md:text-base leading-relaxed font-mono tracking-wide max-w-lg mx-auto">
              <span class="typewriter-text" data-text="A unified, secure biomedical ledger and high-fidelity drug interaction engine."></span><span class="typewriter-cursor text-[#ffb88c] animate-pulse">|</span>
            </p>
          </div>

          <div class="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center relative z-20 animate-fade-in-up">
            <button id="trigger-story" class="px-8 py-4 rounded-full bg-linear-to-r from-[#7f2f5d]/80 to-[#4a1532]/80 border border-[#ffb88c]/30 text-[#ffd9b5] font-mono text-xs uppercase tracking-widest hover:brightness-125 active:scale-95 transition-all shadow-[0_0_20px_rgba(127,47,93,0.4)] backdrop-blur-xl flex items-center justify-center gap-2">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              How It Works
            </button>
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
    document.querySelector('.story-engine-overlay')?.remove();
  }
}