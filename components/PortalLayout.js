import state from '../core/state.js';

class PortalLayout {
  constructor() {
    this.bannerElement = null;
    this.boundHandleContextChange = this.handleContextChange.bind(this);
  }

  init() {
    window.addEventListener('medcare:profile-context-changed', this.boundHandleContextChange);
    // Initial check
    this.handleContextChange({ detail: state.activeProfileContext });
  }

  _hashStringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const c = (hash & 0x00FFFFFF).toString(16).toUpperCase();
    return '#' + '00000'.substring(0, 6 - c.length) + c;
  }

  handleContextChange(event) {
    const profile = event.detail;
    
    if (!profile) {
      // Revert to self
      document.body.style.border = 'none';
      if (this.bannerElement) {
        this.bannerElement.remove();
        this.bannerElement = null;
      }
      return;
    }

    // Context is NOT 'self'
    const color = this._hashStringToColor(profile.id || 'default');
    
    // Apply 4px solid colored border to body
    document.body.style.border = `4px solid ${color}`;
    document.body.style.boxSizing = 'border-box';

    // Inject frosted-glass header if not exists
    if (!this.bannerElement) {
      this.bannerElement = document.createElement('div');
      this.bannerElement.className = 'fixed top-0 left-0 w-full z-[10000] flex items-center justify-between px-4 py-3 shadow-lg';
      this.bannerElement.style.backdropFilter = 'blur(20px)';
      this.bannerElement.style.WebkitBackdropFilter = 'blur(20px)';
      this.bannerElement.style.backgroundColor = 'rgba(15, 20, 30, 0.8)';
      this.bannerElement.style.borderBottom = `2px solid ${color}`;
      
      const title = document.createElement('div');
      title.className = 'text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2';
      title.innerHTML = `<span>👁️</span> <span>Managing: <span id="portal-banner-name"></span></span>`;
      
      const exitBtn = document.createElement('button');
      exitBtn.className = 'bg-red-500/20 text-red-300 border border-red-500/50 px-4 py-1.5 rounded font-bold text-xs uppercase tracking-widest active:scale-95 transition-all';
      exitBtn.textContent = 'Exit';
      exitBtn.onclick = () => {
        state.setActiveProfileContext(null);
        window.location.hash = '#/peer-hub';
      };

      this.bannerElement.appendChild(title);
      this.bannerElement.appendChild(exitBtn);
      document.body.appendChild(this.bannerElement);
    }
    
    // Update name and color
    this.bannerElement.style.borderBottom = `2px solid ${color}`;
    this.bannerElement.querySelector('#portal-banner-name').textContent = profile.name || 'Unknown';
  }
}

export const portalLayout = new PortalLayout();
