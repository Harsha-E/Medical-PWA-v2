import { auth, db } from '../core/firebase.js';
import { doc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import { updateProfile } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import state from '../core/state.js';
import { showToast } from '../core/ui.js';
import AvatarSelector from '../components/AvatarSelector.js';

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

const AVATARS = [
    'assets/avatars/001-barista.png',
    'assets/avatars/002-editor.png',
    'assets/avatars/003-trainers.png',
    'assets/avatars/004-woman.png',
    'assets/avatars/005-teacher.png',
    'assets/avatars/006-pastor.png',
    'assets/avatars/007-muslim.png',
    'assets/avatars/008-homeless.png',
    'assets/avatars/009-butcher.png',
    'assets/avatars/010-chinese.png',
    'assets/avatars/011-coach.png',
    'assets/avatars/012-designer.png',
    'assets/avatars/013-doctor.png',
    'assets/avatars/business-man.png',
    'assets/avatars/bussiness-man.png',
    'assets/avatars/dad.png',
    'assets/avatars/dancer.png',
    'assets/avatars/designer.png',
    'assets/avatars/graphic-designer.png',
    'assets/avatars/man.png',
    'assets/avatars/trainers.png'
];

export default class OnboardingView {
  constructor() {
    this.step = 1;
    this.selectedAvatar = AVATARS[0];
    this.avatarSelector = null;
  }

  async render() {
    this.container = document.createElement('div');
    this.container.className = 'h-[100dvh] w-full flex flex-col items-center justify-start pt-12 pb-32 px-4 md:px-8 lg:px-12 relative z-10 overflow-y-auto ';

    this._renderStep();

    return this.container;
  }

  _renderStep() {
    if (this.step === 1) {
      this.container.innerHTML = `
        <div class="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl p-8 md:p-12 rounded-[2.5rem] bg-surface/60 backdrop-blur-3xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-fade-in-up">
          <div class="mb-10 text-center">
            <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 1 of 2</span>
            <h2 class="text-3xl md:text-4xl font-display font-semibold text-text-primary mt-3">Choose Your Avatar</h2>
            <p class="text-text-secondary text-sm md:text-base mt-2">Select a visual identity for your medical profile.</p>
          </div>

          <div id="avatar-carousel-container" class="mb-12"></div>

          <button id="btn-next-step" class="w-full py-5 rounded-2xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-sm uppercase tracking-widest active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4),_inset_0_2px_2px_rgba(255,255,255,0.05)] border border-primary/20 hover:border-primary/40 flex items-center justify-center gap-3">
            <span>Continue to Profile</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
          </button>
        </div>
      `;

      const carouselContainer = this.container.querySelector('#avatar-carousel-container');
      this.avatarSelector = new AvatarSelector(carouselContainer, AVATARS, {
        initialIndex: AVATARS.indexOf(this.selectedAvatar),
        onChange: (url) => {
          this.selectedAvatar = url;
        }
      });

      this.container.querySelector('#btn-next-step').addEventListener('click', () => {
        this.step = 2;
        if (this.avatarSelector) {
            this.avatarSelector.destroy();
        }
        this._renderStep();
      });

    } else if (this.step === 2) {
      this.container.innerHTML = `
        <div class="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl p-8 md:p-12 rounded-[2.5rem] bg-surface/60 backdrop-blur-3xl border border-border shadow-[0_20px_50px_rgba(0,0,0,0.7)] animate-fade-in-up">
          <div class="mb-10 flex items-center justify-between border-b border-border pb-8">
            <div>
              <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Final Step</span>
              <h2 class="text-3xl md:text-4xl font-display font-semibold text-text-primary mt-3">Clinical Profile</h2>
              <p class="text-text-secondary text-sm md:text-base mt-2">Establish your biological baseline to activate the safety engine.</p>
            </div>
            <div class="hidden sm:block">
              <img src="${this.selectedAvatar}" class="w-20 h-20 rounded-full border border-border shadow-lg" alt="Avatar">
            </div>
          </div>

          <div id="error-container" class="hidden mb-6 p-4 rounded-2xl bg-red-900/20 border border-red-500/30 text-red-200 text-xs font-mono text-center"></div>

          <form id="onboarding-form" class="space-y-8">
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
              <div>
                <label for="fullName" class="block text-xs font-mono text-text-muted uppercase mb-3 ml-2 tracking-wider">Full Name</label>
                <input type="text" id="fullName" autocomplete="name" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
              </div>
              <div>
                <label for="myPhone" class="block text-xs font-mono text-text-muted uppercase mb-3 ml-2 tracking-wider">My Phone #</label>
                <div class="flex gap-3">
                  <select id="myPhoneCode" class="w-[95px] px-3 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer">
                    ${COUNTRY_CODES.map(c => `<option value="${c.code}" data-full="${c.code} (${c.name})" ${c.code === '+91' ? 'selected' : ''} class="bg-surface text-text-primary">${c.code} (${c.name})</option>`).join('')}
                  </select>
                  <input type="tel" id="myPhone" autocomplete="tel" placeholder="9876543210" required pattern="[0-9]{10}" maxlength="10" class="flex-1 w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
                </div>
              </div>
              <div>
                <label for="bloodType" class="block text-xs font-mono text-text-muted uppercase mb-3 ml-2 tracking-wider">Blood Type</label>
                <select id="bloodType" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer appearance-none" style="background-image: url('data:image/svg+xml;utf8,<svg fill=%22%23b8860b%22 height=%2224%22 viewBox=%220 0 24 24%22 width=%2224%22 xmlns=%22http://www.w3.org/2000/svg%22><path d=%22M7 10l5 5 5-5z%22/></svg>'); background-repeat: no-repeat; background-position: right 1rem center;">
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
                <label for="dob" class="block text-xs font-mono text-text-muted uppercase mb-3 ml-2 tracking-wider">Date of Birth</label>
                <input type="date" id="dob" autocomplete="bday" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all [color-scheme:dark] cursor-pointer">
              </div>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 pt-4 border-t border-border/50">
              <div>
                <label for="emergencyName" class="block text-xs font-mono text-text-muted uppercase mb-3 ml-2 tracking-wider">Primary Responder</label>
                <input type="text" id="emergencyName" placeholder="Name" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
              </div>
              <div>
                <label for="emergencyPhone" class="block text-xs font-mono text-text-muted uppercase mb-3 ml-2 tracking-wider">Emergency Phone</label>
                <div class="flex gap-3">
                  <select id="emergencyPhoneCode" class="w-[95px] px-3 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all cursor-pointer">
                    ${COUNTRY_CODES.map(c => `<option value="${c.code}" data-full="${c.code} (${c.name})" ${c.code === '+91' ? 'selected' : ''} class="bg-surface text-text-primary">${c.code} (${c.name})</option>`).join('')}
                  </select>
                  <input type="tel" id="emergencyPhone" autocomplete="tel" placeholder="9876543210" required pattern="[0-9]{10}" maxlength="10" class="flex-1 w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary shadow-[inset_0_2px_12px_rgba(0,0,0,0.3)] focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-all placeholder:text-text-muted/50">
                </div>
              </div>
            </div>
            
            <div class="flex items-center gap-4 mt-10">
                <button type="button" id="btn-back-step" class="p-5 rounded-2xl bg-surface/50 border border-border hover:bg-surface transition-all active:scale-95 text-text-secondary">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
                </button>
                <button type="submit" class="flex-1 py-5 rounded-2xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-sm uppercase tracking-widest active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4),_inset_0_2px_2px_rgba(255,255,255,0.05)] border border-primary/20 hover:border-primary/40 flex items-center justify-center gap-3">
                    <span>Lock Ledger & Enter</span>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                </button>
            </div>
          </form>
        </div>
      `;
      this.bindEvents();
    }
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

    const backBtn = this.container.querySelector('#btn-back-step');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            this.step = 1;
            this._renderStep();
        });
    }

    const form = this.container.querySelector('#onboarding-form');
    if (form) {
        form.addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = form.querySelector('button[type="submit"]');
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
              emergencyPhone: emergencyFullPhone,
              avatar: this.selectedAvatar // <--- Inject selected avatar here
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
  }

  destroy() {
    if (this.avatarSelector) {
        this.avatarSelector.destroy();
    }
  }
}
