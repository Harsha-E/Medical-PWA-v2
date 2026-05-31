import { auth } from '../core/firebase.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import WebGLLiquid from '../core/WebGLLiquid.js';

export default class LoginView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col items-center justify-center p-4 py-6 relative z-10 overflow-y-auto';

    this.currentStep = 1;
    this.emailValue = '';
    
    this.container.innerHTML = `
      <style>
        .google-input-group {
          position: relative;
          width: 100%;
        }
        .google-input-group input {
          width: 100%;
          padding: 16px;
          border: none;
          font-size: 16px;
          outline: none;
          background: transparent;
          color: var(--color-text-primary);
          box-sizing: border-box;
        }
        .google-input-group label {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          background-color: transparent; 
          padding: 0 4px;
          color: var(--color-text-secondary);
          font-size: 16px;
          pointer-events: none;
          transition: top 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                      font-size 0.15s cubic-bezier(0.4, 0, 0.2, 1), 
                      color 0.15s cubic-bezier(0.4, 0, 0.2, 1),
                      transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 10;
        }
        .google-input-group input:-webkit-autofill,
        .google-input-group input:-webkit-autofill:hover,
        .google-input-group input:-webkit-autofill:focus,
        .google-input-group input:-webkit-autofill:active {
          -webkit-background-clip: text;
          -webkit-text-fill-color: var(--color-text-primary);
          transition: background-color 5000s ease-in-out 0s;
          border-radius: 0;
        }
        .google-input-group input:focus ~ label,
        .google-input-group input:not(:placeholder-shown) ~ label,
        .google-input-group input:-webkit-autofill ~ label {
          top: 0;
          transform: translateY(-50%);
          font-size: 12px;
          color: var(--color-text-secondary);
        }
        .google-input-group input:focus ~ label {
          color: var(--color-primary-dark);
        }
        .google-input-group fieldset {
          position: absolute;
          top: -5px;
          bottom: 0;
          left: 0;
          right: 0;
          padding: 0 8px;
          margin: 0;
          border: 1px solid var(--color-border);
          border-radius: 4px;
          pointer-events: none;
          transition: border-width 0.15s, border-color 0.15s;
        }
        .google-input-group input:focus ~ fieldset {
          border-width: 2px;
          border-color: var(--color-primary-dark);
        }
        .google-input-group legend {
          width: auto;
          padding: 0;
          font-size: 12px;
          line-height: 11px;
          visibility: hidden;
          max-width: 0.01px;
          transition: max-width 50ms cubic-bezier(0.0, 0, 0.2, 1) 0ms;
          white-space: nowrap;
        }
        .google-input-group legend span {
          padding: 0 4px;
          opacity: 0;
        }
        .google-input-group input:focus ~ fieldset legend,
        .google-input-group input:not(:placeholder-shown) ~ fieldset legend,
        .google-input-group input:-webkit-autofill ~ fieldset legend {
          max-width: 1000px;
          transition: max-width 100ms cubic-bezier(0.0, 0, 0.2, 1) 50ms;
        }
      </style>
      <!-- WebGL Background Layer -->
      <div id="liquid-host" class="fixed inset-0 w-full h-full pointer-events-none z-0 overflow-hidden bg-[var(--color-surface)]">
        <canvas id="liquid-canvas" aria-hidden="true" class="absolute inset-0 w-full h-full block pointer-events-none"></canvas>
        <div class="absolute inset-0 bg-gradient-to-r from-white/10 via-white/5 to-transparent pointer-events-none"></div>
      </div>
      <!-- Bright Overlay removed to fix blur stacking issues -->
      <div class="fixed inset-0 pointer-events-none z-[5]" style="background-color: var(--color-surface); opacity: 0.1;"></div>

      <div class="clay-glass-panel w-full max-w-md p-6 animate-fade-in-up relative z-10">
        <!-- Inner glow wrapper to safely isolate overflow-hidden without breaking Safari/WebKit rendering -->
        <div class="absolute inset-0 overflow-hidden pointer-events-none rounded-[inherit] z-0">
          <div class="absolute inset-0 bg-black/20 z-0"></div>
          <div class="absolute -top-24 -left-24 w-48 h-48 bg-white/20 blur-[50px] rounded-full z-10"></div>
          <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-[#ffb88c]/20 blur-[50px] rounded-full z-10"></div>
        </div>

        <div class="text-center mb-8 relative z-10">
          <div class="w-16 h-16 mx-auto rounded-2xl shadow-lg flex items-center justify-center mb-4 transition-transform hover:scale-105 duration-300" style="background: linear-gradient(to bottom right, var(--color-surface-elevated), var(--color-surface)); border: 1px solid var(--color-border);">
             <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ca5229" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h2 class="text-3xl font-display font-bold tracking-tight" style="color: var(--color-text-primary);">Access Portal</h2>
          <p class="text-[#ca5229] text-xs mt-2 font-mono uppercase tracking-widest font-semibold">Verify Clinical Identity</p>
        </div>

        <div id="error-container" class="hidden relative z-10 mb-5 p-3 rounded-xl bg-red-900/40 border border-red-500/50 text-red-200 text-xs font-mono flex items-center gap-2 transition-all opacity-0 transform -translate-y-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span id="error-text"></span>
        </div>
        <div id="success-container" class="hidden relative z-10 mb-5 p-3 rounded-xl bg-green-900/40 border border-green-500/50 text-green-200 text-xs font-mono flex items-center gap-2 transition-all opacity-0 transform -translate-y-2">
          <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          <span id="success-text"></span>
        </div>

        <form id="login-form" class="space-y-4 relative z-10 group">
          <!-- STEP 1: EMAIL -->
          <div id="step-1" class="transition-all duration-300">
            <div class="google-input-group mb-4">
              <input type="email" id="email" autocomplete="email" required placeholder=" ">
              <label for="email">Email</label>
              <fieldset aria-hidden="true"><legend><span>Email</span></legend></fieldset>
            </div>
            <button type="button" id="next-btn" class="w-full py-3 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] border border-[#ffb88c]/30 text-[var(--color-text-primary)] font-mono text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-[#ca5229]/20 active:scale-95 transition-all mt-2 overflow-hidden flex items-center justify-center gap-2">
              Next
            </button>
          </div>
          
          <!-- STEP 2: PASSWORD -->
          <div id="step-2" class="hidden transition-all duration-300 opacity-0 translate-x-4">
            <div class="flex items-center gap-3 mb-4">
              <button type="button" id="back-btn" class="p-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-[var(--color-text-secondary)] transition-colors">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
              </button>
              <div class="text-xs font-mono text-[var(--color-text-secondary)] truncate flex-1" id="display-email"></div>
            </div>

            <div class="google-input-group relative">
              <input type="password" id="password" autocomplete="current-password" required placeholder=" ">
              <label for="password">Password</label>
              <fieldset aria-hidden="true"><legend><span>Password</span></legend></fieldset>
              <button type="button" id="toggle-password" class="absolute right-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] focus:outline-none z-10" style="padding: 0; background: transparent; border: none; outline: none;">
                  <svg id="eye-icon" class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
              </button>
            </div>
            
            <button type="submit" id="submit-btn" class="relative w-full py-3 rounded-xl bg-gradient-to-r from-[#7f2f5d] to-[#ca5229] border border-[#ffb88c]/30 text-[var(--color-text-primary)] font-mono text-xs font-bold uppercase tracking-widest hover:shadow-lg hover:shadow-[#ca5229]/20 active:scale-95 transition-all mt-4 overflow-hidden flex items-center justify-center gap-2">
              <span class="btn-text">Login</span>
              <svg class="btn-spinner hidden animate-spin h-4 w-4 text-[var(--color-text-primary)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg>
            </button>

            <button type="button" id="forgot-btn" class="w-full text-center text-[10px] font-mono uppercase tracking-widest hover:text-[#ca5229] transition-colors mt-4" style="color: var(--color-text-secondary);">
              Forgot Password?
            </button>
          </div>
        </form>

        <div id="federated-section" class="transition-all duration-300">
          <div class="relative flex items-center py-3 z-10">
            <div class="flex-grow border-t" style="border-color: rgba(255, 255, 255, 0.3);"></div>
            <span class="flex-shrink-0 mx-4 text-xs font-mono uppercase tracking-widest" style="color: var(--color-text-secondary);">or</span>
            <div class="flex-grow border-t" style="border-color: rgba(255, 255, 255, 0.3);"></div>
          </div>

          <div class="space-y-3 relative z-10">
            <button id="google-auth" type="button" class="w-full flex items-center justify-center gap-3 py-3 rounded-xl font-mono text-xs font-semibold uppercase tracking-widest hover:brightness-95 active:scale-95 transition-all shadow-sm" style="background-color: rgba(127, 47, 93, 0.15); border: 1px solid var(--color-border); color: var(--color-text-primary);">
              <svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
              Sign in with Google
            </button>
          </div>

          <p class="mt-8 text-center text-xs font-mono uppercase tracking-widest relative z-10" style="color: var(--color-text-secondary);">
            New user? <a href="#/register" class="text-[#ca5229] hover:text-[#7f2f5d] transition-colors font-bold ml-1">Register here</a>
          </p>
        </div>
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
    const forgotBtn = this.container.querySelector('#forgot-btn');
    const togglePasswordBtn = this.container.querySelector('#toggle-password');
    const passwordInput = this.container.querySelector('#password');
    const eyeIcon = this.container.querySelector('#eye-icon');

    const errText = this.container.querySelector('#error-text');
    const successText = this.container.querySelector('#success-text');
    const btnText = this.container.querySelector('.btn-text');
    const btnSpinner = this.container.querySelector('.btn-spinner');
    
    const step1 = this.container.querySelector('#step-1');
    const step2 = this.container.querySelector('#step-2');
    const nextBtn = this.container.querySelector('#next-btn');
    const backBtn = this.container.querySelector('#back-btn');
    const displayEmail = this.container.querySelector('#display-email');
    const federatedSection = this.container.querySelector('#federated-section');
    const emailInput = this.container.querySelector('#email');

    const transitionToStep2 = () => {
      this.currentStep = 2;
      this.emailValue = emailInput.value.trim();
      displayEmail.textContent = this.emailValue;
      
      step1.classList.add('opacity-0', '-translate-x-4');
      federatedSection.classList.add('opacity-0', 'pointer-events-none', 'hidden');
      
      setTimeout(() => {
        step1.classList.add('hidden');
        step2.classList.remove('hidden');
        
        requestAnimationFrame(() => {
          step2.classList.remove('opacity-0', 'translate-x-4');
          passwordInput.focus();
        });
      }, 300);
    };

    const transitionToStep1 = () => {
      this.currentStep = 1;
      
      step2.classList.add('opacity-0', 'translate-x-4');
      
      setTimeout(() => {
        step2.classList.add('hidden');
        step1.classList.remove('hidden');
        federatedSection.classList.remove('hidden');
        
        requestAnimationFrame(() => {
          step1.classList.remove('opacity-0', '-translate-x-4');
          federatedSection.classList.remove('opacity-0', 'pointer-events-none');
          emailInput.focus();
        });
      }, 300);
    };

    nextBtn.addEventListener('click', () => {
      if (!emailInput.checkValidity()) {
        emailInput.reportValidity();
        return;
      }
      transitionToStep2();
    });

    backBtn.addEventListener('click', () => {
      transitionToStep1();
    });

    emailInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nextBtn.click();
      }
    });

    if (togglePasswordBtn && passwordInput) {
        togglePasswordBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            if (type === 'text') {
                eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>`;
            } else {
                eyeIcon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>`;
            }
        });
    }

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
      
      if (this.currentStep === 1) {
        nextBtn.click();
        return;
      }

      const email = this.emailValue;
      const password = passwordInput.value;

      err.classList.add('hidden');
      setCheckingState(true);

      try {
        await signInWithEmailAndPassword(auth, email, password);
        showSuccess('Login successful. Redirecting...');
        setTimeout(() => window.location.hash = '#/splash', 1000);
      } catch (error) {
        setCheckingState(false);
        console.error('[Login] Error:', error.code, error.message);
        let userMsg = 'Authentication failed. Please verify credentials.';
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            userMsg = 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
            userMsg = 'Access suspended due to repeated failures. Try again later.';
        }
        showError(userMsg);
      }
    });

    forgotBtn.addEventListener('click', async () => {
      const email = this.emailValue || emailInput.value.trim();
      err.classList.add('hidden');
      success.classList.add('hidden');
      
      if (!email) {
        showError("Please enter your email first to reset your password.");
        if (this.currentStep === 2) transitionToStep1();
        return;
      }
      
      try {
        forgotBtn.textContent = "Sending...";
        forgotBtn.disabled = true;
        await sendPasswordResetEmail(auth, email);
        showSuccess('Password reset instructions sent to your email.');
      } catch (error) {
        console.error('[Login] Reset Error:', error);
        showError(error.message.replace('Firebase: ', ''));
      } finally {
        forgotBtn.textContent = "Forgot Password?";
        forgotBtn.disabled = false;
      }
    });

    googleBtn.addEventListener('click', async () => {
      err.classList.add('hidden', 'opacity-0');
      success.classList.add('hidden', 'opacity-0');
      googleBtn.disabled = true;
      googleBtn.innerHTML = `<svg class="animate-spin h-4 w-4 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"/><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"/></svg> Connecting...`;
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        googleBtn.disabled = false;
        googleBtn.innerHTML = `<svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg> Sign in with Google`;
        showError(error.message.replace('Firebase: ', ''));
      }
    });
  }

  destroy() {
    if (this._liquidAnimation) this._liquidAnimation.destroy();
  }
}

