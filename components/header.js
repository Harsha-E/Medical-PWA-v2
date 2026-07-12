import state from '../core/state.js';

export default class AppHeader {
  constructor() {
    this.el = document.createElement('header');
    
    // Unified Morphism Glass Header
    this.el.className = 'fixed top-0 left-0 w-full h-20 z-50 flex items-center justify-between px-6 transition-all duration-300';
    this.el.style.background = 'linear-gradient(to bottom, rgba(10,4,7,0.95) 0%, rgba(10,4,7,0.8) 50%, rgba(10,4,7,0) 100%)';
    this.el.style.backdropFilter = 'blur(12px)';
    this.el.style.WebkitBackdropFilter = 'blur(12px)';
    this.el.style.display = 'none';

    // Mount to header-root
    const root = document.getElementById('header-root');
    if (root) {
      root.appendChild(this.el);
    } else {
      document.body.appendChild(this.el);
    }
    
    this.handlers = new Map();
    this.el.addEventListener('click', this.onClick.bind(this));
  }

  onClick(e) {
    const btn = e.target.closest('[data-action-id]');
    if (!btn) return;
    const actionId = btn.getAttribute('data-action-id');
    const handler = this.handlers.get(actionId);
    if (handler) {
      handler(e);
    }
  }

  configure(config = {}) {
    if (config.hidden) {
      this.el.style.display = 'none';
      return;
    }
    
    this.el.style.display = 'flex';
    this.el.innerHTML = '';
    this.handlers.clear();

    const { eyebrow, title, back, actions = [], skeleton } = config;

    // LEFT COLUMN
    const leftCol = document.createElement('div');
    leftCol.className = 'min-w-[56px] flex items-center';
    
    if (back) {
      const backBtn = document.createElement('button');
      backBtn.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white';
      backBtn.setAttribute('aria-label', 'Go back');
      backBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>`;
      backBtn.addEventListener('click', () => {
        if (typeof back === 'string') {
          window.location.hash = back;
        } else {
          window.history.back();
        }
      });
      leftCol.appendChild(backBtn);
    }
    this.el.appendChild(leftCol);

    // CENTER COLUMN
    const centerCol = document.createElement('div');
    centerCol.className = 'flex-1 flex flex-col items-center justify-center text-center';

    if (skeleton) {
      centerCol.innerHTML = `
        <div class="h-2 w-24 bg-white/10 rounded mb-1 animate-pulse"></div>
        <div class="h-6 w-32 bg-white/20 rounded animate-pulse"></div>
      `;
    } else {
      if (state.activeProfileContext) {
        const proxyBadge = document.createElement('div');
        proxyBadge.className = 'flex items-center gap-2 mb-1 px-3 py-1 rounded-full bg-[#ffb88c]/20 border border-[#ffb88c]/30 cursor-pointer shadow-lg transition-transform hover:scale-105';
        proxyBadge.innerHTML = `
          ${state.activeProfileContext.avatarUrl ? `<img src="${state.activeProfileContext.avatarUrl}" class="w-4 h-4 rounded-full object-cover border border-[#ffb88c]/50">` : `<div class="w-4 h-4 rounded-full bg-text-primary text-surface flex items-center justify-center text-[8px] font-bold">${(state.activeProfileContext.name || '?')[0].toUpperCase()}</div>`}
          <span class="text-[9px] font-mono uppercase tracking-widest text-[#ffb88c] font-bold">Proxy: ${state.activeProfileContext.name}</span>
          <svg class="w-3 h-3 text-[#ffb88c]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
        `;
        proxyBadge.addEventListener('click', () => {
          state.setActiveProfileContext(null);
          window.location.hash = '#/family-profiles';
        });
        centerCol.appendChild(proxyBadge);
      } else if (eyebrow) {
        const eyeEl = document.createElement('span');
        eyeEl.className = 'text-[9px] font-mono uppercase tracking-widest text-[#ffb88c] opacity-80 mb-1';
        eyeEl.textContent = eyebrow;
        centerCol.appendChild(eyeEl);
      }
      
      this.titleEl = document.createElement('h1');
      this.titleEl.className = 'text-xl font-display font-light text-white tracking-wide';
      this.titleEl.textContent = typeof title === 'function' ? title() : (title || '');
      centerCol.appendChild(this.titleEl);
    }
    this.el.appendChild(centerCol);

    // RIGHT COLUMN
    const rightCol = document.createElement('div');
    rightCol.className = 'min-w-[56px] flex items-center justify-end gap-3';

    actions.forEach(action => {
      const isAnchor = !!action.href;
      const el = document.createElement(isAnchor ? 'a' : 'button');
      if (isAnchor) el.href = action.href;
      
      el.className = 'w-10 h-10 rounded-full flex items-center justify-center transition-all active:scale-90 border';
      el.setAttribute('aria-label', action.label || '');
      el.setAttribute('data-action-id', action.id);
      
      if (action.style === 'accent') {
        el.className += ' border-[#ffb88c]/30 bg-[#7f2f5d]/80 text-[#ffb88c] shadow-[0_0_15px_rgba(127,47,93,0.5)]';
      } else {
        // ghost
        el.className += ' border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white';
      }
      
      el.innerHTML = action.icon;
      rightCol.appendChild(el);
    });
    this.el.appendChild(rightCol);
  }

  on(actionId, callback) {
    this.handlers.set(actionId, callback);
    return this;
  }

  setTitle(newTitle) {
    if (this.titleEl) {
      this.titleEl.textContent = typeof newTitle === 'function' ? newTitle() : newTitle;
    }
  }

  destroy() {
    if (this.el.parentNode) {
      this.el.parentNode.removeChild(this.el);
    }
  }
}
