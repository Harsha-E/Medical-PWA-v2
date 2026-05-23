/**
 * MedCare | Main Application Entry Point
 *
 * Responsibilities:
 *   1. Register all route → View class mappings
 *   2. Boot the Router, Navbar, and GhostFluid background
 *   3. Subscribe to Firebase auth changes → hydrate State
 *   4. Run the navigation guard after every auth change or hash change
 */

import { Router }         from './core/router.js';
import state              from './core/state.js';
import { auth }           from './core/firebase.js';
import { interactionGraph } from './services/InteractionGraph.js';
import { nlpContext }       from './services/NLPContext.js';
import GhostFluid         from './core/GhostFluid.js';
import GlassNavbar        from './components/navbar.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ─── View imports ─────────────────────────────────────────────────────────────
import SplashView           from './views/splash.js';
import LandingView          from './views/landing.js';
import LoginView            from './views/login.js';
import RegisterView         from './views/register.js';
import OnboardingView       from './views/onboarding.js';
import DashboardView        from './views/dashboard.js';
import MedicationsView      from './views/medications.js';
import MedicationDetailView from './views/medication-detail.js';
import AddMedicationView    from './views/add-medication.js';
import InteractionCheckerView from './views/interaction-checker.js';
import ScanView             from './views/scan.js';
import ReportsView          from './views/reports.js';
import SettingsView         from './views/settings.js';
import MedicalHistoryView   from './views/medical-history.js';
import FamilyProfilesView   from './views/family-profiles.js';
import EmergencyView        from './views/emergency.js';
import AppointmentsView     from './views/appointments.js';
import AdminView            from './views/admin.js';
import CalendarView         from './views/calendar.js';

// ─── Route map ────────────────────────────────────────────────────────────────
// Defined before the App class so it is in scope for the constructor.

const ROUTES = {
  '#/':             LandingView,
  '#/landing':      LandingView,
  '#/splash':       SplashView,
  '#/login':        LoginView,
  '#/register':     RegisterView,
  '#/admin':        AdminView,
  '#/onboarding':   OnboardingView,
  '#/dashboard':    DashboardView,
  '#/medications':  MedicationsView,
  '#/medication':   MedicationDetailView,
  '#/add':          AddMedicationView,
  '#/edit':         AddMedicationView,
  '#/interactions': InteractionCheckerView,
  '#/scan':         ScanView,
  '#/reports':      ReportsView,
  '#/settings':     SettingsView,
  '#/history':      MedicalHistoryView,
  '#/family':       FamilyProfilesView,
  '#/emergency':    EmergencyView,
  '#/appointments': AppointmentsView,
  '#/calendar':     CalendarView,
};

/** Routes that don't require a logged-in user. */
const PUBLIC_ROUTES = new Set(['#/', '#/landing', '#/splash', '#/login', '#/register']);

/** Routes where the navbar should be hidden. */
const HIDE_NAV_ROUTES = new Set(['#/onboarding', '#/splash']);

/** Routes where the WebGL liquid background is active. */
const LIQUID_ROUTES = new Set(['#/', '#/landing', '#/login', '#/register']);

// ─── App ──────────────────────────────────────────────────────────────────────

class App {
  constructor() {
    this.viewport = document.getElementById('app-viewport');
    this.router   = new Router(ROUTES, this.viewport);
    this.glassNav = new GlassNavbar();
    this.ghostFluid = null; // Track WebGL instance

    /** Tracks whether the first auth-state event has resolved. */
    this._authReady = false;
  }

  async init() {
    console.log('%c MedCare | Offline-First System Active ', 'background: #7f2f5d; color: #ffd9b5; font-weight: bold; padding: 4px 8px; border-radius: 4px;');
    console.log('%c MedCare | Core Initializing... ', 'background: #7f2f5d; color: #ffd9b5;');
    
    // 1. Initialize Clinical Engines in the background
    try {
      await interactionGraph.initialize();
      // Fetch the drug index manually to hydrate the NLP context
      const indexRes = await fetch('./data/drug-index.json');
      const drugIndex = await indexRes.json();
      await nlpContext.hydrate(drugIndex);
      console.log('%c MedCare | Clinical Engines Online ', 'color: #10b981;');
    } catch (err) {
      console.error('Failed to boot clinical engines:', err);
    }

    // Inject Rose-Gold theme onto the viewport
    this.viewport.classList.add('theme-rose-gold');

    // 3. Attach Listeners
    window.addEventListener('hashchange', () => {
      if (this._authReady) this.runGuard();
    });
    state.subscribe(() => {
      if (this._authReady) this.runGuard();
    });

    onAuthStateChanged(auth, async (user) => {
      try {
        if (user) {
          await state.hydrate(user);
        } else {
          state.clear();
        }
      } catch (err) {
        console.error('[Auth Error]', err);
      } finally {
        this._authReady = true;
        this.runGuard(); 

        // CRITICAL: Absolutely force the splash screen to die no matter what happens.
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            setTimeout(() => splash.remove(), 800); // Completely delete it from DOM
        }
        if (this.viewport) {
            this.viewport.style.opacity = '1';
            this.viewport.style.display = 'block';
        }
      }
    });
  }

  // ─── Navigation guard ───────────────────────────────────────────────────────

  /**
   * Called after every auth event and every hashchange.
   * Decides whether the current hash is reachable given the auth state,
   * then tells the router to render.
   */
  runGuard() {
    if (!this._authReady) return; // Prevent early bounces

    const rawHash = window.location.hash || '#/';
    
    // FIX: Normalize the hash input string by parsing away query and subpath segments
    let hash = rawHash.split('?')[0];
    if (!hash) hash = '#/'; // Failsafe against empty strings evaluating to undefined

    const pathSegments = hash.split('/');
    if (pathSegments.length > 2 && pathSegments[1]) {
      hash = `#/${pathSegments[1]}`;
    }
    
    const user    = state.user;
    const profile = state.userProfile;
    const isAdmin = state.isAdmin;
    const isComplete = !!profile?.onboardingComplete;

    // ── Manage WebGL Background Lifecycle ──
    const shouldHaveLiquid = LIQUID_ROUTES.has(hash);
    if (shouldHaveLiquid && !this.ghostFluid) {
      this.ghostFluid = new GhostFluid();
    } else if (!shouldHaveLiquid && this.ghostFluid) {
      this.ghostFluid.destroy();
      this.ghostFluid = null;
    }

    // ── Navbar visibility ──
    this.glassNav.setVisibility?.(!HIDE_NAV_ROUTES.has(hash));

    // ── Manage Pill Docking and Layout ──
    if (user && isComplete) {
      document.body.classList.add('auth-layout-active');
    } else {
      document.body.classList.remove('auth-layout-active');
    }

    // ── Auth guard ──
    if (!user) {
      if (!PUBLIC_ROUTES.has(hash)) {
        window.location.hash = '#/landing';
        return;
      }
    } else {
      if (isAdmin) {
        if (hash !== '#/admin') {
          window.location.hash = '#/admin';
          return;
        }
      } else {
        const needsOnboarding = !isComplete;
        if (needsOnboarding && hash !== '#/onboarding') {
          window.location.hash = '#/onboarding';
          return;
        }
        if (!needsOnboarding && (PUBLIC_ROUTES.has(hash) || hash === '#/onboarding')) {
          window.location.hash = '#/dashboard';
          return;
        }
      }
    }

    // Guard passed — render the current hash
    console.log(`[App | Guard] Execution passed. Triggering router.handleRoute() for hash: "${hash}"`);
    this.router.handleRoute();
    console.log(`[App | Guard] router.handleRoute() completed successfully.`);
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const app = new App();
app.init();

export default app;