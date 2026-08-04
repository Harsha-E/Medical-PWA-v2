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

const COMMON_DISEASES = [
  { id: 'HYPERTENSION', code: 'ICD10:I10', display: 'Hypertension (High BP)' },
  { id: 'T2D', code: 'ICD10:E11', display: 'Type 2 Diabetes Mellitus' },
  { id: 'T1D', code: 'ICD10:E10', display: 'Type 1 Diabetes Mellitus' },
  { id: 'ASTHMA', code: 'ICD10:J45', display: 'Asthma' },
  { id: 'COPD', code: 'ICD10:J44', display: 'COPD' },
  { id: 'CKD', code: 'ICD10:N18', display: 'Chronic Kidney Disease (CKD)' },
  { id: 'GERD', code: 'ICD10:K21', display: 'Acid Reflux / GERD' },
  { id: 'CAD', code: 'ICD10:I25', display: 'Coronary Artery Disease' },
  { id: 'HYPOTHYROID', code: 'ICD10:E03', display: 'Hypothyroidism' }
];

const COMMON_ALLERGIES = [
  { name: 'Penicillin', category: 'DRUG' },
  { name: 'NSAIDs (Ibuprofen/Aspirin)', category: 'DRUG' },
  { name: 'Sulfa Drugs', category: 'DRUG' },
  { name: 'Peanuts / Tree Nuts', category: 'FOOD' },
  { name: 'Shellfish / Seafood', category: 'FOOD' },
  { name: 'Latex', category: 'MATERIAL' },
  { name: 'Pollen / Dust Mites', category: 'OTHER' }
];

export default class OnboardingView {
  constructor() {
    this.step = window.__medcare_resume_step || 1;
    this.totalSteps = 11;
    this.selectedAvatar = state.userProfile?.profile?.avatar || AVATARS[0];
    this.avatarSelector = null;
    
    // Load autosaved draft or state profile
    const savedDraft = localStorage.getItem(`medcare_onboarding_draft_${auth.currentUser?.uid}`);
    const draftData = savedDraft ? JSON.parse(savedDraft) : (state.userProfile?.profile || {});
    
    this.formData = {
      consentGiven: state.userProfile?.consentGiven ?? false,
      fullName: draftData.fullName || state.userProfile?.name || auth.currentUser?.displayName || '',
      dob: draftData.dob || '',
      sex: draftData.sex || 'UNKNOWN',
      height_cm: draftData.height_cm || '',
      weight_kg: draftData.weight_kg || '',
      bloodType: draftData.bloodType || 'Unknown',
      active_conditions: draftData.active_conditions || [],
      allergies: draftData.allergies || [],
      family_history: draftData.family_history || [],
      renal_clearance: draftData.renal_clearance || 'UNKNOWN',
      hepatic_impairment: draftData.hepatic_impairment || 'UNKNOWN',
      pregnancy_status: draftData.pregnancy_status || 'UNKNOWN',
      lifestyle: draftData.lifestyle || { smoking: 'UNKNOWN', tobacco_chewing: 'UNKNOWN', alcohol: 'UNKNOWN' },
      emergencyName: draftData.emergencyName || '',
      emergencyRelationship: draftData.emergencyRelationship || 'Spouse',
      emergencyPhoneCode: draftData.emergencyPhoneCode || '+91',
      emergencyPhone: draftData.emergencyPhone || '',
      myPhoneCode: draftData.myPhoneCode || '+91',
      myPhone: draftData.myPhone || '',
      avatar: draftData.avatar || this.selectedAvatar,
      medication_baseline: draftData.medication_baseline || 'UNKNOWN'
    };
  }

  async render() {
    this.container = document.createElement('div');
    this.container.className = 'min-h-[100dvh] w-full flex flex-col items-center justify-start p-4 md:p-8 lg:p-12 relative z-10 overflow-y-auto bg-surface-deep/90';

    this._renderStep();
    return this.container;
  }

  async autosave() {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    // 1. LocalStorage Draft
    localStorage.setItem(`medcare_onboarding_draft_${uid}`, JSON.stringify(this.formData));

    // 2. Local State Patch
    if (state.patchProfile) {
      state.patchProfile({ profile: this.formData });
    }

    // 3. Dexie IndexedDB Backup
    try {
      const { default: localDb } = await import('../core/db.js');
      await localDb.userProfile.put({ id: uid, key: `draft_${uid}`, ...this.formData, updatedAt: new Date().toISOString() });
    } catch (e) {
      console.warn('[Onboarding] Dexie step draft warning:', e);
    }

    // 4. Async Cloud Merge to Firestore
    try {
      const { doc: fsDoc, setDoc: fsSetDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
      await fsSetDoc(fsDoc(db, 'users', uid), {
        profile: this.formData,
        lastClinicalUpdate: new Date().toISOString()
      }, { merge: true });
    } catch (fsErr) {
      console.warn('[Onboarding] Firestore step draft merge warning:', fsErr);
    }
  }

  getAge() {
    if (!this.formData.dob) return 0;
    const dobDate = new Date(this.formData.dob);
    if (isNaN(dobDate.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dobDate.getFullYear();
    const m = today.getMonth() - dobDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dobDate.getDate())) age--;
    return age;
  }

  _renderStep() {
    // If step is 10 (Avatar) but user already has an avatar set, bypass Step 10
    const hasAvatar = !!(state.userProfile?.profile?.avatar || this.formData.avatar);
    if (this.step === 10 && hasAvatar) {
      this.step = 11;
    }

    const progressPct = Math.round((this.step / this.totalSteps) * 100);

    let stepHTML = '';

    if (this.step === 1) {
      // Step 1: Welcome & Consent
      stepHTML = `
        <div class="mb-8 text-center">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 1 of 11 — Welcome</span>
          <h2 class="text-3xl md:text-4xl font-display font-semibold text-text-primary mt-2">Clinical Safety Engine</h2>
          <p class="text-text-secondary text-sm md:text-base mt-2">Establish your biological baseline for precision drug interaction checks.</p>
        </div>

        <div class="space-y-6 mb-8 text-text-secondary text-sm leading-relaxed bg-surface-deep/50 p-6 rounded-2xl border border-white/5">
          <div class="flex items-start gap-4">
            <div class="p-3 rounded-xl bg-primary/10 text-primary border border-primary/20 shrink-0">🛡️</div>
            <div>
              <h4 class="font-bold text-text-primary text-base">Privacy & Clinical Isolation</h4>
              <p class="text-xs mt-1 text-text-muted">Your medical baseline is stored securely in end-to-end encrypted storage and used solely to run local DDI checks and DIC queries.</p>
            </div>
          </div>
          <div class="flex items-start gap-4">
            <div class="p-3 rounded-xl bg-accent-primary/10 text-accent-primary border border-accent-primary/20 shrink-0">🧬</div>
            <div>
              <h4 class="font-bold text-text-primary text-base">Deterministic Safety Verification</h4>
              <p class="text-xs mt-1 text-text-muted">Enables drug-drug, drug-disease, and organ clearance warnings before taking any prescription.</p>
            </div>
          </div>
        </div>

        <label class="flex items-center gap-3 p-4 rounded-xl bg-surface/50 border border-border cursor-pointer mb-8">
          <input type="checkbox" id="consent-check" ${this.formData.consentGiven ? 'checked' : ''} class="w-5 h-5 accent-primary rounded cursor-pointer">
          <span class="text-xs md:text-sm font-semibold text-text-primary">I consent to processing my clinical profile for safety analysis.</span>
        </label>

        <button id="btn-step-1-next" class="w-full py-5 rounded-2xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-sm uppercase tracking-widest border border-primary/20 hover:border-primary/40 flex items-center justify-center gap-3">
          <span>Get Started</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
        </button>
      `;
    } else if (this.step === 2) {
      // Step 2: Personal Identity (Required)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 2 of 11 — Personal Identity</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Identity & Demographics</h2>
          <p class="text-text-secondary text-xs mt-1">Required fields marked with *</p>
        </div>

        <div class="space-y-6 mb-8">
          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Full Name *</label>
            <input type="text" id="input-fullname" value="${this.formData.fullName}" placeholder="John Doe" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
          </div>
          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Date of Birth * (Must be 18+)</label>
            <input type="date" id="input-dob" value="${this.formData.dob}" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary [color-scheme:dark]">
          </div>
          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-1">Sex</label>
            <p class="text-[11px] text-text-secondary mb-3">This helps us provide more accurate medicine safety checks.</p>
            <div class="grid grid-cols-3 gap-3">
              <button type="button" class="btn-sex ${this.formData.sex === 'MALE' ? 'active-tab' : ''} py-4 rounded-xl border border-border bg-surface text-sm font-bold text-text-primary" data-sex="MALE">Male</button>
              <button type="button" class="btn-sex ${this.formData.sex === 'FEMALE' ? 'active-tab' : ''} py-4 rounded-xl border border-border bg-surface text-sm font-bold text-text-primary" data-sex="FEMALE">Female</button>
              <button type="button" class="btn-sex ${this.formData.sex === 'INTERSEX' ? 'active-tab' : ''} py-4 rounded-xl border border-border bg-surface text-sm font-bold text-text-primary" data-sex="INTERSEX">Intersex</button>
            </div>
          </div>
        </div>

        ${this._renderNavButtons(true, true)}
      `;
    } else if (this.step === 3) {
      // Step 3: Medical Conditions (Recommended / Skippable)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 3 of 11 — Health Conditions</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Have you ever been diagnosed with any of these conditions?</h2>
          <p class="text-text-secondary text-xs mt-1">Some illnesses can change how medicines work.</p>
        </div>

        <div class="space-y-4 mb-8">
          <div class="flex gap-2 mb-2">
            <input type="text" id="search-disease" placeholder="Search conditions or type custom entry..." class="w-full px-4 py-3 rounded-xl bg-surface-deep/40 border border-white/10 text-xs font-semibold text-text-primary">
            <button type="button" id="btn-custom-disease" class="px-4 py-3 rounded-xl bg-primary/20 border border-primary/30 text-primary text-xs font-bold shrink-0">+ Add Custom</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="disease-chips">
            ${COMMON_DISEASES.map(d => {
              const isSelected = this.formData.active_conditions.some(c => (typeof c === 'string' ? c : c.id) === d.id);
              return `<button type="button" class="chip-disease ${isSelected ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-border bg-surface/50 text-text-secondary'} p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between" data-id="${d.id}" data-code="${d.code}" data-display="${d.display}">
                <span>${d.display}</span>
                <span>${isSelected ? '✓' : '+'}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        ${this._renderNavButtons(true, true, true)}
      `;
    } else if (this.step === 4) {
      // Step 4: Categorized Allergies (Recommended / Skippable)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 4 of 11 — Allergies</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Are you allergic to any medicines or foods?</h2>
          <p class="text-text-secondary text-xs mt-1">This helps us avoid medicines that may not be safe for you.</p>
        </div>

        <div class="space-y-4 mb-8">
          <div class="flex gap-2 mb-2">
            <input type="text" id="search-allergy" placeholder="Search allergies or type custom entry..." class="w-full px-4 py-3 rounded-xl bg-surface-deep/40 border border-white/10 text-xs font-semibold text-text-primary">
            <button type="button" id="btn-custom-allergy" class="px-4 py-3 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold shrink-0">+ Add Custom</button>
          </div>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3" id="allergy-chips">
            ${COMMON_ALLERGIES.map(a => {
              const isSelected = this.formData.allergies.some(item => (typeof item === 'string' ? item : item.name) === a.name);
              return `<button type="button" class="chip-allergy ${isSelected ? 'border-amber-500 bg-amber-500/20 text-amber-300 font-bold' : 'border-border bg-surface/50 text-text-secondary'} p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between" data-name="${a.name}" data-category="${a.category}">
                <div>
                  <div class="font-semibold">${a.name}</div>
                  <div class="text-[10px] text-text-muted font-mono">[${a.category}]</div>
                </div>
                <span>${isSelected ? '✓' : '+'}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        ${this._renderNavButtons(true, true, true)}
      `;
    } else if (this.step === 5) {
      // Step 5: Lifestyle Factors (Recommended / Skippable)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 5 of 11 — Lifestyle</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Enzyme & Lifestyle Factors</h2>
          <p class="text-text-secondary text-xs mt-1">Assesses hepatic CYP1A2 and CYP2E1 enzyme induction risks.</p>
        </div>

        <div class="space-y-6 mb-8">
          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Smoking / Tobacco Use</label>
            <select id="select-smoking" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="UNKNOWN" ${this.formData.lifestyle.smoking === 'UNKNOWN' ? 'selected' : ''}>Not Specified / Unknown</option>
              <option value="NEVER" ${this.formData.lifestyle.smoking === 'NEVER' ? 'selected' : ''}>Never</option>
              <option value="OCCASIONAL" ${this.formData.lifestyle.smoking === 'OCCASIONAL' ? 'selected' : ''}>Occasional</option>
              <option value="DAILY" ${this.formData.lifestyle.smoking === 'DAILY' ? 'selected' : ''}>Daily</option>
              <option value="FORMER" ${this.formData.lifestyle.smoking === 'FORMER' ? 'selected' : ''}>Former Smoker</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Tobacco Chewing</label>
            <select id="select-tobacco" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="UNKNOWN" ${this.formData.lifestyle.tobacco_chewing === 'UNKNOWN' ? 'selected' : ''}>Not Specified / Unknown</option>
              <option value="NEVER" ${this.formData.lifestyle.tobacco_chewing === 'NEVER' ? 'selected' : ''}>Never</option>
              <option value="OCCASIONAL" ${this.formData.lifestyle.tobacco_chewing === 'OCCASIONAL' ? 'selected' : ''}>Occasional</option>
              <option value="DAILY" ${this.formData.lifestyle.tobacco_chewing === 'DAILY' ? 'selected' : ''}>Daily</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Alcohol Consumption</label>
            <select id="select-alcohol" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="UNKNOWN" ${this.formData.lifestyle.alcohol === 'UNKNOWN' ? 'selected' : ''}>Not Specified / Unknown</option>
              <option value="NONE" ${this.formData.lifestyle.alcohol === 'NONE' ? 'selected' : ''}>None / Teetotaler</option>
              <option value="OCCASIONAL" ${this.formData.lifestyle.alcohol === 'OCCASIONAL' ? 'selected' : ''}>Occasional / Social</option>
              <option value="MODERATE" ${this.formData.lifestyle.alcohol === 'MODERATE' ? 'selected' : ''}>Moderate</option>
              <option value="HEAVY" ${this.formData.lifestyle.alcohol === 'HEAVY' ? 'selected' : ''}>Heavy</option>
            </select>
          </div>
        </div>

        ${this._renderNavButtons(true, true, true)}
      `;
    } else if (this.step === 6) {
      // Step 6: Clinical Baseline (Kidney, Liver, Pregnancy conditional)
      const isFemaleChildbearing = this.formData.sex === 'FEMALE' && this.getAge() >= 12 && this.getAge() <= 55;

      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 6 of 11 — Organ Health</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Kidney & Liver Baseline</h2>
          <p class="text-text-secondary text-xs mt-1">Helps us calculate safe medication dosages for your body.</p>
        </div>

        <div class="space-y-6 mb-8">
          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-1">Has a doctor ever told you that you have kidney disease?</label>
            <p class="text-[11px] text-text-secondary mb-2"><strong style="color: #38bdf8;">Why do we ask this?</strong> Some medicines need different doses if your kidneys are not working normally.</p>
            <select id="select-renal" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="NORMAL" ${(typeof this.formData.renal_clearance === 'object' ? this.formData.renal_clearance.value : this.formData.renal_clearance) === 'NORMAL' ? 'selected' : ''}>No / Healthy kidneys</option>
              <option value="MILD" ${(typeof this.formData.renal_clearance === 'object' ? this.formData.renal_clearance.value : this.formData.renal_clearance) === 'MILD' ? 'selected' : ''}>Mild kidney disease</option>
              <option value="MODERATE" ${(typeof this.formData.renal_clearance === 'object' ? this.formData.renal_clearance.value : this.formData.renal_clearance) === 'MODERATE' ? 'selected' : ''}>Moderate kidney disease</option>
              <option value="SEVERE" ${(typeof this.formData.renal_clearance === 'object' ? this.formData.renal_clearance.value : this.formData.renal_clearance) === 'SEVERE' ? 'selected' : ''}>Severe kidney disease / Dialysis</option>
              <option value="UNKNOWN" ${(typeof this.formData.renal_clearance === 'object' ? this.formData.renal_clearance.value : this.formData.renal_clearance) === 'UNKNOWN' ? 'selected' : ''}>Not sure</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-1">Has a doctor ever told you that you have liver disease?</label>
            <p class="text-[11px] text-text-secondary mb-2"><strong style="color: #38bdf8;">Why do we ask this?</strong> The liver processes many medicines, so this information helps improve safety checks.</p>
            <select id="select-hepatic" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="NONE" ${(typeof this.formData.hepatic_impairment === 'object' ? this.formData.hepatic_impairment.value : this.formData.hepatic_impairment) === 'NONE' ? 'selected' : ''}>No / Healthy liver</option>
              <option value="MILD" ${(typeof this.formData.hepatic_impairment === 'object' ? this.formData.hepatic_impairment.value : this.formData.hepatic_impairment) === 'MILD' ? 'selected' : ''}>Mild liver disease</option>
              <option value="MODERATE" ${(typeof this.formData.hepatic_impairment === 'object' ? this.formData.hepatic_impairment.value : this.formData.hepatic_impairment) === 'MODERATE' ? 'selected' : ''}>Moderate liver disease</option>
              <option value="SEVERE" ${(typeof this.formData.hepatic_impairment === 'object' ? this.formData.hepatic_impairment.value : this.formData.hepatic_impairment) === 'SEVERE' ? 'selected' : ''}>Severe liver disease / Cirrhosis</option>
              <option value="UNKNOWN" ${(typeof this.formData.hepatic_impairment === 'object' ? this.formData.hepatic_impairment.value : this.formData.hepatic_impairment) === 'UNKNOWN' ? 'selected' : ''}>Not sure</option>
            </select>
          </div>

          ${isFemaleChildbearing ? `
            <div>
              <label class="block text-xs font-mono text-text-muted uppercase mb-2">Pregnancy / Lactation Status</label>
              <select id="select-pregnancy" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
                <option value="UNKNOWN" ${(typeof this.formData.pregnancy_status === 'object' ? this.formData.pregnancy_status.value : this.formData.pregnancy_status) === 'UNKNOWN' ? 'selected' : ''}>Unknown</option>
                <option value="NOT_PREGNANT" ${(typeof this.formData.pregnancy_status === 'object' ? this.formData.pregnancy_status.value : this.formData.pregnancy_status) === 'NOT_PREGNANT' ? 'selected' : ''}>Not Pregnant</option>
                <option value="PREGNANT" ${(typeof this.formData.pregnancy_status === 'object' ? this.formData.pregnancy_status.value : this.formData.pregnancy_status) === 'PREGNANT' ? 'selected' : ''}>Currently Pregnant</option>
                <option value="LACTATING" ${(typeof this.formData.pregnancy_status === 'object' ? this.formData.pregnancy_status.value : this.formData.pregnancy_status) === 'LACTATING' ? 'selected' : ''}>Breastfeeding / Lactating</option>
              </select>
            </div>
          ` : ''}
        </div>

        ${this._renderNavButtons(true, true, true)}
      `;
    } else if (this.step === 7) {
      // Step 7: Physical Baseline (Recommended / Skippable)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 7 of 11 — Physical Profile</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Physical Measurements</h2>
          <p class="text-text-secondary text-xs mt-1">Used for Body Mass Index (BMI) and BSA dosage calculations.</p>
        </div>

        <div class="space-y-6 mb-8">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-mono text-text-muted uppercase mb-2">Height (cm)</label>
              <input type="number" id="input-height" value="${this.formData.height_cm}" placeholder="175" min="50" max="250" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
            </div>
            <div>
              <label class="block text-xs font-mono text-text-muted uppercase mb-2">Weight (kg)</label>
              <input type="number" id="input-weight" value="${this.formData.weight_kg}" placeholder="70" min="20" max="300" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
            </div>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Blood Group</label>
            <select id="select-blood" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="Unknown" ${this.formData.bloodType === 'Unknown' ? 'selected' : ''}>Unknown / Not Sure</option>
              <option value="A+" ${this.formData.bloodType === 'A+' ? 'selected' : ''}>A+</option>
              <option value="A-" ${this.formData.bloodType === 'A-' ? 'selected' : ''}>A-</option>
              <option value="B+" ${this.formData.bloodType === 'B+' ? 'selected' : ''}>B+</option>
              <option value="B-" ${this.formData.bloodType === 'B-' ? 'selected' : ''}>B-</option>
              <option value="O+" ${this.formData.bloodType === 'O+' ? 'selected' : ''}>O+</option>
              <option value="O-" ${this.formData.bloodType === 'O-' ? 'selected' : ''}>O-</option>
              <option value="AB+" ${this.formData.bloodType === 'AB+' ? 'selected' : ''}>AB+</option>
              <option value="AB-" ${this.formData.bloodType === 'AB-' ? 'selected' : ''}>AB-</option>
            </select>
          </div>
        </div>

        ${this._renderNavButtons(true, true, true)}
      `;
    } else if (this.step === 8) {
      // Step 8: Family History (Skippable)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 8 of 11 — Family History</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Heritable Risk Factors</h2>
          <p class="text-text-secondary text-xs mt-1">Optional family history markers for risk stratification.</p>
        </div>

        <div class="space-y-4 mb-8">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            ${['Hypertension', 'Diabetes', 'Heart Disease', 'Stroke', 'Kidney Disease', 'Cancer'].map(item => {
              const isSelected = this.formData.family_history.some(f => f.condition === item);
              return `<button type="button" class="chip-family ${isSelected ? 'border-primary bg-primary/20 text-primary font-bold' : 'border-border bg-surface/50 text-text-secondary'} p-4 rounded-xl border text-left text-xs transition-all flex items-center justify-between" data-condition="${item}">
                <span>${item}</span>
                <span>${isSelected ? '✓' : '+'}</span>
              </button>`;
            }).join('')}
          </div>
        </div>

        ${this._renderNavButtons(true, true, true)}
      `;
    } else if (this.step === 9) {
      // Step 9: Emergency Contact & Relationship (Required)
      stepHTML = `
        <div class="mb-8">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 9 of 11 — Primary Responder</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Emergency Contact</h2>
          <p class="text-text-secondary text-xs mt-1">Primary responder for safety alerts and caregiver mode.</p>
        </div>

        <div class="space-y-6 mb-8">
          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Responder Name *</label>
            <input type="text" id="input-emerg-name" value="${this.formData.emergencyName}" placeholder="Jane Doe" required class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Relationship *</label>
            <select id="select-emerg-rel" class="w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
              <option value="Spouse" ${this.formData.emergencyRelationship === 'Spouse' ? 'selected' : ''}>Spouse / Partner</option>
              <option value="Parent" ${this.formData.emergencyRelationship === 'Parent' ? 'selected' : ''}>Parent</option>
              <option value="Child" ${this.formData.emergencyRelationship === 'Child' ? 'selected' : ''}>Adult Child</option>
              <option value="Sibling" ${this.formData.emergencyRelationship === 'Sibling' ? 'selected' : ''}>Sibling</option>
              <option value="Caregiver" ${this.formData.emergencyRelationship === 'Caregiver' ? 'selected' : ''}>Caregiver / Nurse</option>
              <option value="Friend" ${this.formData.emergencyRelationship === 'Friend' ? 'selected' : ''}>Trusted Friend</option>
            </select>
          </div>

          <div>
            <label class="block text-xs font-mono text-text-muted uppercase mb-2">Emergency Phone # *</label>
            <div class="flex gap-3">
              <select id="select-emerg-code" class="w-[95px] px-3 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
                ${COUNTRY_CODES.map(c => `<option value="${c.code}" ${c.code === (this.formData.emergencyPhoneCode || '+91') ? 'selected' : ''}>${c.code} (${c.name})</option>`).join('')}
              </select>
              <input type="tel" id="input-emerg-phone" value="${this.formData.emergencyPhone}" placeholder="9876543210" required maxlength="10" class="flex-1 w-full px-5 py-4 rounded-2xl bg-surface-deep/40 border border-white/5 text-base font-bold text-text-primary">
            </div>
          </div>
        </div>

        ${this._renderNavButtons(true, true)}
      `;
    } else if (this.step === 10) {
      // Step 10: Avatar Selection (Auto-skipped if already selected)
      stepHTML = `
        <div class="mb-8 text-center">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 10 of 11 — Avatar</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Visual Identity</h2>
          <p class="text-text-secondary text-xs mt-1">Select an avatar for your local profile context.</p>
        </div>

        <div id="avatar-carousel-container" class="mb-8"></div>

        ${this._renderNavButtons(true, true)}
      `;
    } else if (this.step === 11) {
      // Step 11: Review Accordion, Consent Check & Lock Ledger
      stepHTML = `
        <div class="mb-8 text-center">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">Step 11 of 11 — Review</span>
          <h2 class="text-3xl font-display font-semibold text-text-primary mt-2">Review & Lock Ledger</h2>
          <p class="text-text-secondary text-xs mt-1">Verify your clinical baseline before locking.</p>
        </div>

        <div class="space-y-4 mb-8">
          <div class="p-4 rounded-xl bg-surface-deep/50 border border-white/5 flex justify-between items-center">
            <div>
              <div class="text-xs font-mono text-text-muted uppercase">Identity</div>
              <div class="text-sm font-bold text-text-primary">${this.formData.fullName} (${this.formData.sex}, ${this.formData.dob})</div>
            </div>
            <button type="button" class="btn-jump-step text-xs text-primary font-mono font-bold" data-target="2">Edit</button>
          </div>

          <div class="p-4 rounded-xl bg-surface-deep/50 border border-white/5 flex justify-between items-center">
            <div>
              <div class="text-xs font-mono text-text-muted uppercase">Medical & Organ Function</div>
              <div class="text-sm font-bold text-text-primary">Conditions: ${this.formData.active_conditions.length} | Allergies: ${this.formData.allergies.length}</div>
            </div>
            <button type="button" class="btn-jump-step text-xs text-primary font-mono font-bold" data-target="3">Edit</button>
          </div>

          <div class="p-4 rounded-xl bg-surface-deep/50 border border-white/5 flex justify-between items-center">
            <div>
              <div class="text-xs font-mono text-text-muted uppercase">Lifestyle</div>
              <div class="text-sm font-bold text-text-primary">Smoking: ${this.formData.lifestyle.smoking} | Alcohol: ${this.formData.lifestyle.alcohol}</div>
            </div>
            <button type="button" class="btn-jump-step text-xs text-primary font-mono font-bold" data-target="5">Edit</button>
          </div>

          <div class="p-4 rounded-xl bg-surface-deep/50 border border-white/5 flex justify-between items-center">
            <div>
              <div class="text-xs font-mono text-text-muted uppercase">Emergency Contact</div>
              <div class="text-sm font-bold text-text-primary">${this.formData.emergencyName} (${this.formData.emergencyRelationship})</div>
            </div>
            <button type="button" class="btn-jump-step text-xs text-primary font-mono font-bold" data-target="9">Edit</button>
          </div>
        </div>

        <button id="btn-finish-onboarding" class="w-full py-5 rounded-2xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-sm uppercase tracking-widest border border-primary/20 hover:border-primary/40 flex items-center justify-center gap-3">
          <span>Lock Ledger & Enter</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
        </button>
      `;
    }

    this.container.innerHTML = `
      <div class="w-full max-w-2xl mx-auto mb-6">
        <div class="flex justify-between items-center text-xs font-mono text-text-muted mb-2">
          <span>CLINICAL ONBOARDING WIZARD</span>
          <span>${progressPct}%</span>
        </div>
        <div class="w-full h-2 rounded-full bg-surface border border-white/5 overflow-hidden">
          <div class="h-full bg-gradient-to-r from-primary to-accent-primary transition-all duration-300" style="width: ${progressPct}%"></div>
        </div>
      </div>

      <div class="w-full max-w-2xl mx-auto p-6 md:p-10 clay-glass-panel shrink-0 animate-fade-in-up">
        ${stepHTML}
      </div>
    `;

    this._bindStepEvents();
  }

  _renderNavButtons(showBack = true, showNext = true, showSkip = false) {
    return `
      <div class="flex items-center gap-3 mt-8">
        ${showBack ? `
          <button type="button" id="btn-prev" class="p-4 rounded-xl bg-surface/50 border border-border hover:bg-surface text-text-secondary active:scale-95">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5"></path><path d="M12 19l-7-7 7-7"></path></svg>
          </button>
        ` : ''}
        ${showSkip ? `
          <button type="button" id="btn-skip" class="px-5 py-4 rounded-xl bg-transparent border border-border text-text-muted font-bold text-xs uppercase hover:text-text-primary">
            Skip for Now
          </button>
        ` : ''}
        ${showNext ? `
          <button type="button" id="btn-next" class="flex-1 py-4 rounded-xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-xs uppercase tracking-widest border border-primary/20 flex items-center justify-center gap-2">
            <span>Continue</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
          </button>
        ` : ''}
      </div>
    `;
  }

  _bindStepEvents() {
    // Step 1 Consent Next
    const s1Next = this.container.querySelector('#btn-step-1-next');
    if (s1Next) {
      s1Next.onclick = () => {
        const check = this.container.querySelector('#consent-check');
        if (!check?.checked) {
          showToast('Please check the consent box to proceed.', 'error');
          return;
        }
        this.formData.consentGiven = true;
        this.autosave();
        this.step = 2;
        this._renderStep();
      };
    }

    // Previous Button
    const prevBtn = this.container.querySelector('#btn-prev');
    if (prevBtn) {
      prevBtn.onclick = () => {
        if (this.step > 1) {
          this.step--;
          this._renderStep();
        }
      };
    }

    // Skip Button
    const skipBtn = this.container.querySelector('#btn-skip');
    if (skipBtn) {
      skipBtn.onclick = () => {
        this.autosave();
        this.step++;
        this._renderStep();
      };
    }

    // Sex Buttons in Step 2
    const sexBtns = this.container.querySelectorAll('.btn-sex');
    sexBtns.forEach(btn => {
      btn.onclick = () => {
        sexBtns.forEach(b => b.classList.remove('active-tab', 'border-primary', 'text-primary'));
        btn.classList.add('active-tab', 'border-primary', 'text-primary');
        this.formData.sex = btn.dataset.sex;
      };
    });

    // Disease Chips in Step 3
    const diseaseChips = this.container.querySelectorAll('.chip-disease');
    diseaseChips.forEach(chip => {
      chip.onclick = () => {
        const id = chip.dataset.id;
        const idx = this.formData.active_conditions.findIndex(c => (typeof c === 'string' ? c : c.id) === id);
        if (idx > -1) {
          this.formData.active_conditions.splice(idx, 1);
        } else {
          this.formData.active_conditions.push({ id, code: chip.dataset.code, display: chip.dataset.display });
        }
        this.autosave();
        this._renderStep();
      };
    });

    // Allergy Chips in Step 4
    const allergyChips = this.container.querySelectorAll('.chip-allergy');
    allergyChips.forEach(chip => {
      chip.onclick = () => {
        const name = chip.dataset.name;
        const idx = this.formData.allergies.findIndex(a => (typeof a === 'string' ? a : a.name) === name);
        if (idx > -1) {
          this.formData.allergies.splice(idx, 1);
        } else {
          this.formData.allergies.push({ name, category: chip.dataset.category, severity: 'HIGH' });
        }
        this.autosave();
        this._renderStep();
      };
    });

    // Family Chips in Step 8
    const familyChips = this.container.querySelectorAll('.chip-family');
    familyChips.forEach(chip => {
      chip.onclick = () => {
        const cond = chip.dataset.condition;
        const idx = this.formData.family_history.findIndex(f => f.condition === cond);
        if (idx > -1) {
          this.formData.family_history.splice(idx, 1);
        } else {
          this.formData.family_history.push({ condition: cond, relation: 'Family' });
        }
        this.autosave();
        this._renderStep();
      };
    });

    // Jump Buttons in Step 11
    const jumpBtns = this.container.querySelectorAll('.btn-jump-step');
    jumpBtns.forEach(btn => {
      btn.onclick = () => {
        this.step = parseInt(btn.dataset.target, 10);
        this._renderStep();
      };
    });

    // Avatar Carousel in Step 10
    const avatarContainer = this.container.querySelector('#avatar-carousel-container');
    if (avatarContainer) {
      this.avatarSelector = new AvatarSelector(avatarContainer, AVATARS, {
        initialIndex: AVATARS.indexOf(this.formData.avatar),
        onChange: (url) => {
          this.formData.avatar = url;
        }
      });
    }

    // Step Next Button
    const nextBtn = this.container.querySelector('#btn-next');
    if (nextBtn) {
      nextBtn.onclick = () => {
        if (this.step === 2) {
          const fn = this.container.querySelector('#input-fullname')?.value.trim();
          const dob = this.container.querySelector('#input-dob')?.value;
          if (!fn || !dob || !this.formData.sex || this.formData.sex === 'UNKNOWN') {
            showToast('Please complete all required identity fields (*)', 'error');
            return;
          }
          this.formData.fullName = fn;
          this.formData.dob = dob;

          if (this.getAge() < 18) {
            showToast('Primary user must be 18+ years old.', 'error');
            return;
          }
        } else if (this.step === 5) {
          this.formData.lifestyle.smoking = this.container.querySelector('#select-smoking')?.value || 'UNKNOWN';
          this.formData.lifestyle.tobacco_chewing = this.container.querySelector('#select-tobacco')?.value || 'UNKNOWN';
          this.formData.lifestyle.alcohol = this.container.querySelector('#select-alcohol')?.value || 'UNKNOWN';
        } else if (this.step === 6) {
          const ren = this.container.querySelector('#select-renal')?.value || 'UNKNOWN';
          const hep = this.container.querySelector('#select-hepatic')?.value || 'UNKNOWN';
          const preg = this.container.querySelector('#select-pregnancy')?.value || 'UNKNOWN';
          
          const nowISO = new Date().toISOString();
          this.formData.renal_clearance = { value: ren, source: 'user', confidence: 1.0, updatedAt: nowISO };
          this.formData.hepatic_impairment = { value: hep, source: 'user', confidence: 1.0, updatedAt: nowISO };
          this.formData.pregnancy_status = { value: preg, source: 'user', confidence: 1.0, updatedAt: nowISO };
        } else if (this.step === 7) {
          this.formData.height_cm = this.container.querySelector('#input-height')?.value || '';
          this.formData.weight_kg = this.container.querySelector('#input-weight')?.value || '';
          this.formData.bloodType = this.container.querySelector('#select-blood')?.value || 'Unknown';
        } else if (this.step === 9) {
          const en = this.container.querySelector('#input-emerg-name')?.value.trim();
          const ep = this.container.querySelector('#input-emerg-phone')?.value.trim();
          if (!en || !ep || ep.length < 10) {
            showToast('Please enter a valid emergency responder name and 10-digit phone #.', 'error');
            return;
          }
          this.formData.emergencyName = en;
          this.formData.emergencyRelationship = this.container.querySelector('#select-emerg-rel')?.value || 'Spouse';
          this.formData.emergencyPhoneCode = this.container.querySelector('#select-emerg-code')?.value || '+91';
          this.formData.emergencyPhone = ep;
        }

        this.autosave();
        this.step++;
        this._renderStep();
      };
    }

    // Finish Button in Step 11
    const finishBtn = this.container.querySelector('#btn-finish-onboarding');
    if (finishBtn) {
      finishBtn.onclick = async () => {
        finishBtn.disabled = true;
        finishBtn.textContent = 'SECURING LEDGER...';

        try {
          const user = auth.currentUser;
          if (!user) throw new Error('No authenticated user found.');

          const nowISO = new Date().toISOString();

          const profileData = {
            fullName: this.formData.fullName,
            dob: this.formData.dob,
            sex: this.formData.sex,
            height_cm: this.formData.height_cm,
            weight_kg: this.formData.weight_kg,
            bloodType: this.formData.bloodType,
            phone: this.formData.myPhoneCode + (this.formData.myPhone || ''),
            emergencyName: this.formData.emergencyName,
            emergencyRelationship: this.formData.emergencyRelationship,
            emergencyPhone: this.formData.emergencyPhoneCode + this.formData.emergencyPhone,
            avatar: this.formData.avatar,
            renal_clearance: this.formData.renal_clearance,
            hepatic_impairment: this.formData.hepatic_impairment,
            pregnancy_status: this.formData.pregnancy_status,
            active_conditions: this.formData.active_conditions,
            allergies: this.formData.allergies,
            family_history: this.formData.family_history,
            lifestyle: this.formData.lifestyle,
            medication_baseline: this.formData.medication_baseline
          };

          const rootPayload = {
            userId: user.uid,
            name: this.formData.fullName,
            email: user.email,
            role: 'user',
            profileVersion: 2,
            consentGiven: true,
            consentTimestamp: nowISO,
            lastClinicalUpdate: nowISO,
            createdAt: serverTimestamp(),
            onboardingComplete: true,
            profile: profileData
          };

          await setDoc(doc(db, 'users', user.uid), rootPayload);

          try {
            await updateProfile(user, { displayName: this.formData.fullName });
          } catch (authErr) {
            console.warn('[Onboarding] Auth displayName update skipped:', authErr);
          }

          if (state.patchProfile) {
            state.patchProfile(rootPayload);
          }

          localStorage.removeItem(`medcare_onboarding_draft_${user.uid}`);

          // Launch Medication Baseline Modal Prompt
          this._promptMedicationBaseline();

        } catch (err) {
          console.error('[Onboarding] Error locking ledger:', err);
          showToast('Failed to save profile: ' + err.message, 'error');
          finishBtn.disabled = false;
          finishBtn.textContent = 'LOCK LEDGER & ENTER';
        }
      };
    }
  }

  _promptMedicationBaseline() {
    const modal = document.createElement('div');
    modal.className = 'fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in';
    modal.innerHTML = `
      <div class="w-full max-w-md p-6 clay-glass-panel text-center">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-3xl">💊</div>
        <h3 class="text-xl font-display font-bold text-text-primary">Medication Baseline</h3>
        <p class="text-xs text-text-secondary mt-2 mb-6">Do you currently take any daily medications or prescriptions?</p>
        
        <div class="space-y-3">
          <button id="btn-med-yes" class="w-full py-4 rounded-xl bg-primary text-surface font-bold text-sm uppercase tracking-widest shadow-lg active:scale-95">Yes, Add Daily Medications</button>
          <button id="btn-med-no" class="w-full py-3 rounded-xl bg-surface border border-border text-text-secondary font-bold text-xs uppercase hover:text-text-primary">No / Skip for Now</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('#btn-med-yes').onclick = () => {
      modal.remove();
      window.location.hash = '#/add-medication';
    };

    modal.querySelector('#btn-med-no').onclick = () => {
      modal.remove();
      window.location.hash = '#/dashboard';
    };
  }

  destroy() {
    if (this.avatarSelector) {
      this.avatarSelector.destroy();
    }
  }
}
