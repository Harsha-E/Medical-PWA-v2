export default class AppHeader {
  constructor() {
    this.el = document.createElement('header');
    
    // Base styles according to spec
    this.el.style.position = 'fixed';
    this.el.style.top = '0';
    this.el.style.left = '0';
    this.el.style.width = '100%';
    this.el.style.height = '72px';
    this.el.style.zIndex = '50';
    this.el.style.backdropFilter = 'blur(24px)';
    this.el.style.WebkitBackdropFilter = 'blur(24px)';
    this.el.style.borderBottom = '1px solid var(--color-border)';
    this.el.style.backgroundColor = 'var(--color-header-bg)';
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
    this.el.style.alignItems = 'center';
    this.el.style.justifyContent = 'space-between';
    this.el.style.padding = '0 16px';
    // Clear previous contents
    this.el.innerHTML = '';
    this.handlers.clear();

    const { eyebrow, title, back, actions = [], skeleton } = config;

    // LEFT COLUMN
    const leftCol = document.createElement('div');
    leftCol.style.minWidth = '56px';
    leftCol.style.display = 'flex';
    leftCol.style.alignItems = 'center';
    if (back) {
      const backBtn = document.createElement('button');
      backBtn.className = 'w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 border';
      backBtn.style.backgroundColor = 'var(--color-accent-soft)';
      backBtn.style.borderColor = 'var(--color-border)';
      backBtn.style.color = 'var(--color-text-primary)';
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
    centerCol.style.flex = '1';
    centerCol.style.display = 'flex';
    centerCol.style.flexDirection = 'column';
    centerCol.style.alignItems = 'center';
    centerCol.style.justifyContent = 'center';
    centerCol.style.textAlign = 'center';

    if (skeleton) {
      centerCol.innerHTML = `
        <div class="skeleton" style="height: 10px; width: 100px; margin-bottom: 2px;"></div>
        <div class="skeleton" style="height: 22px; width: 160px;"></div>
      `;
    } else {
      if (eyebrow) {
        const eyeEl = document.createElement('span');
        eyeEl.className = 'text-[10px] font-mono uppercase tracking-[0.2em] leading-none mb-0.5';
        eyeEl.style.color = 'var(--color-primary)';
        eyeEl.textContent = eyebrow;
        centerCol.appendChild(eyeEl);
      }
      
      this.titleEl = document.createElement('h1');
      this.titleEl.className = 'text-lg font-bold leading-none';
      this.titleEl.style.color = 'var(--color-text-primary)';
      this.titleEl.textContent = typeof title === 'function' ? title() : (title || '');
      centerCol.appendChild(this.titleEl);
    }
    this.el.appendChild(centerCol);

    // RIGHT COLUMN
    const rightCol = document.createElement('div');
    rightCol.style.minWidth = '56px';
    rightCol.style.display = 'flex';
    rightCol.style.alignItems = 'center';
    rightCol.style.justifyContent = 'flex-end';
    rightCol.style.gap = '8px';

    actions.forEach(action => {
      const isAnchor = !!action.href;
      const el = document.createElement(isAnchor ? 'a' : 'button');
      if (isAnchor) el.href = action.href;
      
      el.className = 'w-10 h-10 rounded-2xl flex items-center justify-center transition-all active:scale-90 border';
      el.setAttribute('aria-label', action.label || '');
      el.setAttribute('data-action-id', action.id);
      
      if (action.style === 'accent') {
        el.style.background = 'linear-gradient(to bottom right, var(--color-secondary), var(--color-primary))';
        el.style.borderColor = 'var(--color-border)';
        el.style.color = 'var(--color-surface)';
      } else {
        // ghost
        el.style.backgroundColor = 'var(--color-accent-soft)';
        el.style.borderColor = 'var(--color-border)';
        el.style.color = 'var(--color-text-primary)';
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
