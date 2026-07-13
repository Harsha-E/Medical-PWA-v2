/**
 * MedCare | Main Application Entry Point
 *
 * Responsibilities:
 *   1. Register all route â†’ View class mappings
 *   2. Boot the Router, Navbar, and GhostFluid background
 *   3. Subscribe to Firebase auth changes â†’ hydrate State
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
import AppHeader        from './components/header.js';
import ContextSwitcher    from './components/context-switcher.js';
import { portalLayout }   from './components/PortalLayout.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { datasetSyncManager } from './datasets/sync/DatasetSyncManager.js';
import PeerMeshV2 from './services/PeerMeshV2.js';
import QRManager from './utils/QRManager.js';
import OfflinePersistenceManager from './services/storage/OfflinePersistenceManager.js';
import WidgetPublisher from './services/WidgetPublisher.js';
// â”€â”€â”€ View imports â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import SplashView           from './views/splash.js';
import LandingView          from './views/landing.js';
import LoginView            from './views/login.js';
import RegisterView         from './views/register.js';
import InstallView          from './views/install2.js';
import OnboardingView       from './views/onboarding.js';
import DashboardView        from './views/dashboard.js';
import MedicationsView      from './views/medications.js';
import MedicationDetailView from './views/medication-detail.js';
import AddMedicationView    from './views/add-medication.js';
import InteractionCheckerView from './views/interaction-checker.js';
import ScanView             from './views/scan.js';
import Scan3DView           from './views/scan-3d.js';
import ScanResultView       from './views/scan-result.js';
import ReportsView          from './views/reports.js';
import SettingsView         from './views/settings.js';
import ClinicalDashboard      from './views/ClinicalDashboard.js';

import EmergencyView        from './views/emergency.js';
import PeerNetworkView      from './views/peer-network.js?v=3';
import PeerDashboardView    from './views/peer-dashboard.js';
import ClinicalLedgerView     from './views/clinical-ledger.js?v=3';
import AddRecordView          from './views/add-record.js';
import InteractionGraphView from './views/interaction-graph.js';
import AppointmentsView     from './views/appointments.js';
import CalendarView         from './views/calendar.js';
import AvatarSetupView      from './views/avatar-setup.js';

import OrchestratorView     from './views/orchestrator.js';

import MedicalTimelineView  from './views/timeline.js';

// â”€â”€â”€ Route map â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Defined before the App class so it is in scope for the constructor.

const ROUTES = {
  '#/': SplashView,
  '#/landing': LandingView,
  '#/login': LoginView,
  '#/register': RegisterView,
  '#/install': InstallView,
  '#/onboarding': OnboardingView,
  '#/dashboard': DashboardView,

  '#/timeline': MedicalTimelineView,
  '#/medications': MedicationsView,
  '#/add-medication': AddMedicationView,
  '#/interaction-checker': InteractionCheckerView,
  '#/scan': ScanView,
  '#/scan/3d': Scan3DView,
  '#/scan/result': ScanResultView,
  '#/reports': ReportsView,
  '#/settings': SettingsView,
  '#/medical-history': ClinicalDashboard,

  '#/peer-hub': PeerNetworkView,
  '#/emergency': EmergencyView,
  '#/peer-dashboard': PeerDashboardView,
  '#/appointments': AppointmentsView,
  '#/calendar': CalendarView,
  '#/orchestrator': OrchestratorView,
  '#/medication-detail': MedicationDetailView,
  '#/clinical-ledger': ClinicalLedgerView,
  '#/add-record': AddRecordView,
  '#/avatar-setup': AvatarSetupView,
};

/** Routes that don't require a logged-in user. */
const PUBLIC_ROUTES = new Set(['#/', '#/landing', '#/splash', '#/login', '#/register', '#/install']);

/** Routes where the navbar should be hidden. */
const HIDE_NAV_ROUTES = new Set([
  '#/onboarding', '#/splash', '#/install', '#/avatar-setup', 
  '#/add-medication', '#/medication-detail', '#/scan', '#/scan/3d', '#/scan/result',
  '#/interaction-checker', '#/interaction-graph',
  '#/reports', '#/emergency'
]);

/** Routes where the WebGL liquid background is active. */
const LIQUID_ROUTES = new Set(['#/', '#/landing', '#/login', '#/register']);

// â”€â”€â”€ Header Icons & Config â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PLUS_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`;
const SCAN_ICON = `<svg width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M9 9h6v6H9z"></path></svg>`;
const CALENDAR_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`;
const CHEVRON_ICON = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;

const resolveMedNameFromHash = () => {
  const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
  return urlParams.has('id') ? 'Medication Details' : 'Medication';
};

const resolvePeerNameFromState = () => (state.currentPeer && state.currentPeer.name) ? state.currentPeer.name : 'Remote Node';

const getGreeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Morning' : hour < 18 ? 'Afternoon' : 'Evening';
};

const HEADER_CONFIGS = {
  '#/dashboard': { 
    eyebrow: 'DASHBOARD', 
    title: () => `Good ${getGreeting()}, ` + (state.userProfile?.name || state.user?.displayName || 'User').split(' ')[0].toUpperCase(), 
    actions: [{ id: 'add', icon: PLUS_ICON, href: '#/add-medication', label: 'Add', style: 'accent' }] 
  },
  '#/medications': { eyebrow: null, title: 'Medications', actions: [{ id: 'scan', icon: SCAN_ICON, href: '#/scan', label: 'Scan prescription', style: 'ghost' }, { id: 'add-med', icon: PLUS_ICON, href: '#/add-medication', label: 'Add medication', style: 'accent' }] },
  '#/add-medication': { back: true, title: () => window.location.hash.includes('/edit/') ? 'Edit Medication' : 'Add Medication' },
  '#/medication-detail': { back: true, title: () => resolveMedNameFromHash(), actions: [] },
  '#/interaction-checker': { back: '#/medications', title: 'Interaction Guard' },
  '#/appointments': { eyebrow: 'Clinical Calendar', title: 'Appointments', actions: [{ id: 'calendar', icon: CALENDAR_ICON, href: '#/calendar', label: 'Full calendar', style: 'ghost' }, { id: 'add-appt', icon: PLUS_ICON, label: 'New appointment', style: 'accent' }] },
  '#/calendar': { back: true, eyebrow: 'Health Progress', title: 'Calendar', actions: [{ id: 'toggle-view', icon: CHEVRON_ICON, label: 'Toggle view', style: 'ghost' }] },
  '#/reports': { back: '#/dashboard', eyebrow: 'Health Progress', title: 'Health Reports', skeleton: false },
  '#/medical-history': { back: true, title: 'Medical History', actions: [{ id: 'add-history', icon: PLUS_ICON, label: 'Add record', style: 'ghost' }] },
  '#/clinical-ledger': { eyebrow: 'PATIENT STATE', title: 'Clinical Ledger', actions: [{ id: 'add-record', icon: PLUS_ICON, label: 'Add record', style: 'accent', href: '#/add-record' }] },
  '#/add-record': { back: '#/clinical-ledger', eyebrow: 'PATIENT STATE', title: 'Add Record', skeleton: false },

  '#/emergency': { back: true, eyebrow: 'Critical', title: 'Emergency Hub' },
  '#/peer-hub': { eyebrow: 'P2P NETWORK', title: 'The Handshake' },
  '#/peer-dashboard': { back: true, eyebrow: 'Remote Node', title: () => resolvePeerNameFromState() },
  '#/settings': { eyebrow: 'Configuration', title: 'System Profile' },
  '#/admin': { back: true, eyebrow: 'Super-User Console', title: 'Admin Portal' },
  '#/scan': { hidden: true },
  '#/scan/3d': { hidden: true },
  '#/scan/result': { hidden: true },
  '#/orchestrator': { back: true, title: 'Orchestrator' }
};

// â”€â”€â”€ App â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class App {
  constructor() {
    this.viewport = document.getElementById('app-viewport');
    this.router   = new Router(ROUTES, this.viewport);
    this.appHeader = new AppHeader();
    this.glassNav = new GlassNavbar();
    this.contextSwitcher = new ContextSwitcher();
    this.ghostFluid = null; // Track WebGL instance

    /** Tracks whether the first auth-state event has resolved. */
    this._authReady = false;
  }

  handleWidgetDeepLinks() {
    const url = window.location.href;
    if (url.includes('medcheck://medications/today')) {
      console.log('[App] Intercepted widget deep link: medications/today');
      window.location.hash = '#/medications/today';
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    } else if (url.includes('medcheck://emergency')) {
      console.log('[App] Intercepted widget deep link: emergency');
      window.location.hash = '#/emergency';
      window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
    }
  }

  async init() {
    // Intercept early deep links
    const urlParams = new URLSearchParams(window.location.search);
    const connectPeerId = urlParams.get('connect');
    if (connectPeerId) {
        const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
        if (!isStandaloneMode) {
            sessionStorage.setItem('pending_peer_connect', connectPeerId);
            window.location.hash = '#/install';
            window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
        }
    }

    // Intercept Widget Deep Links
    this.handleWidgetDeepLinks();

    // Initialize Widget Publisher
    WidgetPublisher.getInstance().init();

    // â”€â”€â”€ PWA NATIVE STANDARDS â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    hapticEngine.init();
    
    // Register Service Worker and Boot PWA Install Manager (Non-blocking)
    if ('serviceWorker' in navigator) {
      (async () => {
        try {
          const BASE_PATH = window.location.hostname === 'harsha-e.github.io' ? '/Medical-PWA-v2' : '';
          const reg = await navigator.serviceWorker.register(`${BASE_PATH}/sw.js`);
          
          await navigator.serviceWorker.ready;




          
          this.pwaManager = new PwaInstallManager();

          if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then(permission => {
              if (permission === 'granted') {
                console.log('[App] Notification permission granted.');
              }
            });
          }
        } catch (err) {
          console.error('[Service Worker] Registration failed:', err);
        }
      })();
    } else {
      this.pwaManager = new PwaInstallManager();
    }
    
    // 1. Initialize Clinical Engines in the background (Non-blocking)
    (async () => {
      try {
        const { initMedicalDatabase } = await import('./core/db.js');
        await initMedicalDatabase();
        
        // Unlock Router on Pipeline Error
        window.addEventListener('scan:pipeline-error', (e) => {
            console.warn(`[App][Router] Pipeline failed, unlocking scanner state. Reason: ${e.detail}`);
            window.medcareAlertLock = false;
            window.isScanning = false;
            
            // Remove freezing classes from document body if present
            document.body.classList.remove('pointer-events-none');
        });

        // Fallback for unhandled rejections that might be pipeline related
        window.addEventListener('unhandledrejection', (event) => {
            if (event.reason && event.reason.message && event.reason.message.includes('Pipeline')) {
                console.warn('[App][Router] Unhandled pipeline rejection: Forcing router unlock.');
                window.medcareAlertLock = false;
                window.isScanning = false;
                document.body.classList.remove('pointer-events-none');
            }
        });
        await interactionGraph.initialize();
        const indexRes = await fetch('./data/drug-index.json');
        const drugIndex = JSON.parse(JSON.stringify(await indexRes.json()));
        await nlpContext.hydrate(drugIndex);

        // MIOS: Synchronize Medicine Knowledge Graph on startup
        console.log('[App] Synchronizing Medicine Knowledge Graph...');
        await datasetSyncManager.syncAll();

        // Initialize PeerMesh Sandbox background sync
        window.familyMesh = new PeerMeshV2((incomingData) => {
            console.log("Family member updated their medicine cabinet!", incomingData);
            // This will later be wired into IndexedDB or KnowledgeGraph
        });

        // Immediately trigger connection if deep link is present and app is installed
        if (connectPeerId) {
            const isStandaloneMode = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
            if (isStandaloneMode) {
                if (typeof window.familyMesh.connect === 'function') {
                    window.familyMesh.connect(connectPeerId);
                } else if (typeof window.familyMesh.connectToFamilyMember === 'function') {
                    window.familyMesh.connectToFamilyMember(connectPeerId);
                } else if (typeof window.familyMesh.connectToPeer === 'function') {
                    window.familyMesh.connectToPeer(connectPeerId);
                }
                window.location.hash = '#/peer-hub';
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
            }
        }
      } catch (err) {
        console.error('Failed to boot clinical engines:', err);
      }
    })();

    // Inject Rose-Gold theme onto the viewport
    this.viewport.classList.add('theme-rose-gold');

    // Handle view:ready event for skeleton and dynamic titles
    document.addEventListener('view:ready', (e) => {
      if (e.detail && e.detail.title) {
        this.appHeader.setTitle(e.detail.title);
      }
      // Re-configure without skeleton when ready
      const hashToUse = e.detail && e.detail.hash ? e.detail.hash : null;
      const hashConfig = HEADER_CONFIGS[hashToUse] || { hidden: true };
      this.appHeader.configure({ ...hashConfig, skeleton: false });
    });

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
    
    // Developer Tool support for Device Mode toggling (Desktop <-> Mobile)
    let lastUserAgent = navigator.userAgent;
    window.addEventListener('resize', () => {
      if (navigator.userAgent !== lastUserAgent) {
        lastUserAgent = navigator.userAgent;
        if (this._authReady) {
            // Force a hash reset if stuck on install but no longer mobile
            const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            if (window.location.hash === '#/install' && (!isMobileUA || window.innerWidth >= 1024)) {
                window.location.hash = '#/dashboard';
            } else {
                this.runGuard();
            }
        }
      }
    });

    state.subscribe(() => {
      if (this._authReady) this.runGuard();
    });
    
    // Global window.appState binding
    window.appState = state;
    
    // Handle Global Profile Context Switching (Family Hub)
    window.addEventListener('medcare:profile-context-changed', (e) => {
      console.log('[App] Global context switched to:', e.detail ? e.detail.name : 'Self');
      const currentHash = window.location.hash || '#/';
      this.appHeader.configure(HEADER_CONFIGS[currentHash]);
      this.router.handleRouteChange();
    });

    // Listen to Firebase Auth state
    onAuthStateChanged(auth, this.onAuthStateChanged.bind(this));
    
    // Listen for network connectivity changes
    this.initNetworkStatusIndicator();
  }

  updateCaregiverModeUI() {
    let header = document.getElementById('caregiver-header');
    if (!header) {
      header = document.createElement('div');
      header.id = 'caregiver-header';
      header.className = 'fixed top-0 left-0 right-0 z-[10000] bg-[var(--danger-crimson,#7f2f5d)] text-[#fefcff] font-mono text-xs uppercase font-bold tracking-widest py-3 px-6 flex items-center justify-between shadow-2xl transition-transform duration-300 -translate-y-full';
      header.innerHTML = `
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full bg-red-400 animate-ping"></span>
          <span id="caregiver-header-text">🔴 CAREGIVER MODE ACTIVE</span>
        </div>
        <button id="exit-caregiver-btn" class="bg-[#ffb88c] text-[#0a0407] font-bold px-3 py-1 rounded-full text-[10px] hover:bg-white transition-all">
          Exit Caregiver Mode
        </button>
      `;
      document.body.appendChild(header);

      const exitBtn = header.querySelector('#exit-caregiver-btn');
      if (exitBtn) {
        exitBtn.onclick = () => {
          if (window.appState) window.appState.setProfileContext(null);
          else state.setProfileContext(null);
          window.location.reload();
        };
      }
    }

    const viewport = document.getElementById('app-viewport');
    const activeContext = state.activeProfileContext;
    
    if (activeContext) {
      const textEl = header.querySelector('#caregiver-header-text');
      
      // Dynamic Name Fetching from IndexedDB (cross-referencing db.family)
      const peerId = typeof activeContext === 'string' ? activeContext : (activeContext.id || activeContext);
      let contextName = activeContext.name || 'Remote Record';
      
      db.family.where('peerId').equals(peerId).first().then(familyMember => {
        if (familyMember && familyMember.name) {
          contextName = familyMember.name;
        }
        if (textEl) textEl.textContent = `🔴 CAREGIVER MODE: Watching ${contextName}'s screen!`;
      }).catch(err => {
        if (textEl) textEl.textContent = `🔴 CAREGIVER MODE: Watching ${contextName}'s screen!`;
      });
      
      header.classList.remove('-translate-y-full');
      
      if (viewport) {
        viewport.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.3s ease, border 0.3s ease';
        viewport.style.transform = 'scale(0.96)';
        viewport.style.borderRadius = '24px';
        viewport.style.border = '4px solid var(--danger-crimson, #e63946)';
        viewport.style.boxShadow = '0 0 30px rgba(127, 47, 93, 0.6)';
        viewport.style.overflow = 'hidden';
      }
    } else {
      header.classList.add('-translate-y-full');
      if (viewport) {
        viewport.style.transition = 'transform 0.3s ease, box-shadow 0.3s ease, border-radius 0.3s ease, border 0.3s ease';
        viewport.style.transform = 'scale(1)';
        viewport.style.borderRadius = '0px';
        viewport.style.border = 'none';
        viewport.style.boxShadow = 'none';
      }
    }
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
          await state.hydrate(user); // Must be strictly awaited
          
          // TRIGGER SYNC HERE (do not await to avoid blocking boot)
          const syncManager = new OfflinePersistenceManager();
          syncManager.synchronize().catch(e => console.error('[Sync] Failed:', e));
          
          // Check for QR deep links once hydrated
          setTimeout(() => {
              if (window.familyMesh) {
                  QRManager.checkDeepLink(window.familyMesh);
              }
          }, 500);
        } else {
          state.clear();
        }
      } catch (err) {
        console.error('[Auth Error]', err);
      } finally {
      
      // Init PortalLayout for Caregiver mode
      portalLayout.init();

        this._authReady = true;
        this.runGuard(); 

        // CRITICAL: Absolutely force the splash screen to die no matter what happens.
        const splash = document.getElementById('splash-screen');
        if (splash) {
            splash.style.opacity = '0';
            splash.style.pointerEvents = 'none';
            setTimeout(() => splash.remove(), 50); // Fast load fix
        }
        if (this.viewport) {
            this.viewport.style.opacity = '1';
            this.viewport.style.display = 'block';
        }
    }
  }

  // â”€â”€â”€ Navigation guard â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

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
    const p = (profile && profile.profile) ? profile.profile : {};
    const hasAllDetails = !!(p.phone && p.bloodType && p.dob && p.emergencyName && p.emergencyPhone);
    const hasAvatar = !!(p.avatar);
    // If onboardingComplete flag is true OR the user already has all required details in Firebase, consider them complete
    const isComplete = (profile && profile.onboardingComplete) || hasAllDetails;

    // ————————————————— Managed by individual views (GhostFluid instantiation removed) —————————————————

    // ————————————————— Navbar visibility —————————————————
    const showNav = !HIDE_NAV_ROUTES.has(hash);
    if (this.glassNav && typeof this.glassNav.setVisibility === 'function') {
      this.glassNav.setVisibility(showNav);
    }

    // â”€â”€ AppHeader visibility â”€â”€
    // ——— AppHeader visibility ———
    const headerConfig = HEADER_CONFIGS[hash] ?? { hidden: true };
    // Show skeleton immediately for async views
    const needsSkeleton = ['#/dashboard', '#/reports', '#/appointments'].includes(hash);
    this.appHeader.configure({ ...headerConfig, skeleton: needsSkeleton });

    // ─── Manage Pill Docking and Layout ───
    if (user && isComplete && hash !== '#/install' && !headerConfig.hidden) {
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
    
    document.body.setAttribute('data-route', hash.split('?')[0]);

    // ─── Auth guard ───
    // App installation requirement
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    
    console.debug(`[App Guard] 🛡️ Evaluating Route: "${hash}"`);
    console.debug(`[App Guard] 📊 State => Mobile: ${isMobile}, Standalone: ${isStandalone}, User: ${!!user}, Admin: ${isAdmin}, Onboarding Complete: ${isComplete}`);

    if (!isStandalone && isMobile && window.innerWidth < 1024) {
      if (hash !== '#/install') {
        console.debug(`[App Guard] 🚫 Non-standalone mobile web blocked. Redirecting to #/install...`);
        window.location.hash = '#/install';
        return;
      }
      // Force render install view and bypass auth checks
      console.debug(`[App Guard] ✅ Allowing render of #/install bypassing auth checks.`);
      this.router.handleRoute();
      return;
    }

    if (!user) {
      if (!PUBLIC_ROUTES.has(hash)) {
        console.debug(`[App Guard] 🚫 Unauthorized access to "${hash}". Redirecting to #/landing...`);
        window.location.hash = '#/landing';
        return;
      }
    } else {
      if (isAdmin) {
        if (hash !== '#/admin') {
          console.debug(`[App Guard] 👑 Admin User detected. Forcing redirect to #/admin...`);
          window.location.hash = '#/admin';
          return;
        }
      } else {
        const needsOnboarding = !isComplete;

        if (needsOnboarding && hash !== '#/onboarding') {
          console.debug(`[App Guard] 📝 Incomplete profile detected. Redirecting to #/onboarding...`);
          window.location.hash = '#/onboarding';
          return;
        }
        if (!needsOnboarding && (PUBLIC_ROUTES.has(hash) || hash === '#/onboarding')) {
          console.debug(`[App Guard] 🔄 Authenticated user attempting to access public/onboarding route. Redirecting to #/dashboard...`);
          window.location.hash = '#/dashboard';
          return;
        }
      }
    }

    // Guard passed — render the current hash
    console.debug(`[App Guard] ✅ Guard passed for "${hash}". Handing off to Router...`);
    this.router.handleRoute();
  }
}

// â”€â”€â”€ Bootstrap â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const app = new App();
app.init();

export default app;