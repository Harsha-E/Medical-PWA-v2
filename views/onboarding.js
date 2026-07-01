import { auth, db } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import state from '../core/state.js';
import { showToast } from '../core/ui.js';

export default class OnboardingView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative z-10';

    this.container.innerHTML = `
      <div class="w-full max-w-lg p-8 rounded-3xl bg-surface/60 backdrop-blur-3xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-fade-in-up">
        <div class="mb-8 border-b border-border pb-6">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Final Step</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Clinical Profile</h2>
          <p class="text-text-secondary text-sm mt-2">Establish your biological baseline to activate the safety engine.</p>
        </div>

        <div id="error-container" class="hidden mb-5 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 text-xs font-mono text-center"></div>

        <form id="onboarding-form" class="space-y-4">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label for="fullName" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Full Name</label>
              <input type="text" id="fullName" autocomplete="name" required class="form-input">
            </div>
            <div>
              <label for="myPhone" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">My Phone #</label>
              <input type="tel" id="myPhone" autocomplete="tel" placeholder="+919876543210" required class="form-input">
            </div>
            <div>
              <label for="bloodType" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Blood Type</label>
              <select id="bloodType" required class="form-input">
                <option value="" disabled selected class="bg-surface text-text-muted">Select</option>
                <option value="A+" class="bg-surface text-text-primary">A+</option>
                <option value="A-" class="bg-surface text-text-primary">A-</option>
                <option value="B+" class="bg-surface text-text-primary">B+</option>
                <option value="B-" class="bg-surface text-text-primary">B-</option>
                <option value="O+" class="bg-surface text-text-primary">O+</option>
                <option value="O-" class="bg-surface text-text-primary">O-</option>
                <option value="AB+" class="bg-surface text-text-primary">AB+</option>
                <option value="AB-" class="bg-surface text-text-primary">AB-</option>
              </select>
            </div>
            <div>
              <label for="dob" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Date of Birth</label>
              <input type="date" id="dob" autocomplete="bday" required class="form-input [color-scheme:dark]">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label for="emergencyName" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Primary Responder</label>
              <input type="text" id="emergencyName" placeholder="Name" required class="form-input">
            </div>
            <div>
              <label for="emergencyPhone" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Emergency Phone</label>
              <input type="tel" id="emergencyPhone" autocomplete="tel" placeholder="+919876543210" required class="form-input">
            </div>
          </div>
          
          <button type="submit" class="w-full py-4 rounded-xl bg-linear-to-r from-success/20 to-success/5 text-success font-mono text-xs uppercase tracking-widest active:scale-95 transition-all mt-8 btn-neumorphic">
            Lock Ledger & Enter
          </button>
        </form>
      </div>
    `;

    this.bindEvents();
    return this.container;
  }

  bindEvents() {
    const form = this.container.querySelector('#onboarding-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const errorContainer = this.container.querySelector('#error-container');

      const phoneRegex = /^\+\d{1,3}\d{10}$/;
      if (!phoneRegex.test(form.myPhone.value.trim())) {
          if (errorContainer) {
              errorContainer.textContent = 'Invalid Phone: Must include Country Code + 10 digits (e.g. +919876543210)';
              errorContainer.classList.remove('hidden');
          }
          showToast('Invalid Phone Format', 'error');
          return;
      }
      if (!phoneRegex.test(form.emergencyPhone.value.trim())) {
          if (errorContainer) {
              errorContainer.textContent = 'Invalid Emergency Phone: Must include Country Code + 10 digits (e.g. +919876543210)';
              errorContainer.classList.remove('hidden');
          }
          showToast('Invalid Emergency Phone Format', 'error');
          return;
      }
      
      // Strict age gate calculation
      const dobDate = new Date(form.dob.value);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          age--;
      }

      if (age < 18) {
          if (errorContainer) {
              errorContainer.textContent = 'Protocol requires primary user to be 18+';
              errorContainer.classList.remove('hidden');
          }
          showToast('Protocol requires primary user to be 18+', 'error');
          return;
      }

      btn.textContent = 'SECURING LEDGER...';
      
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user found.");

        const profileData = {
          phone: form.myPhone.value,
          bloodType: form.bloodType.value,
          dob: form.dob.value,
          emergencyName: form.emergencyName.value,
          emergencyPhone: form.emergencyPhone.value
        };

        // ENFORCING STRICT BACKEND SCHEMATICS 
        const rootPayload = {
          userId: user.uid,
          name: form.fullName.value,
          email: user.email,
          role: 'user', // Forced by Firebase Rules requirement
          createdAt: serverTimestamp(),
          onboardingComplete: true,
          profile: profileData
        };

        await setDoc(doc(db, 'users', user.uid), rootPayload);
        
        try {
          await updateProfile(user, { displayName: form.fullName.value });
        } catch (authErr) {
          console.warn('[Onboarding] Failed to sync auth displayName:', authErr);
        }

        if (state.patchProfile) {
          state.patchProfile({ onboardingComplete: true, profile: profileData });
        } else if (state.update) {
           state.update({ userProfile: { onboardingComplete: true, profile: profileData } });
        }
        
        window.location.hash = '#/dashboard';
        
      } catch (error) {
        btn.textContent = 'LOCK LEDGER & ENTER';
        showToast('Database Error: ' + error.message, 'error');
      }
    });
  }

  destroy() {
    // Cleanup if necessary
  }
}

