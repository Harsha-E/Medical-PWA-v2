import state from '../core/state.js';

export default class ContextSwitcher {
  constructor() {
    this.mount();
    this.attachListeners();
  }

  mount() {
    // Create the global overlay for the wave animation
    this.waveOverlay = document.createElement('div');
    this.waveOverlay.className = 'color-wave-overlay fixed inset-0 z-[99999] pointer-events-none opacity-0';
    document.body.appendChild(this.waveOverlay);

    // Create the sticky return bar
    this.returnBar = document.createElement('div');
    this.returnBar.className = 'peer-return-bar fixed top-0 left-0 right-0 h-20 bg-gradient-to-r from-[#ca5229] to-[#7f2f5d] z-[10000] hidden items-center px-6 shadow-xl shadow-[#ca5229]/20 transform -translate-y-full transition-transform duration-500';
    this.returnBar.innerHTML = `
      <button id="exit-peer-context" class="bg-white/20 text-white rounded-xl px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-white/30 transition-colors backdrop-blur-md border border-white/20">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        Return to My Profile
      </button>
      <div class="ml-auto text-white text-right">
        <p class="text-xs font-mono uppercase tracking-[0.2em] opacity-80 leading-none">Viewing Node</p>
        <p class="text-sm font-bold leading-none mt-1" id="peer-context-name">Unknown</p>
      </div>
    `;
    document.body.appendChild(this.returnBar);

    this.returnBar.querySelector('#exit-peer-context').addEventListener('click', () => {
      this.exitContext();
    });
  }

  attachListeners() {
    window.addEventListener('peer:context-enter', (e) => this.enterContext(e.detail));
  }

  enterContext({ peerId, name, color }) {
    // 1. Set global state to indicate we are viewing a peer
    state.currentPeerContext = { peerId, name, color };

    // 2. Trigger color wave
    this.waveOverlay.style.backgroundColor = color;
    this.waveOverlay.classList.remove('opacity-0');
    this.waveOverlay.classList.add('wave-animate');
    
    setTimeout(() => {
        // 3. Route to peer dashboard while screen is covered
        window.location.hash = '#/peer-dashboard';
        
        // 4. Reveal return bar
        this.returnBar.classList.remove('hidden');
        this.returnBar.querySelector('#peer-context-name').textContent = name;
        
        // Ensure standard navbar is hidden while in peer context (managed by app.js / CSS)
        document.body.classList.add('in-peer-context');

        // Small delay to let DOM render before wave recedes
        setTimeout(() => {
            this.returnBar.classList.remove('-translate-y-full');
            this.waveOverlay.classList.remove('wave-animate');
            this.waveOverlay.classList.add('opacity-0');
        }, 100);
    }, 400); // Wait for half of wave animation
  }

  exitContext() {
    state.currentPeerContext = null;

    // Wave animation to exit
    this.waveOverlay.style.backgroundColor = '#1a0a12';
    this.waveOverlay.classList.remove('opacity-0');
    this.waveOverlay.classList.add('wave-animate');
    
    this.returnBar.classList.add('-translate-y-full');

    setTimeout(() => {
        window.location.hash = '#/emergency'; // Route back to mesh hub
        
        document.body.classList.remove('in-peer-context');
        
        setTimeout(() => {
            this.returnBar.classList.add('hidden');
            this.waveOverlay.classList.remove('wave-animate');
            this.waveOverlay.classList.add('opacity-0');
        }, 100);
    }, 400);
  }
}
