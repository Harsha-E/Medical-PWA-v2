/**
 * MedCare | Premium Interactive Glassmorphism Navigation
 */
import state from '../core/state.js';
import { auth } from '../core/firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export default class GlassNavbar {
  constructor() {
    this.root = document.getElementById('navigation-root');
    this.unsubscribe = state.subscribe(() => this.render());
    window.addEventListener('hashchange', () => this.render());
    this.render();
  }

  setVisibility(isVisible) {
    this.isVisible = isVisible;
    const nav = document.getElementById('glass-nav');
    if (nav) {
      nav.style.opacity = isVisible ? '1' : '0';
      nav.style.pointerEvents = isVisible ? 'auto' : 'none';
    }
  }

  render() {
    const isAuth = !!state.user;
    const hash = window.location.hash || '#/';
    
    // Strict check: Landing pages must ALWAYS be at the top
    const isLanding = (hash === '#/' || hash === '#/landing');
    
    // Hardcoded override to ensure Top-position on landing, otherwise always bottom
    // This class is applied before the browser paints the navbar
    const positionClass = isLanding 
      ? 'fixed top-6' 
      : 'fixed bottom-4';

    const isAuthLayout = isAuth && !isLanding;

    if (isAuthLayout) {
      this.root.innerHTML = `
        <nav id="glass-nav" class="bottom-6 fixed z-[9999] left-1/2 -translate-x-1/2 w-[95%] max-w-2xl px-2 md:px-6 py-3 rounded-full flex justify-between items-center backdrop-blur-xl border transition-all duration-300" style="background: var(--color-nav-bg); border-color: var(--color-nav-border); box-shadow: 0 8px 32px var(--color-card-shadow), inset 0 1px 1px rgba(255,255,255,0.08); opacity: 0.85;">
          ${this.getAuthenticatedMenu(hash)}
        </nav>
      `;
    } else {
      this.root.innerHTML = `
        <nav id="glass-nav" class="${positionClass} left-1/2 -translate-x-1/2 w-[90%] sm:w-[95%] max-w-5xl h-14 md:h-16 flex items-center justify-between px-2 md:px-3 backdrop-blur-2xl md:backdrop-blur-3xl border rounded-full z-[9000] transition-all duration-700 ease-pill-glide select-none pointer-events-auto" style="background: var(--color-nav-bg); border-color: var(--color-nav-border); box-shadow: 0 8px 32px var(--color-card-shadow), inset 0 1px 1px rgba(255,255,255,0.08); opacity: 0.85;">
          <a href="#/landing" class="flex items-center gap-2 md:gap-3 pl-3 md:pl-4 mr-auto hover:opacity-80 transition-opacity">
            <svg class="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" stroke-width="2"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"></path></svg>
            <span class="font-display text-lg tracking-tight font-medium block mt-[2px]" style="color: var(--color-text-primary);">MedCheck</span>
          </a>
          ${this.getPublicMenu()}
        </nav>
      `;
    }
    this.attachListeners();
  }

  getPublicMenu() {
    return `
      <div class="flex items-center gap-2 md:gap-3 pr-1">
        <a href="#/login" class="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-xs font-mono tracking-widest hover:bg-white/5 transition-all uppercase" style="color: var(--color-text-secondary);">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            <span class="hidden sm:block">Portal</span>
        </a>
        <a href="#/register" class="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full border text-xs md:text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-all" style="background: linear-gradient(to right, var(--color-primary-dark), var(--color-secondary)); border-color: var(--color-border); color: var(--color-primary-light);">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            <span class="hidden sm:block">Initialize</span>
        </a>
      </div>
    `;
  }

  getAuthenticatedMenu(hash) {
    const navItems = [
      { 
        href: '#/dashboard', 
        label: 'Dashboard', 
        icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>' 
      },
      { 
        href: '#/medications', 
        label: 'Meds', 
        icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.5 20.5l-6-6a4.5 4.5 0 1 1 6.4-6.4l6 6a4.5 4.5 0 1 1-6.4 6.4z"/><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"/></svg>' 
      },
      { 
        href: '#/clinical-ledger', 
        label: 'Ledger', 
        icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>' 
      },
      { 
        href: '#/peer-hub', 
        label: 'Network', 
        icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>'
      },
      { 
        href: '#/settings', 
        label: 'Settings', 
        icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>' 
      }
    ];

    return navItems.map(item => {
      // FIX: Ensure deep paths (e.g. #/medications/add) trigger the correct parent tab
      const isActive = hash === item.href || hash.startsWith(item.href + '/');

      // Setup dynamic CSS variables based on active state
      const textColor = isActive 
        ? 'style="color: var(--color-primary);"' 
        : 'style="color: var(--color-text-secondary);"';

      const activeBg = isActive ? 'is-active' : '';

      return `
        <a href="${item.href}" class="nav-item flex items-center justify-center md:justify-start px-2 md:px-4 py-2 md:py-3 rounded-[1.25rem] md:rounded-full relative transition-all duration-300 w-12 md:w-auto overflow-hidden group ${activeBg}" ${textColor}>
          <div class="relative z-10 flex items-center transition-transform ${isActive ? 'scale-110 md:scale-100' : ''}">
            ${item.icon}
            <span class="hidden md:block text-xs font-bold uppercase tracking-widest ml-2 truncate">${item.label}</span>
          </div>
        </a>
      `;
    }).join('');
  }

  attachListeners() {
    this.root.querySelector('[data-action="logout"]')?.addEventListener('click', () => {
      this.showLogoutConfirmation();
    });
  }

  showLogoutConfirmation() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-6';
    modal.innerHTML = `
      <div class="border p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center" style="background: var(--color-surface-elevated); border-color: var(--color-border);">
        <h3 class="text-lg font-display mb-2" style="color: var(--color-text-primary);">Terminate Session?</h3>
        <p class="text-xs font-mono mb-6 uppercase tracking-widest" style="color: var(--color-text-secondary);">Protocol access will be revoked.</p>
        <div class="flex gap-3">
          <button id="cancel-logout" class="flex-1 py-3 rounded-xl text-xs uppercase font-bold tracking-widest btn-neumorphic" style="border-color: var(--color-border); color: var(--color-text-primary);">Cancel</button>
          <button id="confirm-logout" class="flex-1 py-3 rounded-xl bg-red-900/50 text-red-200 text-xs uppercase font-bold tracking-widest btn-neumorphic">Terminate</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#cancel-logout').onclick = () => modal.remove();
    modal.querySelector('#confirm-logout').onclick = async () => {
      await signOut(auth);
      modal.remove();
      window.location.hash = '#/landing';
    };
  }
}