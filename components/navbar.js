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
    
    // Hardcoded override to ensure Top-position on landing
    // This class is applied before the browser paints the navbar
    const positionClass = isLanding 
      ? 'fixed top-6' 
      : (isAuth ? 'fixed bottom-4 md:top-6 md:bottom-auto' : 'fixed top-6');

    const isAuthLayout = isAuth && !isLanding;

    if (isAuthLayout) {
      this.root.innerHTML = `
        <nav id="glass-nav" class="bottom-6 md:bottom-auto md:top-6 fixed z-[9999] left-1/2 -translate-x-1/2 w-[95%] max-w-2xl px-2 md:px-6 py-3 rounded-full flex justify-between items-center bg-[#0a0407]/60 backdrop-blur-xl border border-[#7f2f5d]/50 shadow-[0_8px_32px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,217,181,0.15)] transition-all duration-300">
          ${this.getAuthenticatedMenu(hash)}
        </nav>
      `;
    } else {
      this.root.innerHTML = `
        <nav id="glass-nav" class="${positionClass} left-1/2 -translate-x-1/2 w-[90%] sm:w-[95%] max-w-5xl h-14 md:h-16 flex items-center justify-between px-2 md:px-3 bg-[#0a0407]/40 backdrop-blur-2xl md:backdrop-blur-3xl border border-[#7f2f5d]/30 rounded-full z-[9000] shadow-[0_8px_32px_0_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,217,181,0.1)] transition-all duration-700 ease-pill-glide select-none pointer-events-auto">
          <a href="#/" class="flex items-center gap-2 md:gap-3 pl-3 md:pl-4 mr-auto hover:opacity-80 transition-opacity">
            <svg class="w-5 h-5 md:w-6 md:h-6" viewBox="0 0 24 24" fill="none" stroke="#ffd9b5" stroke-width="2"><path d="M11 2a2 2 0 0 0-2 2v5a2 2 0 0 1-2 2H2a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h5a2 2 0 0 1 2 2v5a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-5a2 2 0 0 1 2-2h5a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-5a2 2 0 0 1-2-2V4a2 2 0 0 0-2-2h-4Z"></path></svg>
            <span class="font-display text-lg tracking-tight text-white font-medium hidden min-[400px]:block mt-[2px]">MedCare</span>
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
        <a href="#/login" class="flex items-center gap-2 px-4 md:px-5 py-2 md:py-2.5 rounded-full text-xs md:text-xs font-mono tracking-widest text-gray-400 hover:text-white hover:bg-white/5 transition-all uppercase">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
            <span class="hidden sm:block">Portal</span>
        </a>
        <a href="#/register" class="flex items-center gap-2 px-4 md:px-6 py-2 md:py-2.5 rounded-full bg-linear-to-r from-[#7f2f5d]/80 to-[#4a1532]/80 border border-[#ffb88c]/30 text-[#ffd9b5] text-xs md:text-xs font-mono uppercase tracking-widest hover:brightness-125 transition-all">
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="8.5" cy="7" r="4"></circle><line x1="20" y1="8" x2="20" y2="14"></line><line x1="23" y1="11" x2="17" y2="11"></line></svg>
            <span class="hidden sm:block">Initialize</span>
        </a>
      </div>
    `;
  }

  getAuthenticatedMenu(hash) {
    const navItems = [
      { href: '#/dashboard', label: 'Dashboard', icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>' },
      { href: '#/medications', label: 'Meds', icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.5 20.5l-6-6a4.5 4.5 0 1 1 6.4-6.4l6 6a4.5 4.5 0 1 1-6.4 6.4z"></path><line x1="8.5" y1="8.5" x2="15.5" y2="15.5"></line></svg>' },
      { href: '#/scan', label: 'Scan', icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>' },
      { href: '#/appointments', label: 'Appointments', icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>' },
      { href: '#/peer-hub', label: 'Emergency', icon: '<svg class="w-6 h-6 text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"></path></svg>', isRed: true }
    ];

    if (state.isAdmin || state.userProfile?.role === 'admin') {
      navItems.push({
        href: '#/admin',
        label: 'Admin',
        icon: '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>'
      });
    }

    return navItems.map(item => {
      const isActive = hash.startsWith(item.href);
      return `
        <a href="${item.href}" class="nav-item flex items-center justify-center md:justify-start px-2 md:px-4 py-2 md:py-3 rounded-[1.25rem] md:rounded-full relative transition-all duration-300 w-12 md:w-auto overflow-hidden group ${isActive ? 'active shadow-lg md:shadow-[0_0_20px_rgba(202,82,41,0.2)]' : 'hover:bg-white/5'} ${item.isRed ? 'text-red-500' : 'text-gray-400 hover:text-[#ffd9b5]'}">
          <div class="relative z-10 flex items-center">
            ${item.icon}
            <span class="hidden md:block text-xs font-bold uppercase tracking-widest ml-2 truncate ${item.isRed ? 'text-red-500' : ''}">${item.label}</span>
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
      <div class="bg-[#1a0a12] border border-[#7f2f5d] p-8 rounded-3xl max-w-sm w-full shadow-2xl text-center">
        <h3 class="text-lg font-display text-white mb-2">Terminate Session?</h3>
        <p class="text-gray-400 text-xs font-mono mb-6 uppercase tracking-widest">Protocol access will be revoked.</p>
        <div class="flex gap-3">
          <button id="cancel-logout" class="flex-1 py-3 rounded-xl border border-white/10 text-white text-xs uppercase font-bold tracking-widest hover:bg-white/5">Cancel</button>
          <button id="confirm-logout" class="flex-1 py-3 rounded-xl bg-red-900/50 border border-red-500/30 text-red-200 text-xs uppercase font-bold tracking-widest hover:bg-red-900/80">Terminate</button>
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