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
    
    console.log('[Router] Mounting:', baseRoute);

    // Identify matching template class configuration against mapped routes
    const ViewClass = this.routes[baseRoute] ?? this.routes['#/landing'];

    if (!ViewClass) {
      console.warn(`[Router] No view registered matching base identifier: "${baseRoute}"`);
      this.viewport.innerHTML = `<div style="padding: 2rem; color: white; background: red; font-weight: bold; font-family: monospace;">Route Not Found: ${baseRoute}</div>`;
      this.viewport.style.opacity = '1';
      this.viewport.style.visibility = 'visible';
      return;
    }

    // Clean up historical view tracking allocations to prevent memory leak states
    if (this.currentView?.destroy) {
      try { await this.currentView.destroy(); }
      catch (e) { console.error('[Router] Destruction error handling:', e); }
    }

    // Render configuration mapping layers onto active view ports
    try {
      this.currentView = new ViewClass();
      const content = await this.currentView.render();

      this.viewport.innerHTML = '';

      if (content instanceof Node) {
        this.viewport.appendChild(content);
      } else {
        this.viewport.innerHTML = content || '';
      }
      
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