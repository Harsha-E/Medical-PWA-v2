import { auth, db } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import state from '../core/state.js';
import { showToast } from '../core/ui.js';
import { showToast } from '../core/ui.js';

const COUNTRY_CODES = [
  { code: '+1', name: 'USA/CAN' },
  { code: '+7', name: 'Russia' },
  { code: '+20', name: 'Egypt' },
  { code: '+27', name: 'South Africa' },
  { code: '+31', name: 'Netherlands' },
  { code: '+32', name: 'Belgium' },
  { code: '+33', name: 'France' },
  { code: '+34', name: 'Spain' },
  { code: '+39', name: 'Italy' },
  { code: '+44', name: 'UK' },
  { code: '+49', name: 'Germany' },
  { code: '+52', name: 'Mexico' },
  { code: '+54', name: 'Argentina' },
  { code: '+55', name: 'Brazil' },
  { code: '+61', name: 'Australia' },
  { code: '+64', name: 'New Zealand' },
  { code: '+65', name: 'Singapore' },
  { code: '+81', name: 'Japan' },
  { code: '+82', name: 'South Korea' },
  { code: '+86', name: 'China' },
  { code: '+91', name: 'India' },
  { code: '+92', name: 'Pakistan' },
  { code: '+93', name: 'Afghanistan' },
  { code: '+94', name: 'Sri Lanka' },
  { code: '+95', name: 'Myanmar' },
  { code: '+98', name: 'Iran' },
  { code: '+212', name: 'Morocco' },
  { code: '+234', name: 'Nigeria' },
  { code: '+254', name: 'Kenya' },
  { code: '+351', name: 'Portugal' },
  { code: '+353', name: 'Ireland' },
  { code: '+358', name: 'Finland' },
  { code: '+420', name: 'Czechia' },
  { code: '+421', name: 'Slovakia' },
  { code: '+46', name: 'Sweden' },
  { code: '+47', name: 'Norway' },
  { code: '+48', name: 'Poland' },
  { code: '+506', name: 'Costa Rica' },
  { code: '+880', name: 'Bangladesh' },
  { code: '+966', name: 'Saudi Arabia' },
  { code: '+971', name: 'UAE' },
];

export default class OnboardingView {
  async render() {
    this.container = document.createElement('div');
    this.container.className = 'h-[100dvh] w-full flex flex-col items-center justify-start pt-12 pb-32 px-4 relative z-10 overflow-y-auto ';

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
              <input type="text" id="fullName" autocomplete="name" required class="w-full px-4 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
            </div>
            <div>
              <label for="myPhone" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">My Phone #</label>
              <div class="flex gap-2">
                <select id="myPhoneCode" class="w-[85px] px-2 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer">
                  ${COUNTRY_CODES.map(c => `<option value="${c.code}" data-full="${c.code} (${c.name})" ${c.code === '+91' ? 'selected' : ''} class="bg-surface text-text-primary">${c.code} (${c.name})</option>`).join('')}
                </select>
                <input type="tel" id="myPhone" autocomplete="tel" placeholder="9876543210" required pattern="[0-9]{10}" maxlength="10" class="flex-1 w-full px-4 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
              </div>
            </div>
            <div>
              <label for="bloodType" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Blood Type</label>
              <select id="bloodType" required class="w-full px-4 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all">
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
              <input type="date" id="dob" autocomplete="bday" required class="w-full px-4 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all [color-scheme:dark]">
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label for="emergencyName" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Primary Responder</label>
              <input type="text" id="emergencyName" placeholder="Name" required class="w-full px-4 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
            </div>
            <div>
              <label for="emergencyPhone" class="block text-xs font-mono text-text-muted uppercase mb-2 ml-1">Emergency Phone</label>
              <div class="flex gap-2">
                <select id="emergencyPhoneCode" class="w-[85px] px-2 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer">
                  ${COUNTRY_CODES.map(c => `<option value="${c.code}" data-full="${c.code} (${c.name})" ${c.code === '+91' ? 'selected' : ''} class="bg-surface text-text-primary">${c.code} (${c.name})</option>`).join('')}
                </select>
                <input type="tel" id="emergencyPhone" autocomplete="tel" placeholder="9876543210" required pattern="[0-9]{10}" maxlength="10" class="flex-1 w-full px-4 py-3 rounded-xl bg-surface/40 border border-white/10 text-sm font-bold text-text-primary shadow-inner focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
              </div>
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
    const formatSelect = (selectId) => {
      const el = this.container.querySelector('#' + selectId);
      if (!el) return;
      const update = () => {
        Array.from(el.options).forEach(opt => opt.text = opt.dataset.full);
        el.options[el.selectedIndex].text = el.value;
      };
      el.addEventListener('change', update);
      el.addEventListener('blur', update);
      el.addEventListener('focus', () => {
        Array.from(el.options).forEach(opt => opt.text = opt.dataset.full);
      });
      update();
    };

    formatSelect('myPhoneCode');
    formatSelect('emergencyPhoneCode');

    const form = this.container.querySelector('#onboarding-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button');
      const errorContainer = this.container.querySelector('#error-container');

      const myFullPhone = form.myPhoneCode.value + form.myPhone.value.trim();
      const emergencyFullPhone = form.emergencyPhoneCode.value + form.emergencyPhone.value.trim();

      const phoneRegex = /^\+\d{1,3}\d{10}$/;
      if (!phoneRegex.test(myFullPhone)) {
        if (errorContainer) {
          errorContainer.textContent = 'Invalid Phone: Must include Country Code + 10 digits';
          errorContainer.classList.remove('hidden');
        }
        showToast('Invalid Phone Format', 'error');
        return;
      }
      if (!phoneRegex.test(emergencyFullPhone)) {
        if (errorContainer) {
          errorContainer.textContent = 'Invalid Emergency Phone: Must include Country Code + 10 digits';
          errorContainer.classList.remove('hidden');
        }
        showToast('Invalid Emergency Phone Format', 'error');
        return;
      }

      if (myFullPhone === emergencyFullPhone) {
        if (errorContainer) {
          errorContainer.textContent = 'Primary and Emergency phone numbers cannot be the same.';
          errorContainer.classList.remove('hidden');
        }
        showToast('Phones cannot match', 'error');
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
          phone: myFullPhone,
          bloodType: form.bloodType.value,
          dob: form.dob.value,
          emergencyName: form.emergencyName.value,
          emergencyPhone: emergencyFullPhone
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

