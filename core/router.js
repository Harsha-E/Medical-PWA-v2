/**
 * MedCare | Central Hash-Based Router
 * Safely normalizes parameterized hashes to prevent lookup failures.
 */

export class Router {
  /**
   * @param {Record<string, new () => object>} routes  hash → View class map
   * @param {HTMLElement} viewport                     the DOM node to render into
   */
  constructor(routes, viewport) {
    this.routes = routes;
    this.viewport = viewport;

    /** @type {any | null} */
    this.currentView = null;
    this.currentHash = null;

    this.mainNav = ['#/dashboard', '#/medications', '#/appointments', '#/peer-hub', '#/settings', '#/admin'];
    this.fadeArray = ['#/', '#/landing', '#/login', '#/register', '#/onboarding', '#/install'];
  }

  init() {
    this.handleRoute();
  }

  /**
   * Reads current hash, strips query/subpath boundaries, and mounts the view.
   */
  async handleRoute() {
    const rawHash = window.location.hash || '#/landing';
    
    // 1. Strip out any trailing query string parameters (?id=... or ?name=...)
    let baseRoute = rawHash.split('?')[0];
    
    // 2. Normalize trailing subpath variables (e.g., '#/edit/24' becomes '#/edit')
    const segments = baseRoute.split('/');
    if (segments.length > 2) {
      baseRoute = `#/${segments[1]}`;
    }
    

    // Identify matching template class configuration against mapped routes
    const ViewClass = this.routes[baseRoute] ?? this.routes['#/landing'];

    if (!ViewClass) {
      console.warn(`[Router] No view registered matching base identifier: "${baseRoute}"`);
      this.viewport.innerHTML = `<div style="padding: 2rem; color: white; background: red; font-weight: bold; font-family: monospace;">Route Not Found: ${baseRoute}</div>`;
      this.viewport.style.opacity = '1';
      this.viewport.style.visibility = 'visible';
      return;
    }

    // Render configuration mapping layers onto active view ports
    try {
      const oldView = this.currentView;
      const oldHash = this.currentHash;
      
      const newView = new ViewClass();
      const content = await newView.render();
      const newHash = baseRoute;

      // 1. Prepare incoming node
      let incomingNode;
      if (content instanceof HTMLElement) {
          incomingNode = content;
      } else {
          incomingNode = document.createElement('div');
          if (content instanceof Node) incomingNode.appendChild(content);
          else incomingNode.innerHTML = content || '';
      }

      // If this is the first render, just append
      if (!oldHash) {
        this.viewport.innerHTML = '';
        this.viewport.appendChild(incomingNode);
        this.currentView = newView;
        this.currentHash = newHash;
        this.viewport.style.opacity = '1';
        this.viewport.style.visibility = 'visible';
        return;
      }

      // DOM Handoff Architecture
      const outgoingNode = this.viewport.firstElementChild;
      
      // Use only crossfade for smooth transitions
      let transitionClass = 'crossfade';

      const originalClass = incomingNode.className || '';
      incomingNode.dataset.originalClass = originalClass;

      // Apply locks
      incomingNode.className = `${originalClass} view-transition-node incoming ${transitionClass}`;
      if (outgoingNode) {
          const outgoingOrigClass = outgoingNode.dataset.originalClass || outgoingNode.className || '';
          outgoingNode.className = `${outgoingOrigClass} view-transition-node outgoing ${transitionClass}`;
      }
      
      this.viewport.appendChild(incomingNode);
      this.currentView = newView;
      this.currentHash = newHash;

      // Garbage Collection
      setTimeout(async () => {
          if (outgoingNode && outgoingNode.parentNode) {
              outgoingNode.remove();
          }
          if (oldView?.destroy) {
              try { await oldView.destroy(); }
              catch (e) { console.error('[Router] Destruction error handling:', e); }
          }
          // Strip locks
          incomingNode.className = incomingNode.dataset.originalClass || '';
      }, 420);
      
      // Unblockable sequence: forcefully guarantee the viewport renders into view
      this.viewport.style.opacity = '1';
      this.viewport.style.visibility = 'visible';
    } catch (e) {
      console.error(`[Router] View generation aborted for target path "${baseRoute}":`, e);
      this._renderError(baseRoute, e);
    }
  }

  _renderError(hash, error) {
    this.viewport.innerHTML = `
      <div style="padding: 2rem; font-family: monospace; color: #ffd9b5; background: #0a0407; min-height: 80vh;">
        <p style="color: #f87171; font-weight: bold;">⚠ View Render Exception Pipeline Intercepted [${hash}]</p>
        <pre style="font-size: 11px; opacity: 0.7; margin-top: 1rem; white-space: pre-wrap;">${error?.stack || error?.message || error}</pre>
      </div>`;
  }
}