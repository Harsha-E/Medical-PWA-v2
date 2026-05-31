import { auth } from '../core/firebase.js';
import { createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import WebGLLiquid from '../core/WebGLLiquid.js';

export default class RegisterView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'h-[100dvh] overflow-y-auto w-full p-6 pt-12 pb-32 relative z-10 flex flex-col';

    this.container.innerHTML = `
      <!-- WebGL Background Layer -->
      <div id="liquid-host" class="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#02040b]">
        <canvas id="liquid-canvas" aria-hidden="true" class="absolute inset-0 w-full h-full block pointer-events-none"></canvas>
        <div class="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent pointer-events-none"></div>
      </div>
      <!-- Bright Overlay removed to fix blur stacking issues -->
      <div class="absolute inset-0 bg-[var(--color-surface)]/10 pointer-events-none z-[5]"></div>

      <div class="clay-glass-panel w-full max-w-md p-8 animate-fade-in-up relative overflow-hidden z-10 mx-auto my-auto mt-12 mb-16">
        <!-- Inner glow -->
        <div class="absolute -top-24 -left-24 w-48 h-48 bg-white/20 blur-[50px] rounded-full pointer-events-none"></div>
        <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffb88c]/20 blur-[50px] rounded-full pointer-events-none"></div>

        <div class="text-center mb-8 relative z-10">
          <div class="w-16 h-16 mx-auto bg-gradient-to-br from-[var(--color-surface-elevated)] to-[var(--color-surface)] rounded-2xl border border-[var(--color-border)] shadow-lg flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 class="text-3xl font-display font-bold text-[var(--color-text-primary)] tracking-tight">Initialize</h2>
          <p class="text-[#ca5229] text-xs mt-2 font-mono uppercase tracking-widest font-semibold">Create secure ledger</p>
        </div>

        <div id="error-container" class="hidden relative z-10 mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-mono flex items-center gap-2 transition-all opacity-0 transform -translate-y-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span id="error-text"></span>
        </div>

        <form id="register-form" class="space-y-5 relative z-10 group">
          <div class="relative">
            <input type="email" id="email" autocomplete="email" required class="peer w-full px-5 py-4 pt-6 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#7f2f5d]/30 focus:bg-[var(--color-surface)] transition-all font-sans shadow-sm" placeholder="Clinical Identifier">
            <label for="email" class="absolute left-5 top-2 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-secondary)] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-[var(--color-secondary)] pointer-events-none">Clinical Identifier (Email)</label>
          </div>
          <div class="relative">
            <input type="password" id="password" autocomplete="new-password" required class="peer w-full px-5 py-4 pt-6 rounded-xl bg-[var(--color-surface)]/60 border border-[var(--color-border)] text-[var(--color-text-primary)] placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#7f2f5d]/30 focus:bg-[var(--color-surface)] transition-all font-sans shadow-sm" placeholder="Create Security Key">
            <label for="password" class="absolute left-5 top-2 text-[10px] font-mono uppercase tracking-widest text-[var(--color-text-secondary)] transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest peer-focus:text-[var(--color-secondary)] pointer-events-none">Create Security Key</label>
          </div>
          
          <button type="submit" id="email-btn" class="relative w-full py-4 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] border border-[#ffb88c]/30 text-white font-mono text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-[#ca5229]/20 active:scale-95 transition-all mt-2 overflow-hidden flex items-center justify-center gap-2">
            <span class="btn-text">Deploy Protocol</span>
            <svg class="btn-spinner hidden animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
          </button>
        </form>

        <div class="relative flex items-center py-6 z-10">
          <div class="flex-grow border-t border-[var(--color-border)]"></div>
          <span class="flex-shrink-0 mx-4 text-[var(--color-text-secondary)] text-[10px] font-mono uppercase tracking-widest">Federated Access</span>
          <div class="flex-grow border-t border-[var(--color-border)]"></div>
        </div>

        <div class="space-y-3 relative z-10">
          <button id="google-auth" type="button" class="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-[var(--color-text-primary)] font-mono text-xs font-semibold uppercase tracking-widest hover:brightness-95 active:scale-95 transition-all shadow-sm">
            <svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google Workspace ID
          </button>
        </div>

        <p class="mt-8 text-center text-xs text-[var(--color-text-secondary)] font-mono uppercase tracking-widest relative z-10">
          Already secured? <a href="#/login" class="text-[#ca5229] hover:text-[#7f2f5d] transition-colors font-bold ml-1">Access Portal</a>
        </p>
      </div>
    `;

    this.bindEvents();

    setTimeout(() => {
      const canvas = this.container.querySelector('#liquid-canvas');
      const host = this.container.querySelector('#liquid-host');
      if (canvas && host) {
        this._liquidAnimation = new WebGLLiquid(canvas, host);
      }
    }, 50);

    return this.container;
  }

  bindEvents() {
    const form = this.container.querySelector('#register-form');
    const emailBtn = form.querySelector('#email-btn');
    const googleBtn = this.container.querySelector('#google-auth');
    const err = this.container.querySelector('#error-container');

    const errText = this.container.querySelector('#error-text');
    const btnText = this.container.querySelector('.btn-text');
    const btnSpinner = this.container.querySelector('.btn-spinner');

    const showError = (msg) => {
      errText.textContent = msg;
      err.classList.remove('hidden');
      requestAnimationFrame(() => {
        err.classList.remove('opacity-0', '-translate-y-2');
        err.classList.add('opacity-100', 'translate-y-0');
      });
    };

    const setCheckingState = (isChecking) => {
      emailBtn.disabled = isChecking;
      if (isChecking) {
        btnText.textContent = 'Deploying...';
        btnSpinner.classList.remove('hidden');
      } else {
        btnText.textContent = 'Deploy Protocol';
        btnSpinner.classList.add('hidden');
      }
    };


    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.add('hidden', 'opacity-0');
      setCheckingState(true);

      try {
        await createUserWithEmailAndPassword(auth, form.email.value, form.password.value);
      } catch (error) {
        setCheckingState(false);
        showError(error.message.replace('Firebase: ', ''));
      }
    });

    googleBtn.addEventListener('click', async () => {
      err.classList.add('hidden', 'opacity-0');
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<svg class="animate-spin h-4 w-4 text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Establishing...`;
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Google Workspace ID`;
        showError(error.message.replace('Firebase: ', ''));
      }
    });
  }

  destroy() {
    if (this._liquidAnimation) this._liquidAnimation.destroy();
  }
}

