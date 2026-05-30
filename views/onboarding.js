import { auth, db } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import state from '../core/state.js';

export default class OnboardingView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col items-center justify-center p-6 relative z-10';

    this.container.innerHTML = `
      <div class="w-full max-w-lg p-8 rounded-3xl bg-[#0a0407]/60 backdrop-blur-3xl border border-[#7f2f5d]/50 shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-fade-in-up">
        <div class="mb-8 border-b border-white/10 pb-6">
          <span class="text-[#ffb88c] font-mono text-xs uppercase tracking-widest">Final Step</span>
          <h2 class="text-3xl font-display font-semibold text-white mt-2">Clinical Profile</h2>
          <p class="text-gray-400 text-sm mt-2">Establish your biological baseline to activate the safety engine.</p>
        </div>

        <div id="error-container" class="hidden mb-5 p-4 rounded-xl bg-red-900/20 border border-red-500/30 text-red-200 text-xs font-mono text-center"></div>

        <form id="onboarding-form" class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="fullName" class="block text-xs font-mono text-gray-500 uppercase mb-2 ml-1">Full Name</label>
              <input type="text" id="fullName" autocomplete="name" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none">
            </div>
            <div>
              <label for="bloodType" class="block text-xs font-mono text-gray-500 uppercase mb-2 ml-1">Blood Type</label>
              <select id="bloodType" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none appearance-none">
                <option value="" disabled selected class="bg-[#0a0407] text-gray-500">Select</option>
                <option value="A+" class="bg-[#0a0407] text-white">A+</option>
                <option value="A-" class="bg-[#0a0407] text-white">A-</option>
                <option value="B+" class="bg-[#0a0407] text-white">B+</option>
                <option value="B-" class="bg-[#0a0407] text-white">B-</option>
                <option value="O+" class="bg-[#0a0407] text-white">O+</option>
                <option value="O-" class="bg-[#0a0407] text-white">O-</option>
                <option value="AB+" class="bg-[#0a0407] text-white">AB+</option>
                <option value="AB-" class="bg-[#0a0407] text-white">AB-</option>
              </select>
            </div>
          </div>

          <div>
            <label for="dob" class="block text-xs font-mono text-gray-500 uppercase mb-2 ml-1">Date of Birth</label>
            <input type="date" id="dob" autocomplete="bday" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none [color-scheme:dark]">
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="emergencyName" class="block text-xs font-mono text-gray-500 uppercase mb-2 ml-1">Primary Responder</label>
              <input type="text" id="emergencyName" placeholder="Name" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none">
            </div>
            <div>
              <label for="emergencyPhone" class="block text-xs font-mono text-gray-500 uppercase mb-2 ml-1">Emergency Phone</label>
              <input type="tel" id="emergencyPhone" autocomplete="tel" required class="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:border-[#ffb88c]/50 focus:outline-none">
            </div>
          </div>
          
          <button type="submit" class="w-full py-4 rounded-xl bg-linear-to-r from-[#00ff7f]/20 to-[#00ff7f]/5 border border-[#00ff7f]/30 text-[#00ff7f] font-mono text-xs uppercase tracking-widest hover:bg-[#00ff7f]/20 active:scale-95 transition-all mt-8">
            Lock Ledger & Enter
          </button>
        </form>
      </div>
    `;

    this.bindEvents();
    return this.container;
  }

  _showToast(msg, type = 'error') {
    const t = document.createElement('div');
    t.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-2xl text-xs font-mono uppercase tracking-widest z-[99999] shadow-xl transition-all ${type === 'error' ? 'bg-red-900/80 border border-red-500/40 text-red-200' : 'bg-[#00ff7f]/10 border border-[#00ff7f]/30 text-[#00ff7f]'}`;
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3500);
  }

  bindEvents() {
    const form = this.container.querySelector('#onboarding-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      
      // Strict age gate calculation
      const dobDate = new Date(form.dob.value);
      const today = new Date();
      let age = today.getFullYear() - dobDate.getFullYear();
      const m = today.getMonth() - dobDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) {
          age--;
      }

      if (age < 18) {
          const errorContainer = this.container.querySelector('#error-container');
          if (errorContainer) {
              errorContainer.textContent = 'Protocol requires primary user to be 18+';
              errorContainer.classList.remove('hidden');
          }
          this._showToast('Protocol requires primary user to be 18+', 'error');
          return;
      }

      btn.textContent = 'SECURING LEDGER...';
      
      try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user found.");

        const profileData = {
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

        if (state.patchProfile) {
          state.patchProfile({ onboardingComplete: true, profile: profileData });
        } else if (state.update) {
           state.update({ userProfile: { onboardingComplete: true, profile: profileData } });
        }
        
        window.location.hash = '#/dashboard';
        
      } catch (error) {
        btn.textContent = 'LOCK LEDGER & ENTER';
        this._showToast('Database Error: ' + error.message, 'error');
      }
    });
  }

  destroy() {
    // Cleanup if necessary
  }
}