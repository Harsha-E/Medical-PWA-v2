import { globalRouter } from '../core/router.js';
import { globalStore } from '../core/store.js';
import { Utils } from '../core/utils.js';

class NavigationBar {
  static _container = null;
  static _unsubscribe = null;
  static _hashHandler = null;

  static async mount(container) {
    this._container = container;
    container.innerHTML = this._render();
    this._bindEvents();
    this.setActiveRoute(globalRouter.getCurrentRoute());
    this.updateNotificationBadge((globalStore.getStateSlice('alerts') || []).length);

    if (this._unsubscribe) {
      this._unsubscribe();
    }
    this._unsubscribe = globalStore.subscribe('alerts', (alerts) => {
      this.updateNotificationBadge((alerts || []).length);
    });
  }

  static _render() {
    return `
      <nav class="navbar">
        <div class="navbar-brand">
          <h1>MedCare</h1>
        </div>
        <button id="navbar-toggle" class="navbar-button" aria-label="Toggle navigation">Menu</button>
        <div id="navbar-menu" class="navbar-menu">
          <a href="#/dashboard" class="navbar-item">Home</a>
          <a href="#/scan" class="navbar-item">Scan</a>
          <a href="#/interactions" class="navbar-item">Interactions</a>
          <a href="#/history" class="navbar-item">History</a>
          <a href="#/family" class="navbar-item">Family</a>
          <a href="#/reminders" class="navbar-item">Reminders</a>
          <a href="#/emergency" class="navbar-item">Emergency</a>
          <a href="#/settings" class="navbar-item">Settings</a>
        </div>
        <div class="navbar-actions">
          <button id="notifications-btn" class="navbar-button">
            Alerts <span class="badge">0</span>
          </button>
          <button id="user-menu-btn" class="navbar-button">Profile</button>
        </div>
      </nav>
    `;
  }

  static _bindEvents() {
    const toggle = Utils.qs('#navbar-toggle', this._container);
    const menu = Utils.qs('#navbar-menu', this._container);
    const userMenu = Utils.qs('#user-menu-btn', this._container);
    const notificationsButton = Utils.qs('#notifications-btn', this._container);

    if (toggle && menu) {
      Utils.on(toggle, 'click', () => menu.classList.toggle('open'));
    }

    if (userMenu) {
      Utils.on(userMenu, 'click', () => globalRouter.navigate('#/settings'));
    }

    if (notificationsButton) {
      Utils.on(notificationsButton, 'click', () => globalRouter.navigate('#/reminders'));
    }

    if (this._hashHandler) {
      window.removeEventListener('hashchange', this._hashHandler);
    }
    this._hashHandler = () => this.setActiveRoute(globalRouter.getCurrentRoute());
    window.addEventListener('hashchange', this._hashHandler);
  }

  static setActiveRoute(route) {
    if (this._container) {
      this._container.style.display = ['#/splash', '#/login', '#/onboarding'].includes(route) ? 'none' : 'block';
    }
    Utils.qsa('.navbar-item', this._container).forEach((item) => {
      const href = item.getAttribute('href');
      item.classList.toggle('active', href === route || (href === '#/dashboard' && route === '#/'));
    });
  }

  static updateNotificationBadge(count = 0) {
    const badge = Utils.qs('#notifications-btn .badge', this._container);
    if (badge) {
      badge.textContent = String(count);
    }
  }

  static destroy() {
    if (this._unsubscribe) {
      this._unsubscribe();
      this._unsubscribe = null;
    }
    if (this._hashHandler) {
      window.removeEventListener('hashchange', this._hashHandler);
      this._hashHandler = null;
    }
    if (this._container) {
      this._container.innerHTML = '';
    }
  }
}

export default NavigationBar;
