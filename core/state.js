/**
 * MedCare | Global State Manager
 * Single source of truth for auth + user profile.
 * Features a network circuit-breaker to prevent infinite offline locks.
 */

import { db } from './firebase.js';
import localDb from './db.js';
import { doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

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
    // Forced dark mode, ignore incoming pref requests
    this.themePref = 'dark';
    localStorage.setItem('medcare_theme_pref', 'dark');
    this._applyThemePref();
    this._notify();
  }

  _applyThemePref() {
    this.theme = 'dark';
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // ─── Caregiver Mode (Inception Mode) ──────────────────────────────────────────

  setProfileContext(profile) {
    this.activeProfileContext = profile; // { id: "peer123", name: "Mom" } or null
    this._notify();
  }

  get auditFlag() {
    // If we are in caregiver mode, tag the write.
    if (this.activeProfileContext && this.userProfile) {
      return { logged_by: this.userProfile.name || this.user.displayName || 'Caregiver' };
    }
    return {};
  }

  // ─── Subscription ────────────────────────────────────────────────────────────

  /**
   * Subscribe to state changes.
   * @param {(user: any, profile: any, context: any) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    this._listeners.push(listener);
    return () => {
      this._listeners = this._listeners.filter(l => l !== listener);
    };
  }

  /** Notify all subscribers with current state. */
  _notify() {
    for (const listener of this._listeners) {
      try { listener(this.user, this.userProfile, this.activeProfileContext); }
      catch (e) { console.error('[State] Listener error:', e); }
    }
  }

  // ─── Profile Context (Caregiver Mode) ──────────────────────────────────────
  
  setActiveProfileContext(profile) {
    this.activeProfileContext = profile;
    window.dispatchEvent(new CustomEvent('medcare:profile-context-changed', { detail: profile }));
  }

  // ─── Hydration ────────────────────────────────────────────────────────────────

  /**
   * Populate state from Firestore after sign-in.
   * Employs a strict timeout race to ensure the app never hangs indefinitely.
   * @param {import('firebase/auth').User} user
   */
  async hydrate(user) {
    this.user = user;
    this.isAdmin = false;
    const cacheKey = `medcare_profile_${user.uid}`;

    try {
      // Create the primary fetch promise
      const fetchPromise = getDoc(doc(db, 'users', user.uid));
      
      // Create a fail-safe 2.5 second timeout circuit breaker
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Cloud Synchronization Timeout')), 2500)
      );

      // Race them against each other
      const snap = await Promise.race([fetchPromise, timeoutPromise]);

      if (snap && snap.exists()) {
        const data = snap.data();
        this.userProfile = data;
        this.isAdmin = data.role === 'admin';
        // Cache in localStorage for immediate offline access
        localStorage.setItem(cacheKey, JSON.stringify(data));
      } else {
        this.userProfile = { onboardingComplete: false };
      }
    } catch (err) {
      console.warn('[State] Circuit breaker tripped. Booting in local offline-first mode:', err.message);
      
      // Try localStorage first
      const cachedData = localStorage.getItem(cacheKey);
      if (cachedData) {
        try {
          const data = JSON.parse(cachedData);
          this.userProfile = data;
          this.isAdmin = data.role === 'admin';
          console.log('[State] Hydrated from localStorage cache.');
        } catch (e) {
          console.error('[State] localStorage parse error:', e);
          this._fallbackToIndexedDB();
        }
      } else {
        await this._fallbackToIndexedDB();
      }
    }

    this._notify();
  }

  async _fallbackToIndexedDB() {
    try {
      const localProfiles = await localDb.userProfile.toArray();
      if (localProfiles && localProfiles.length > 0) {
        this.userProfile = localProfiles[localProfiles.length - 1];
        this.isAdmin = this.userProfile.role === 'admin';
      } else {
        this.userProfile = { onboardingComplete: false, isOfflineFallback: true };
        this.isAdmin = false;
      }
    } catch (localErr) {
      console.error('[State] Local DB read failed during fallback:', localErr);
      this.userProfile = { onboardingComplete: false, isOfflineFallback: true };
      this.isAdmin = false;
    }
  }

  // ─── Mutation helpers ─────────────────────────────────────────────────────────

  /**
   * Merge partial updates into userProfile and notify listeners.
   * @param {Object} patch
   */
  patchProfile(patch) {
    this.userProfile = { ...this.userProfile, ...patch };
    this._notify();
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