/**
 * MedCare | Global State Manager
 * Single source of truth for auth + user profile.
 * Features a network circuit-breaker to prevent infinite offline locks.
 */

import { db } from './firebase.js';
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
  }

  // ─── Subscription ────────────────────────────────────────────────────────────

  /**
   * Subscribe to state changes.
   * @param {(user: any, profile: any) => void} listener
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
    this._listeners.forEach(l => {
      try { l(this.user, this.userProfile); }
      catch (e) { console.error('[State] Listener error:', e); }
    });
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
      } else {
        this.userProfile = { onboardingComplete: false };
      }
    } catch (err) {
      console.warn('[State] Circuit breaker tripped. Booting in local offline-first mode:', err.message);
      // Fail-safe: Assume a valid user profile cache to keep the app functional offline
      this.userProfile = { onboardingComplete: true, isOfflineFallback: true };
      this.isAdmin = false;
    }

    this._notify();
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