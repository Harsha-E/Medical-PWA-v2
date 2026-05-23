import { auth } from '../core/firebase.js';
import { signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

export default class LoginView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 pt-28 relative z-10';

    this.container.innerHTML = `
      <div class="w-full max-w-md p-8 rounded-3xl bg-[#1a0a12] backdrop-blur-3xl border border-[#7f2f5d]/30 shadow-[0_20px_50px_rgba(0,0,0,0.5)] animate-fade-in-up">
        <div class="text-center mb-8">
          <h2 class="text-3xl font-display font-semibold text-white tracking-tight">Access Portal</h2>
          <p class="text-gray-400 text-sm mt-2 font-mono uppercase tracking-widest">Identify to continue</p>
        </div>

        <div id="error-container" class="hidden mb-5 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 text-xs font-mono text-center"></div>

        <form id="login-form" class="space-y-4">
          <div>
            <label for="email" class="sr-only">Email Address</label>
            <input type="email" id="email" autocomplete="email" placeholder="Email Address" required class="w-full px-5 py-4 rounded-xl bg-[#0a0407] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#ffb88c]/50 focus:bg-[#1a0a12] transition-all font-sans">
          </div>
          <div>
            <label for="password" class="sr-only">Password</label>
            <input type="password" id="password" autocomplete="current-password" placeholder="Password" required class="w-full px-5 py-4 rounded-xl bg-[#0a0407] border border-white/10 text-white placeholder-gray-500 focus:outline-none focus:border-[#ffb88c]/50 focus:bg-[#1a0a12] transition-all font-sans">
          </div>
          
          <button type="submit" id="submit-btn" class="w-full py-4 rounded-xl bg-linear-to-r from-[#7f2f5d] to-[#ffb88c] border border-[#ffb88c]/30 text-[#ffd9b5] font-mono text-xs font-bold uppercase tracking-widest hover:brightness-125 active:scale-95 transition-all shadow-[0_0_20px_rgba(127,47,93,0.4)] mt-2">
            Authenticate
          </button>
        </form>

        <div class="relative flex items-center py-6">
          <div class="flex-grow border-t border-white/5"></div>
          <span class="flex-shrink-0 mx-4 text-gray-600 text-[10px] font-mono uppercase tracking-widest">Secondary Path</span>
          <div class="flex-grow border-t border-white/5"></div>
        </div>

        <button id="google-auth" type="button" class="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#0a0407] border border-white/10 text-white font-mono text-xs uppercase tracking-widest hover:bg-[#1a0a12] active:scale-95 transition-all backdrop-blur-md">
          <svg class="w-4 h-4" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>

        <p class="mt-8 text-center text-sm text-gray-500">
          New clinical entity? <a href="#/register" class="text-[#ffb88c] hover:text-[#ffd9b5] transition-colors font-medium">Initialize Protocol</a>
        </p>
      </div>
    `;
    this.bindEvents();
    return this.container;
  }

  bindEvents() {
    const form = this.container.querySelector('#login-form');
    const err = this.container.querySelector('#error-container');
    const btn = this.container.querySelector('#submit-btn');
    const googleBtn = this.container.querySelector('#google-auth');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      err.classList.add('hidden');
      btn.textContent = 'VERIFYING...';
      btn.disabled = true;
      
      try {
        await signInWithEmailAndPassword(auth, form.email.value, form.password.value);
      } catch (error) {
        btn.textContent = 'AUTHENTICATE';
        btn.disabled = false;
        err.textContent = error.message.replace('Firebase: ', '');
        err.classList.remove('hidden');
      }
    });

    googleBtn.addEventListener('click', async () => {
      err.classList.add('hidden');
      googleBtn.disabled = true;
      const provider = new GoogleAuthProvider();
      try {
        await signInWithPopup(auth, provider);
      } catch (error) {
        googleBtn.disabled = false;
        err.textContent = error.message.replace('Firebase: ', '');
        err.classList.remove('hidden');
      }
    });
  }

  destroy() {}
}