/**
 * MedCare | Global State Manager
 * Single source of truth for auth + user profile.
 * Features a network circuit-breaker to prevent infinite offline locks.
 * Integrates schema versioning (profileVersion: 2) and CanonicalContextBuilder.
 */

import { db } from './firebase.js';
import localDb from './db.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import CanonicalContextBuilder from './CanonicalContextBuilder.js';

export function migrateExistingUserProfile(docData) {
  if (!docData) return { onboardingComplete: false, profileVersion: 2 };
  
  const p = docData.profile || {};
  const migratedProfile = {
    fullName: p.fullName || p.name || docData.name || '',
    phone: p.phone || '',
    bloodType: p.bloodType || 'UNKNOWN',
    dob: p.dob || '',
    sex: p.sex || 'UNKNOWN',
    height_cm: p.height_cm || null,
    weight_kg: p.weight_kg || null,
    emergencyName: p.emergencyName || '',
    emergencyPhone: p.emergencyPhone || '',
    emergencyRelationship: p.emergencyRelationship || 'Family',
    avatar: p.avatar || null,
    renal_clearance: p.renal_clearance || { value: 'UNKNOWN', source: 'migration', confidence: 0.5, updatedAt: new Date().toISOString() },
    hepatic_impairment: p.hepatic_impairment || { value: 'UNKNOWN', source: 'migration', confidence: 0.5, updatedAt: new Date().toISOString() },
    pregnancy_status: p.pregnancy_status || { value: 'UNKNOWN', source: 'migration', confidence: 0.5, updatedAt: new Date().toISOString() },
    active_conditions: p.active_conditions || [],
    allergies: p.allergies || [],
    family_history: p.family_history || [],
    lifestyle: p.lifestyle || { smoking: 'UNKNOWN', tobacco_chewing: 'UNKNOWN', alcohol: 'UNKNOWN' },
    medication_baseline: p.medication_baseline || 'UNKNOWN'
  };

  return {
    ...docData,
    profileVersion: 2,
    consentGiven: docData.consentGiven ?? true,
    consentTimestamp: docData.consentTimestamp || new Date().toISOString(),
    lastClinicalUpdate: docData.lastClinicalUpdate || new Date().toISOString(),
    profile: migratedProfile
  };
}

class State {
  constructor() {
    /** @type {import('firebase/auth').User | null} */
    this.user = null;

    /** @type {Object | null} */
    this.userProfile = null;

    /** @type {boolean} */
    this.isAdmin = false;

    /** @type {Array<Function>} */
    this._listeners = [];

    /** @type {Object | null} */
    this.activeProfileContext = null; // null means 'self'. Otherwise object with id, name.

    // Initialize Theme (Forced Dark Mode)
    this.themePref = 'dark';
    localStorage.setItem('medcare_theme_pref', 'dark');
    this._applyThemePref();

    // ─── Device Identity ─────────────────────────────────────────────────────
    this._initInstallationId();
  }

  _initInstallationId() {
    let iid = localStorage.getItem('medcheck_installation_id');
    if (!iid) {
      iid = crypto.randomUUID ? crypto.randomUUID() : 'inst_' + Math.random().toString(36).substr(2, 9);
      localStorage.setItem('medcheck_installation_id', iid);
    }
    this.installationId = iid;
  }

  // ─── Theme Management ────────────────────────────────────────────────────────
  
  setThemePreference(pref) {
    this.themePref = 'dark';
    this._applyThemePref();
    this._notify();
  }

  _applyThemePref() {
    document.documentElement.classList.add('dark');
  }

  // ─── Observer Pattern ────────────────────────────────────────────────────────

  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter((l) => l !== listener);
    };
  }

  _notify() {
    this._listeners.forEach((listener) => {
      try {
        listener(this);
      } catch (err) {
        console.error('[State] Listener error:', err);
      }
    });
  }

  // ─── State Mutations ─────────────────────────────────────────────────────────

  update(newState) {
    Object.assign(this, newState);
    this._notify();
  }

  setActiveProfileContext(profile) {
    this.activeProfileContext = profile;
    window.dispatchEvent(new CustomEvent('medcare:profile-context-changed', { detail: profile }));
  }

  // ─── Hydration ────────────────────────────────────────────────────────────────

  async hydrate(user) {
    this.user = user;
    this.isAdmin = false;
    const cacheKey = `medcare_profile_${user.uid}`;

    try {
      const fetchPromise = getDoc(doc(db, 'users', user.uid));
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cloud Synchronization Timeout')), 2500)
      );

      const snap = await Promise.race([fetchPromise, timeoutPromise]);

      if (snap && snap.exists()) {
        const rawData = snap.data();
        const data = migrateExistingUserProfile(rawData);
        this.userProfile = data;
        this.isAdmin = data.role === 'admin';
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } else {
        await this._fallbackToIndexedDB(user.uid, cacheKey);
      }
    } catch (err) {
      console.warn('[State] Firestore sync skipped/errored. Falling back to local priority cache:', err.message);
      await this._fallbackToIndexedDB(user.uid, cacheKey);
    }

    this._notify();
  }

  async _fallbackToIndexedDB(uid, cacheKey) {
    try {
      // 1. Try Dexie IndexedDB
      const localProfiles = await localDb.userProfile.toArray();
      const userDoc = localProfiles.find(p => p.id === uid || p.userId === uid) || localProfiles[localProfiles.length - 1];
      
      if (userDoc) {
        const data = migrateExistingUserProfile(userDoc);
        this.userProfile = data;
        this.isAdmin = data.role === 'admin';
        console.log('[State] Hydrated from Dexie IndexedDB cache (v2 migrated).');
        return;
      }
    } catch (localErr) {
      console.warn('[State] Local Dexie DB read failed during fallback:', localErr);
    }

    // 2. Try LocalStorage draft
    try {
      const draftData = localStorage.getItem(`medcare_onboarding_draft_${uid}`) || localStorage.getItem(cacheKey);
      if (draftData) {
        const parsed = JSON.parse(draftData);
        const data = migrateExistingUserProfile({ profile: parsed, onboardingComplete: false });
        this.userProfile = data;
        this.isAdmin = data.role === 'admin';
        console.log('[State] Hydrated from LocalStorage draft cache (v2 migrated).');
        return;
      }
    } catch (lsErr) {
      console.warn('[State] LocalStorage draft read failed during fallback:', lsErr);
    }

    // 3. Fallback to Memory
    this.userProfile = { onboardingComplete: false, isOfflineFallback: true, profileVersion: 2 };
    this.isAdmin = false;
  }

  // ─── Mutation helpers ─────────────────────────────────────────────────────────

  patchProfile(patch) {
    this._cachedCanonicalContext = null; // Invalidate cached context immediately on profile mutation
    this.userProfile = { ...this.userProfile, ...patch, lastClinicalUpdate: new Date().toISOString() };
    this._notify();
  }

  /**
   * Helper to build runtime DIC payload snapshot. Always rebuilds fresh context.
   * @param {Array} medications 
   * @returns {Object} Canonical context payload
   */
  getCanonicalContext(medications = []) {
    this._cachedCanonicalContext = CanonicalContextBuilder.build(this.userProfile, medications);
    return this._cachedCanonicalContext;
  }

  /** Clear all state (called on sign-out). */
  clear() {
    this.user = null;
    this.userProfile = null;
    this.isAdmin = false;
    this._notify();
  }
}

export default new State();