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
    // (Removed: the main AppHeader now handles the Proxy badge gracefully without layout overlap)
    if (this.bannerElement) {
        this.bannerElement.remove();
        this.bannerElement = null;
    }
    
  }
}

export const portalLayout = new PortalLayout();
