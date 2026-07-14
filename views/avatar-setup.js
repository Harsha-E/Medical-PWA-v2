import { auth, db } from '../core/firebase.js';
import { doc, updateDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import state from '../core/state.js';
import { showToast } from '../core/ui.js';
import AvatarSelector from '../components/AvatarSelector.js';

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

export default class AvatarSetupView {
  constructor() {
    this.selectedAvatar = state.userProfile?.profile?.avatar || AVATARS[0];
    this.avatarSelector = null;
  }

  async render() {
    this.container = document.createElement('div');
    this.container.className = 'h-[100dvh] w-full flex flex-col items-center justify-start p-4 md:p-8 lg:p-12 relative z-10 overflow-y-auto';

    let initialIndex = AVATARS.indexOf(this.selectedAvatar);
    if (initialIndex === -1) initialIndex = 0;

    const isEditing = !!(state.userProfile?.profile?.avatar);

    this.container.innerHTML = `
      <div class="flex-grow min-h-0"></div>
      <div class="w-full max-w-2xl md:max-w-4xl lg:max-w-5xl mx-auto p-8 md:p-12 clay-glass-panel shrink-0 animate-fade-in-up">
        <div class="mb-10 text-center">
          <span class="text-accent-primary font-mono text-xs uppercase tracking-widest">${isEditing ? 'Profile Settings' : 'Required Setup'}</span>
          <h2 class="text-3xl md:text-4xl font-display font-semibold text-text-primary mt-3">${isEditing ? 'Update Your Avatar' : 'Choose Your Avatar'}</h2>
          <p class="text-text-secondary text-sm md:text-base mt-2">Select a visual identity for your medical profile.</p>
        </div>

        <div id="avatar-carousel-container" class="mb-12"></div>

        <button id="btn-save-avatar" class="w-full py-5 rounded-2xl bg-gradient-to-r from-primary/20 to-surface-elevated text-primary font-bold text-sm uppercase tracking-widest active:scale-95 transition-all shadow-[0_4px_20px_rgba(0,0,0,0.4),_inset_0_2px_2px_rgba(255,255,255,0.05)] border border-primary/20 hover:border-primary/40 flex items-center justify-center gap-3">
          <span id="save-btn-text">Save & Continue</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"></path><path d="M12 5l7 7-7 7"></path></svg>
        </button>

        ${isEditing ? `
          <button id="btn-cancel" class="w-full mt-4 py-4 rounded-2xl bg-transparent border border-border text-text-secondary font-bold text-sm uppercase tracking-widest hover:bg-white/5 active:scale-95 transition-all">
            Cancel
          </button>
        ` : ''}
      </div>
      <div class="flex-grow min-h-0"></div>
    `;

    const carouselContainer = this.container.querySelector('#avatar-carousel-container');
    this.avatarSelector = new AvatarSelector(carouselContainer, AVATARS, {
      initialIndex: initialIndex,
      onChange: (url) => {
        this.selectedAvatar = url;
      }
    });

    const saveBtn = this.container.querySelector('#btn-save-avatar');
    saveBtn.addEventListener('click', async () => {
        saveBtn.disabled = true;
        this.container.querySelector('#save-btn-text').textContent = 'Saving...';
        
        try {
            const user = auth.currentUser;
            if (!user) throw new Error("No authenticated user found.");
            
            // Get latest profile map from state
            const currentProfile = state.userProfile?.profile || {};
            // Deep clone to strip out any Vue/State proxies that cause Firebase internal assertions
            const newProfile = JSON.parse(JSON.stringify({ ...currentProfile, avatar: this.selectedAvatar }));

            // Update Firestore using setDoc with merge to be safe
            const { getFirestore, setDoc, doc: fsDoc } = await import('https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js');
            const firestoreDb = getFirestore();
            const docRef = fsDoc(firestoreDb, 'users', user.uid);
            await setDoc(docRef, { profile: newProfile }, { merge: true });

            // Update local state
            if (state.patchProfile) {
                state.patchProfile({ profile: newProfile });
            } else if (state.update) {
                state.update({ userProfile: { ...state.userProfile, profile: newProfile } });
            }

            showToast('Avatar saved successfully', 'success');
            
            if (isEditing) {
                window.history.back(); // Return to settings
            } else {
                window.location.hash = '#/dashboard';
            }
        } catch (error) {
            console.error(error);
            showToast('Failed to save avatar: ' + error.message, 'error');
            saveBtn.disabled = false;
            this.container.querySelector('#save-btn-text').textContent = 'Save & Continue';
        }
    });

    const cancelBtn = this.container.querySelector('#btn-cancel');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
            window.history.back();
        });
    }

    return this.container;
  }

  destroy() {
    if (this.avatarSelector) {
        this.avatarSelector.destroy();
    }
  }
}
