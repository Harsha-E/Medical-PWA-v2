import { auth } from '../core/firebase.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import WebGLLiquid from '../core/WebGLLiquid.js';

export default class LoginView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'h-[100dvh] overflow-y-auto w-full flex flex-col items-center justify-center p-6 pt-28 relative z-10';

    this.container.innerHTML = `
      <!-- WebGL Background Layer -->
      <div id="liquid-host" class="absolute inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[#02040b]">
        <canvas id="liquid-canvas" aria-hidden="true" class="absolute inset-0 w-full h-full block pointer-events-none"></canvas>
        <div class="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent pointer-events-none"></div>
      </div>
      <!-- Bright Overlay removed to fix blur stacking issues -->
      <div class="absolute inset-0 pointer-events-none z-[5]" style="background-color: var(--color-surface); opacity: 0.1;"></div>

      <div class="clay-glass-panel w-full max-w-md p-8 animate-fade-in-up relative z-10">
        <!-- Inner glow wrapper to safely isolate overflow-hidden without breaking Safari/WebKit rendering -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] z-0">
          <div class="absolute -top-24 -left-24 w-48 h-48 bg-white/20 blur-[50px] rounded-full"></div>
          <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffb88c]/20 blur-[50px] rounded-full"></div>
        </div>

        <div class="text-center mb-8 relative z-10">
          <div class="w-16 h-16 mx-auto rounded-2xl shadow-lg flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300" style="background: linear-gradient(to bottom right, var(--color-surface-elevated), var(--color-surface)); border: 1px solid var(--color-border);">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 class="text-3xl font-display font-bold tracking-tight" style="color: var(--color-text-primary);">Access Portal</h2>
          <p class="text-[#ca5229] text-xs mt-2 font-mono uppercase tracking-widest font-semibold">Verify Clinical Identity</p>
        </div>

        <div id="error-container" class="hidden relative z-10 mb-5 p-3 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs font-mono flex items-center gap-2 transition-all opacity-0 transform -translate-y-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span id="error-text"></span>
        </div>
        <div id="success-container" class="hidden relative z-10 mb-5 p-3 rounded-xl bg-green-50 border border-green-100 text-green-700 text-xs font-mono flex items-center gap-2 transition-all opacity-0 transform -translate-y-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span id="success-text"></span>
        </div>

        <form id="login-form" class="space-y-5 relative z-10 group">
          <div class="relative">
            <input type="email" id="email" autocomplete="email" required class="peer w-full px-5 py-4 pt-6 rounded-xl placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#7f2f5d]/30 transition-all font-sans shadow-sm" style="background-color: color-mix(in srgb, var(--color-surface) 60%, transparent); border: 1px solid var(--color-border); color: var(--color-text-primary);" placeholder="Clinical Identifier">
            <label for="email" class="absolute left-5 top-2 text-[10px] font-mono uppercase tracking-widest transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest pointer-events-none" style="color: var(--color-text-secondary);">Clinical Identifier (Email)</label>
          </div>
          
          <div class="relative">
            <input type="password" id="password" autocomplete="current-password" required class="peer w-full px-5 py-4 pt-6 rounded-xl placeholder-transparent focus:outline-none focus:ring-2 focus:ring-[#7f2f5d]/30 transition-all font-sans shadow-sm" style="background-color: color-mix(in srgb, var(--color-surface) 60%, transparent); border: 1px solid var(--color-border); color: var(--color-text-primary);" placeholder="Security Key">
            <label for="password" class="absolute left-5 top-2 text-[10px] font-mono uppercase tracking-widest transition-all peer-placeholder-shown:top-4 peer-placeholder-shown:text-xs peer-placeholder-shown:normal-case peer-placeholder-shown:tracking-normal peer-focus:top-2 peer-focus:text-[10px] peer-focus:uppercase peer-focus:tracking-widest pointer-events-none" style="color: var(--color-text-secondary);">Security Key (Password)</label>
          </div>
          
          <div class="flex justify-end">
            <button type="button" id="forgot-password" class="text-[10px] font-mono uppercase tracking-widest transition-colors hover:opacity-80" style="color: var(--color-text-secondary);">Reset Security Key?</button>
          </div>

          <button type="submit" id="submit-btn" class="relative w-full py-4 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] border border-[#ffb88c]/30 text-white font-mono text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-[#ca5229]/20 active:scale-95 transition-all mt-2 overflow-hidden flex items-center justify-center gap-2">
            <span class="btn-text">Authenticate</span>
            <svg class="btn-spinner hidden animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
          </button>
        </form>

        <div class="relative flex items-center py-6 z-10">
          <div class="flex-grow border-t" style="border-color: var(--color-border);"></div>
          <span class="flex-shrink-0 mx-4 text-[10px] font-mono uppercase tracking-widest" style="color: var(--color-text-secondary);">Federated Access</span>
          <div class="flex-grow border-t" style="border-color: var(--color-border);"></div>
        </div>

        <div class="space-y-3 relative z-10">
          <button id="google-auth" type="button" class="w-full flex items-center justify-center gap-3 py-4 rounded-xl font-mono text-xs font-semibold uppercase tracking-widest hover:brightness-95 active:scale-95 transition-all shadow-sm" style="background-color: var(--color-surface-elevated); border: 1px solid var(--color-border); color: var(--color-text-primary);">
            <svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
            Google Workspace ID
          </button>
        </div>

        <p class="mt-8 text-center text-xs font-mono uppercase tracking-widest relative z-10" style="color: var(--color-text-secondary);">
          New clinical entity? <a href="#/register" class="text-[#ca5229] hover:text-[#7f2f5d] transition-colors font-bold ml-1">Initialize Protocol</a>
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
    const form = this.container.querySelector('#login-form');
    const err = this.container.querySelector('#error-container');
    const success = this.container.querySelector('#success-container');
    const btn = this.container.querySelector('#submit-btn');
    const googleBtn = this.container.querySelector('#google-auth');
    const forgotBtn = this.container.querySelector('#forgot-password');


    const errText = this.container.querySelector('#error-text');
    const successText = this.container.querySelector('#success-text');
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

    const showSuccess = (msg) => {
      successText.textContent = msg;
      success.classList.remove('hidden');
      requestAnimationFrame(() => {
        success.classList.remove('opacity-0', '-translate-y-2');
        success.classList.add('opacity-100', 'translate-y-0');
      });
    };

    const setCheckingState = (isChecking) => {
      btn.disabled = isChecking;
      if (isChecking) {
        btnText.textContent = 'Verifying...';
        btnSpinner.classList.remove('hidden');
      } else {
        btnText.textContent = 'Authenticate';
        btnSpinner.classList.add('hidden');
      }
    };


    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.add('hidden', 'opacity-0');
      success.classList.add('hidden', 'opacity-0');
      setCheckingState(true);
      
      try {
        await signOut(auth); // Clear any Google-linked session before password entry
        await signInWithEmailAndPassword(auth, form.email.value, form.password.value);
      } catch (error) {
        setCheckingState(false);
        if (error.code === 'auth/invalid-credential') {
          showError("Incorrect security key. Try Federated Access or Reset Security Key.");
        } else {
          showError(error.message.replace('Firebase: ', ''));
        }
      }
    });

    forgotBtn.addEventListener('click', async () => {
      const email = form.email.value.trim();
      err.classList.add('hidden', 'opacity-0');
      success.classList.add('hidden', 'opacity-0');
      
      if (!email) {
        showError("Please enter your clinical identifier (email) first to reset your security key.");
        return;
      }
      
      try {
        forgotBtn.textContent = "Transmitting...";
        forgotBtn.disabled = true;
        await sendPasswordResetEmail(auth, email);
        showSuccess(`Security key reset instructions transmitted to ${email}. Check your inbox.`);
      } catch (error) {
        showError(error.message.replace('Firebase: ', ''));
      } finally {
        forgotBtn.textContent = "Reset Security Key?";
        forgotBtn.disabled = false;
      }
    });


    googleBtn.addEventListener('click', async () => {
      err.classList.add('hidden', 'opacity-0');
      success.classList.add('hidden', 'opacity-0');
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

