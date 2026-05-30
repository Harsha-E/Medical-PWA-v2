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
import { hapticEngine }   from './services/HapticEngine.js';
import PwaInstallManager  from './services/PwaInstallManager.js';
import GlassNavbar        from './components/navbar.js';
import ContextSwitcher    from './components/context-switcher.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

// ─── View imports ─────────────────────────────────────────────────────────────
import SplashView           from './views/splash.js';
import LandingView          from './views/landing.js';
import LoginView            from './views/login.js';
import RegisterView         from './views/register.js';
import InstallView          from './views/install.js';
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
import PeerDashboardView    from './views/peer-dashboard.js';
import AppointmentsView     from './views/appointments.js';
import AdminView            from './views/admin.js';
import CalendarView         from './views/calendar.js';
import OrchestratorView     from './views/orchestrator.js';

// ─── Route map ────────────────────────────────────────────────────────────────
// Defined before the App class so it is in scope for the constructor.

const ROUTES = {
  '/': SplashView,
  '/landing': LandingView,
  '/login': LoginView,
  '/register': RegisterView,
  '/install': InstallView,
  '/onboarding': OnboardingView,
  '/dashboard': DashboardView,
  '/medications': MedicationsView,
  '/add-medication': AddMedicationView,
  '/interaction-checker': InteractionCheckerView,
  '/scan': ScanView,
  '/reports': ReportsView,
  '/settings': SettingsView,
  '/medical-history': MedicalHistoryView,
  '/family-profiles': FamilyProfilesView,
  '/peer-hub': EmergencyView,
  '/emergency': EmergencyView,
  '/peer-dashboard': PeerDashboardView,
  '/appointments': AppointmentsView,
  '/admin': AdminView,
  '/calendar': CalendarView,
  '/orchestrator': OrchestratorView,
  '/medication-detail': MedicationDetailView
};

/** Routes that don't require a logged-in user. */
const PUBLIC_ROUTES = new Set(['#/', '#/landing', '#/splash', '#/login', '#/register', '#/install']);

/** Routes where the navbar should be hidden. */
const HIDE_NAV_ROUTES = new Set(['#/onboarding', '#/splash', '#/install']);

/** Routes where the WebGL liquid background is active. */
const LIQUID_ROUTES = new Set(['#/', '#/landing', '#/login', '#/register']);

// ─── App ──────────────────────────────────────────────────────────────────────

class App {
  constructor() {
    this.viewport = document.getElementById('app-viewport');
    this.router   = new Router(ROUTES, this.viewport);
    this.glassNav = new GlassNavbar();
    this.contextSwitcher = new ContextSwitcher();
    this.ghostFluid = null; // Track WebGL instance

    /** Tracks whether the first auth-state event has resolved. */
    this._authReady = false;
  }

  async init() {

    // ─── PWA NATIVE STANDARDS ───────────────────────────────────────────
    hapticEngine.init();
    
    // Register Service Worker and Boot PWA Install Manager
    if ('serviceWorker' in navigator) {
      try {
        const BASE_PATH = window.location.hostname === 'harsha-e.github.io' ? '/Medical-PWA-v2' : '';
        const reg = await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`);
        
        await navigator.serviceWorker.ready;

        navigator.serviceWorker.addEventListener('controllerchange', () => {
        });

        if (!navigator.serviceWorker.controller) {
          if (!sessionStorage.getItem('sw_reloaded')) {
            console.warn('[SW] No controller. Reloading.');
            sessionStorage.setItem('sw_reloaded', 'true');
            window.location.reload();
            return;
          }
        }
        
        this.pwaManager = new PwaInstallManager();
      } catch (err) {
        console.error('[Service Worker] Registration failed:', err);
      }
    } else {
      this.pwaManager = new PwaInstallManager();
    }
    
    // 1. Initialize Clinical Engines in the background
    try {
      await interactionGraph.initialize();
      // Fetch the drug index manually to hydrate the NLP context
      const indexRes = await fetch('./data/drug-index.json');
      const drugIndex = await indexRes.json();
      await nlpContext.hydrate(drugIndex);
    } catch (err) {
      console.error('Failed to boot clinical engines:', err);
    }

    // Inject Rose-Gold theme onto the viewport
    this.viewport.classList.add('theme-rose-gold');

    // 3. Attach Listeners
    let currentHash = window.location.hash || '#/';
    window.addEventListener('hashchange', (e) => {
      if (window.medcareAlertLock) {
        window.location.hash = currentHash;
        return;
      }
      currentHash = window.location.hash;
      if (this._authReady) this.runGuard();
    });
    
    state.subscribe(() => {
      if (this._authReady) this.runGuard();
    });
    
    // Listen to Firebase Auth state
    onAuthStateChanged(auth, this.onAuthStateChanged.bind(this));
    
    // Listen for network connectivity changes
    this.initNetworkStatusIndicator();
  }

  initNetworkStatusIndicator() {
    const indicator = document.createElement('div');
    indicator.id = 'network-status-indicator';
    indicator.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 z-[9999] px-4 py-2 rounded-full font-mono text-xs uppercase tracking-widest font-bold shadow-lg transition-all duration-500 opacity-0 pointer-events-none translate-y-[-20px]';
    document.body.appendChild(indicator);

    const updateStatus = () => {
      if (navigator.onLine) {
        indicator.textContent = 'Network Restored';
        indicator.classList.remove('bg-red-900/90', 'text-red-200', 'border-red-500/50');
        indicator.classList.add('bg-green-900/90', 'text-green-200', 'border', 'border-green-500/50', 'opacity-100', 'translate-y-0');
        
        setTimeout(() => {
          indicator.classList.remove('opacity-100', 'translate-y-0');
          indicator.classList.add('opacity-0', 'translate-y-[-20px]');
        }, 3000);
      } else {
        indicator.textContent = 'Operating Offline';
        indicator.classList.remove('bg-green-900/90', 'text-green-200', 'border-green-500/50');
        indicator.classList.add('bg-red-900/90', 'text-red-200', 'border', 'border-red-500/50', 'opacity-100', 'translate-y-0');
      }
    };

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
  }

  async onAuthStateChanged(user) {
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

    // ── Managed by individual views (GhostFluid instantiation removed) ──

    // ── Navbar visibility ──
    const showNav = !HIDE_NAV_ROUTES.has(hash);
    this.glassNav.setVisibility?.(showNav);

    // ── Manage Pill Docking and Layout ──
    if (user && isComplete) {
      document.body.classList.add('auth-layout-active');
    } else {
      document.body.classList.remove('auth-layout-active');
    }
    
    // Manage dynamic layout spacing
    if (showNav && user && isComplete) {
      document.body.classList.add('has-navbar');
    } else {
      document.body.classList.remove('has-navbar');
    }

    // ── Auth guard ──
    // App installation requirement removed.
    // const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    // const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    // if (!isStandalone && isMobile) {
    //   if (hash !== '#/install') {
    //     window.location.hash = '#/install';
    //     return;
    //   }
    // }

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
    this.router.handleRoute();
  }
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

const app = new App();
app.init();

export default app;