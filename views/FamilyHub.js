/**
 * @fileoverview Family Hub & Mesh Synchronization View for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Peer-to-Peer WebRTC Sync, Offline-First.
 * Note: Add `<script defer src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>` to index.html for QR generation.
 * Note: Add `<script defer src="https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js"></script>` to index.html for QR scanning.
 */

import { globalStore } from '../core/store.js';
import { globalRouter } from '../core/router.js';
import { dbEngine } from '../services/DatabaseEngine.js';
import { meshNetwork } from '../services/MeshNetwork.js';
import { Utils } from '../core/utils.js';

// ============================================================================
// CONSTANTS
// ============================================================================
const AUTO_SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const SCAN_INTERVAL_MS = 500; // 500ms between camera frame grabs

export default class FamilyHub {
    /** @private {string} Active tab identifier ('qr' or 'connect') */
    static _activeTab = 'qr';
    /** @private {boolean} Tracks network initialization state */
    static _isNetworkReady = false;
    /** @private {boolean} Tracks auto-sync toggle state */
    static _isAutoSync = false;
    /** @private {number|null} Auto-sync interval handle */
    static _autoSyncTimer = null;
    /** @private {string|null} Last successful sync timestamp */
    static _lastSyncTime = null;
    /** @private {Function|null} Network sync detachment closure */
    static _syncUnsubscribe = null;
    
    // Camera State
    /** @private {MediaStream|null} */
    static _cameraStream = null;
    /** @private {number|null} */
    static _scanInterval = null;

    /**
     * Initializes the view, sets up the network, and injects the UI.
     * @param {HTMLElement} container - The target viewport DOM element.
     * @returns {Promise<void>}
     */
    static async render(container) {
        if (!container) return;

        this._activeTab = 'qr';
        this._renderLayoutShell(container);
        this._bindStaticEvents(container);

        await this._initNetwork(container);
        this._setupConnectionListeners(container);
    }

    /**
     * Mounts the foundational HTML layout and scoped CSS.
     * @private
     * @param {HTMLElement} container 
     */
    static _renderLayoutShell(container) {
        const scopedCSS = `
            <style id="family-hub-styles">
                .hub-header { position: sticky; top: 0; z-index: var(--z-overlay); background: var(--clr-bg); padding-bottom: var(--sp-2); margin-bottom: var(--sp-2); }
                .hub-top-bar { display: flex; align-items: center; margin-bottom: var(--sp-3); padding-top: var(--sp-2); }
                
                .tab-bar { display: flex; border-bottom: 1px solid var(--clr-border-80); margin-bottom: var(--sp-4); }
                .nav-tab { flex: 1; text-align: center; padding: var(--sp-2) 0; font-size: var(--fs-sm); font-weight: 600; color: var(--clr-text-lo); cursor: pointer; border-bottom: 3px solid transparent; transition: all var(--time-fast) ease; }
                .nav-tab--active { color: var(--clr-accent); border-bottom-color: var(--clr-accent); }

                .tab-content { display: none; flex-direction: column; gap: var(--sp-4); animation: fadeIn var(--time-base) ease forwards; }
                .tab-content--active { display: flex; }

                .qr-card { background: #FFFFFF; border-radius: var(--radius-lg); padding: var(--sp-4); display: flex; flex-direction: column; align-items: center; box-shadow: var(--shadow-sm); border: 1px solid var(--clr-border-80); margin-bottom: var(--sp-2); }
                .qr-placeholder { width: 200px; height: 200px; background: var(--clr-glass-52); display: flex; align-items: center; justify-content: center; color: var(--clr-text-lo); border-radius: var(--radius-sm); border: 1px dashed var(--clr-border-80); }
                
                .peer-id-box { display: flex; align-items: center; justify-content: space-between; background: var(--clr-glass-52); border: 1px solid var(--clr-border-80); border-radius: var(--radius-md); padding: var(--sp-1-5) var(--sp-3); width: 100%; margin-top: var(--sp-4); }
                .peer-id-text { font-family: ui-monospace, monospace; font-size: var(--fs-sm); color: var(--clr-text-hi); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }

                .status-indicator { display: inline-flex; align-items: center; gap: var(--sp-1); font-size: var(--fs-xs); font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; }
                .status-dot { width: 8px; height: 8px; border-radius: var(--radius-full); }
                .status-dot--online { background: var(--clr-success); box-shadow: 0 0 8px var(--clr-success); }
                .status-dot--offline { background: var(--clr-text-lo); }

                .peer-card { display: flex; align-items: center; justify-content: space-between; padding: var(--sp-2) var(--sp-3); background: var(--clr-glass-60); border: 1px solid var(--clr-border-80); border-radius: var(--radius-md); margin-bottom: var(--sp-2); box-shadow: var(--shadow-sm); }
                
                .camera-view { width: 100%; height: 240px; background: #000000; border-radius: var(--radius-lg); overflow: hidden; position: relative; margin-bottom: var(--sp-4); display: none; }
                .camera-view--active { display: block; }
                .camera-video { width: 100%; height: 100%; object-fit: cover; }
                .camera-overlay { position: absolute; inset: 0; border: 2px solid rgba(255,255,255,0.3); border-radius: var(--radius-lg); box-shadow: 0 0 0 4000px rgba(0,0,0,0.5); pointer-events: none; }
                
                .sync-panel { background: var(--clr-glass-65); border: 1px solid var(--clr-border-88); border-radius: var(--radius-xl); padding: var(--sp-4); box-shadow: var(--shadow-md); margin-top: var(--sp-4); display: none; }
                .sync-panel--visible { display: block; animation: slideUp var(--time-enter) ease forwards; }

                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(var(--sp-2)); } to { opacity: 1; transform: translateY(0); } }
                
                /* Toggle Switch */
                .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
                .toggle-switch input { opacity: 0; width: 0; height: 0; }
                .toggle-slider { position: absolute; cursor: pointer; inset: 0; background-color: var(--clr-glass-85); transition: var(--time-fast); border-radius: var(--radius-full); border: 1px solid var(--clr-border-80); }
                .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 2px; bottom: 2px; background-color: var(--clr-text-lo); transition: var(--time-fast); border-radius: var(--radius-full); }
                input:checked + .toggle-slider { background-color: var(--clr-accent-light); border-color: var(--clr-accent); }
                input:checked + .toggle-slider:before { transform: translateX(20px); background-color: var(--clr-accent); }
                input:focus-visible + .toggle-slider { outline: 2px solid var(--clr-accent); outline-offset: 2px; }
            </style>

            <div class="view-panel view-enter">
                <div class="hub-header">
                    <div class="hub-top-bar">
                        <button id="hub-back-btn" class="btn-icon" aria-label="Go Back" style="border-radius: var(--radius-full); margin-right: var(--sp-3);">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>
                        </button>
                        <h1 class="typography-h2" style="margin: 0;">Family Hub</h1>
                    </div>

                    <div class="tab-bar">
                        <div class="nav-tab nav-tab--active" data-tab="qr">My QR Code</div>
                        <div class="nav-tab" data-tab="connect">Connect to Device</div>
                    </div>
                </div>

                <div id="tab-qr" class="tab-content tab-content--active">
                    <div class="qr-card">
                        <p class="typography-caption text-md mb-4 text-center">Show this QR code to a family member's device to establish a secure link.</p>
                        
                        <div id="qr-render-target" class="qr-placeholder">
                            <span class="typography-caption">Initializing...</span>
                        </div>
                        
                        <div class="peer-id-box">
                            <span id="display-peer-id" class="peer-id-text">Loading ID...</span>
                            <button id="btn-copy-id" class="btn-icon" style="width: 32px; height: 32px; border: none; box-shadow: none;" aria-label="Copy Peer ID">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                            </button>
                        </div>
                    </div>

                    <div class="flex-between mt-2 mb-4">
                        <div id="network-status" class="status-indicator text-muted">
                            <div class="status-dot status-dot--offline"></div> Offline
                        </div>
                        <button id="btn-refresh-qr" class="btn btn-ghost" style="height: 32px; padding: 0 var(--sp-2); font-size: 12px;">Refresh ID</button>
                    </div>

                    <h3 class="typography-label text-hi mb-2">Connected Peers</h3>
                    <div id="connected-peers-list">
                        <p class="typography-caption text-muted text-center py-4">No active connections.</p>
                    </div>
                </div>

                <div id="tab-connect" class="tab-content">
                    <h3 class="typography-h3 mb-2">Scan QR Code</h3>
                    <p class="typography-caption text-muted mb-4">Use your camera to scan a family member's MedCare QR code.</p>
                    
                    <button id="btn-open-camera" class="btn btn-secondary w-full mb-4">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path><circle cx="12" cy="13" r="4"></circle></svg>
                        Open Camera to Scan
                    </button>

                    <div id="camera-container" class="camera-view">
                        <video id="scan-video" class="camera-video" playsinline autoplay muted></video>
                        <div class="camera-overlay"></div>
                    </div>
                    <canvas id="scan-canvas" style="display: none;"></canvas>

                    <div class="divider"></div>

                    <h3 class="typography-h3 mb-2">Manual Entry</h3>
                    <p class="typography-caption text-muted mb-4">Alternatively, paste the unique Peer ID provided by their device.</p>
                    
                    <div class="input-group">
                        <input type="text" id="manual-peer-id" class="input-field" placeholder="Enter Peer ID...">
                    </div>
                    <button id="btn-connect-manual" class="btn btn-primary w-full">Connect to Peer</button>
                </div>

                <div id="sync-panel" class="sync-panel">
                    <div class="flex-between mb-4">
                        <h3 class="typography-h3 text-hi">Synchronization</h3>
                        <span id="sync-count-badge" class="badge badge--success">0 Synced</span>
                    </div>
                    
                    <div class="flex-between mb-4">
                        <span class="typography-body text-md">Auto-Sync (5m)</span>
                        <label class="toggle-switch">
                            <input type="checkbox" id="toggle-auto-sync">
                            <span class="toggle-slider"></span>
                        </label>
                    </div>

                    <button id="btn-sync-now" class="btn btn-primary w-full mb-3">Sync Data Now</button>
                    <p id="sync-timestamp" class="typography-caption text-muted text-center">Last synced: Never</p>
                </div>
            </div>
        `;
        container.innerHTML = scopedCSS;
    }

    /**
     * Binds UI events that do not depend on the network payload.
     * @private
     * @param {HTMLElement} container 
     */
    static _bindStaticEvents(container) {
        const backBtn = Utils.qs('#hub-back-btn', container);
        const tabs = Utils.qsAll('.nav-tab', container);
        const copyBtn = Utils.qs('#btn-copy-id', container);
        const refreshBtn = Utils.qs('#btn-refresh-qr', container);
        const connectManualBtn = Utils.qs('#btn-connect-manual', container);
        const openCameraBtn = Utils.qs('#btn-open-camera', container);
        const syncNowBtn = Utils.qs('#btn-sync-now', container);
        const autoSyncToggle = Utils.qs('#toggle-auto-sync', container);

        if (backBtn) {
            Utils.on(backBtn, 'click', () => {
                this._stopCamera();
                globalRouter.back();
            });
        }

        tabs.forEach(tab => {
            Utils.on(tab, 'click', (e) => {
                const target = e.currentTarget.getAttribute('data-tab');
                this._switchTab(container, target);
            });
        });

        if (copyBtn) Utils.on(copyBtn, 'click', () => this._copyPeerId());
        if (refreshBtn) Utils.on(refreshBtn, 'click', () => this._initNetwork(container, true));
        
        if (connectManualBtn) Utils.on(connectManualBtn, 'click', () => this._connectManual(container));
        if (openCameraBtn) Utils.on(openCameraBtn, 'click', () => this._startCamera(container));

        if (syncNowBtn) Utils.on(syncNowBtn, 'click', () => this._performSync(container));
        
        if (autoSyncToggle) {
            Utils.on(autoSyncToggle, 'change', (e) => {
                this._isAutoSync = e.target.checked;
                this._handleAutoSyncState(container);
            });
        }
    }

    /**
     * Toggles visibility between the QR and Connection tabs.
     * @private
     * @param {HTMLElement} container 
     * @param {string} targetTab - 'qr' or 'connect'
     */
    static _switchTab(container, targetTab) {
        this._activeTab = targetTab;
        
        Utils.qsAll('.nav-tab', container).forEach(t => t.classList.remove('nav-tab--active'));
        Utils.qs(`.nav-tab[data-tab="${targetTab}"]`, container).classList.add('nav-tab--active');
        
        Utils.qsAll('.tab-content', container).forEach(c => c.classList.remove('tab-content--active'));
        Utils.qs(`#tab-${targetTab}`, container).classList.add('tab-content--active');

        // Halt camera if navigating away from connect tab
        if (targetTab === 'qr') {
            this._stopCamera();
            Utils.qs('#camera-container', container).classList.remove('camera-view--active');
        }
    }

    /**
     * Bootstraps the MeshNetwork, handles failures, and updates the local QR display.
     * @private
     * @param {HTMLElement} container 
     * @param {boolean} forceRefresh - If true, severs active connections to force a new ID.
     */
    static async _initNetwork(container, forceRefresh = false) {
        const idDisplay = Utils.qs('#display-peer-id', container);
        const statusInd = Utils.qs('#network-status', container);
        
        try {
            if (forceRefresh) {
                meshNetwork.disconnect();
                this._isNetworkReady = false;
            }

            if (!this._isNetworkReady) {
                if (statusInd) statusInd.innerHTML = `<div class="status-dot status-dot--offline"></div> Connecting...`;
                await meshNetwork.init();
                this._isNetworkReady = true;
            }

            const payloadStr = meshNetwork.generateQRPayload();
            const localId = meshNetwork.getLocalId();

            if (idDisplay) idDisplay.textContent = localId;
            if (statusInd) {
                statusInd.classList.replace('text-muted', 'text-success');
                statusInd.innerHTML = `<div class="status-dot status-dot--online"></div> Listening`;
            }

            this._renderQRCode(container, payloadStr);
            this._updateSyncPanel(container);

        } catch (error) {
            console.error('[FamilyHub] Network instantiation failed:', error);
            if (idDisplay) idDisplay.textContent = 'Network Offline';
            if (statusInd) {
                statusInd.classList.replace('text-success', 'text-muted');
                statusInd.innerHTML = `<div class="status-dot status-dot--offline"></div> Offline`;
            }
            Utils.showToast('Could not initialize peer network. Check connection.', 'error');
        }
    }

    /**
     * Subscribes to incoming connection events from the MeshNetwork layer.
     * @private
     * @param {HTMLElement} container 
     */
    static _setupConnectionListeners(container) {
        // Detach existing listeners if re-rendering
        if (this._syncUnsubscribe) this._syncUnsubscribe();

        // Listen for standard generic data syncs
        this._syncUnsubscribe = meshNetwork.onSync(async (resolvedRecords) => {
            try {
                const count = resolvedRecords.length;
                if (count > 0) {
                    // Requires dbEngine.upsertFromSync to be implemented, fallback to standard mapping if not
                    if (typeof dbEngine.upsertFromSync === 'function') {
                        await dbEngine.upsertFromSync(resolvedRecords);
                    } else {
                        console.warn('[FamilyHub] upsertFromSync missing. Applying manual iteration.');
                        // Stub resolution: Iterate and insert directly if bulk method absent
                        for (const rec of resolvedRecords) {
                            if (rec.table === 'medications') await dbEngine.addMedication(rec.data);
                        }
                    }
                    Utils.showToast(`Received ${count} updates from family device.`, 'info');
                    
                    this._lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    this._updateSyncPanel(container);
                }
            } catch (err) {
                console.error('[FamilyHub] Incoming synchronization failed:', err);
            }
        });

        // Listen for connection state changes (requires window event dispatch from MeshNetwork)
        window.addEventListener('peer_connected', () => this._updateSyncPanel(container));
        window.addEventListener('mesh_status', () => this._updateSyncPanel(container));
        
        // Interval polling to ensure UI reflects dropped connections
        setInterval(() => this._updateSyncPanel(container), 3000);
    }

    /**
     * Evaluates active tunnels and conditionally displays the Sync Panel.
     * @private
     * @param {HTMLElement} container 
     */
    static _updateSyncPanel(container) {
        const panel = Utils.qs('#sync-panel', container);
        const countBadge = Utils.qs('#sync-count-badge', container);
        const listTarget = Utils.qs('#connected-peers-list', container);
        const timeTarget = Utils.qs('#sync-timestamp', container);
        
        if (!panel || !listTarget) return;

        let activePeers = [];
        try { activePeers = meshNetwork.getConnectedPeers(); } catch(e) {}

        if (activePeers.length > 0) {
            panel.classList.add('sync-panel--visible');
            if (countBadge) countBadge.textContent = `${activePeers.length} Linked`;
            
            // Render Peer List
            listTarget.innerHTML = activePeers.map(peer => `
                <div class="peer-card">
                    <div class="flex items-center gap-2">
                        <div class="status-dot status-dot--online"></div>
                        <div>
                            <p class="typography-label text-hi mb-0" style="margin-bottom: 0;">${Utils.sanitizeString(peer.deviceName || 'Family Device')}</p>
                            <p class="typography-caption text-muted mb-0" style="margin-bottom: 0;">ID: ${peer.peerId.substring(0, 8)}...</p>
                        </div>
                    </div>
                    <button class="btn btn-ghost text-danger btn-disconnect" data-id="${peer.peerId}" style="height: 28px; padding: 0 8px; font-size: 11px;">Disconnect</button>
                </div>
            `).join('');

            // Bind disconnect buttons
            Utils.qsAll('.btn-disconnect', listTarget).forEach(btn => {
                Utils.on(btn, 'click', (e) => {
                    const pid = e.currentTarget.getAttribute('data-id');
                    meshNetwork.disconnect(pid);
                    this._updateSyncPanel(container);
                });
            });

        } else {
            panel.classList.remove('sync-panel--visible');
            listTarget.innerHTML = `<p class="typography-caption text-muted text-center py-4">No active connections.</p>`;
        }

        if (timeTarget) {
            timeTarget.textContent = this._lastSyncTime ? `Last synced: ${this._lastSyncTime}` : 'Last synced: Never';
        }
    }

    /**
     * Executes the heavy payload aggregation and broadcast sequence.
     * @private
     * @param {HTMLElement} container 
     * @returns {Promise<void>}
     */
    static async _performSync(container) {
        const btn = Utils.qs('#btn-sync-now', container);
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Syncing...';
        }

        try {
            const medications = await dbEngine.getAllMedications();
            // Fetch logs if engine supports it, fallback to empty array
            const doseLogs = typeof dbEngine.getAllDoseLogs === 'function' ? await dbEngine.getAllDoseLogs() : [];

            const syncRecords = [];
            const timestamp = Date.now();

            // Serialize data shapes into CRDT compliant objects
            medications.forEach(med => syncRecords.push({ id: med.id, table: 'medications', data: med, updatedAt: timestamp }));
            doseLogs.forEach(log => syncRecords.push({ id: log.id, table: 'doseLogs', data: log, updatedAt: timestamp }));

            if (syncRecords.length > 0) {
                const count = await meshNetwork.sendDelta(syncRecords);
                if (count > 0) {
                    Utils.showToast('Sync complete. Data distributed to family devices.', 'success');
                    this._lastSyncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    this._updateSyncPanel(container);
                } else {
                    Utils.showToast('No active peers received the sync payload.', 'warn');
                }
            } else {
                Utils.showToast('No local data available to sync.', 'info');
            }

        } catch (err) {
            console.error('[FamilyHub] Sync broadcast failed:', err);
            Utils.showToast('Synchronization error occurred.', 'error');
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Sync Data Now';
            }
        }
    }

    /**
     * Manages the activation and clearing of the automated sync polling loop.
     * @private
     * @param {HTMLElement} container 
     */
    static _handleAutoSyncState(container) {
        if (this._autoSyncTimer) {
            clearInterval(this._autoSyncTimer);
            this._autoSyncTimer = null;
        }

        if (this._isAutoSync) {
            this._autoSyncTimer = setInterval(() => {
                try {
                    const peers = meshNetwork.getConnectedPeers();
                    if (peers.length > 0) {
                        console.log('[FamilyHub] Executing automated background sync cycle.');
                        this._performSync(container);
                    }
                } catch(e) {}
            }, AUTO_SYNC_INTERVAL_MS);
            Utils.showToast('Auto-sync enabled.', 'success');
        }
    }

    /**
     * Reads the manual input field and commands the mesh network to establish a tunnel.
     * @private
     * @param {HTMLElement} container 
     * @returns {Promise<void>}
     */
    static async _connectManual(container) {
        const input = Utils.qs('#manual-peer-id', container);
        const btn = Utils.qs('#btn-connect-manual', container);
        if (!input || !btn) return;

        const targetId = input.value.trim();
        if (!targetId) {
            Utils.showToast('Please enter a valid Peer ID.', 'warn');
            return;
        }

        btn.disabled = true;
        btn.textContent = 'Connecting...';

        try {
            await meshNetwork.connectToPeer(targetId);
            Utils.showToast('Connected!', 'success');
            input.value = '';
            this._switchTab(container, 'qr');
        } catch (err) {
            console.warn('[FamilyHub] Tunnel request rejected or timed out.', err);
            Utils.showToast('Could not reach device. Make sure both are online and the ID is correct.', 'error');
        } finally {
            btn.disabled = false;
            btn.textContent = 'Connect to Peer';
        }
    }

    /**
     * Uses the native Clipboard API to copy the local peer ID.
     * @private
     */
    static _copyPeerId() {
        try {
            const localId = meshNetwork.getLocalId();
            navigator.clipboard.writeText(localId)
                .then(() => Utils.showToast('Peer ID copied to clipboard.', 'success'))
                .catch(() => Utils.showToast('Failed to copy ID.', 'error'));
        } catch(e) {
            Utils.showToast('Network not ready.', 'warn');
        }
    }

    /**
     * Draws the generated connection payload to the DOM. Utilizes QRCode.js if available,
     * otherwise falls back to a structural text display.
     * @private
     * @param {HTMLElement} container 
     * @param {string} payload - JSON string containing connection metrics.
     */
    static _renderQRCode(container, payload) {
        const target = Utils.qs('#qr-render-target', container);
        if (!target) return;

        target.innerHTML = ''; // Clear existing

        if (typeof window.QRCode !== 'undefined') {
            try {
                new window.QRCode(target, {
                    text: payload,
                    width: 200,
                    height: 200,
                    colorDark: "#000000",
                    colorLight: "#ffffff",
                    correctLevel: window.QRCode.CorrectLevel.M
                });
                target.style.border = 'none'; // Remove dashed placeholder border
            } catch (err) {
                console.error('[FamilyHub] QRCode.js initialization failed:', err);
                this._renderQRFallback(target, payload);
            }
        } else {
            console.warn('[FamilyHub] QRCode.js library missing from global scope. Falling back to text display.');
            this._renderQRFallback(target, payload);
        }
    }

    /**
     * Displays a text-based fallback when graphics libraries are unreachable.
     * @private
     * @param {HTMLElement} target 
     * @param {string} payload 
     */
    static _renderQRFallback(target, payload) {
        target.innerHTML = `
            <div style="text-align: center; padding: var(--sp-2);">
                <p class="typography-caption text-danger mb-2">QR Library Missing</p>
                <p class="typography-label text-hi" style="word-break: break-all; font-size: 10px;">${Utils.sanitizeString(payload)}</p>
            </div>
        `;
    }

    /**
     * Activates the hardware camera to capture incoming QR streams.
     * @private
     * @param {HTMLElement} container 
     * @returns {Promise<void>}
     */
    static async _startCamera(container) {
        const camContainer = Utils.qs('#camera-container', container);
        const video = Utils.qs('#scan-video', container);
        const canvas = Utils.qs('#scan-canvas', container);
        const btn = Utils.qs('#btn-open-camera', container);

        if (!camContainer || !video || !canvas) return;

        try {
            if (btn) btn.style.display = 'none';
            camContainer.classList.add('camera-view--active');

            const stream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment' } 
            });
            
            this._cameraStream = stream;
            video.srcObject = stream;
            
            await video.play();

            const ctx = canvas.getContext('2d', { willReadFrequently: true });
            
            // Initiation of periodic frame analysis loop
            this._scanInterval = setInterval(() => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    canvas.height = video.videoHeight;
                    canvas.width = video.videoWidth;
                    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                    
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    
                    // Attempt read using jsQR if it exists in the global scope
                    if (typeof window.jsQR !== 'undefined') {
                        const code = window.jsQR(imageData.data, imageData.width, imageData.height, {
                            inversionAttempts: "dontInvert",
                        });
                        
                        if (code && code.data) {
                            this._handleScannedData(container, code.data);
                        }
                    } else {
                        // Fallback instructional overlay if scanning library is omitted
                        if (!this._notifiedMissingScanner) {
                            Utils.showToast('Scanner library unavailable. Please use manual entry.', 'warn');
                            this._notifiedMissingScanner = true;
                            this._stopCamera();
                            if (btn) btn.style.display = 'flex';
                            camContainer.classList.remove('camera-view--active');
                        }
                    }
                }
            }, SCAN_INTERVAL_MS);

        } catch (err) {
            console.error('[FamilyHub] Camera instantiation failed:', err);
            Utils.showToast('Camera access denied or unavailable.', 'error');
            if (btn) btn.style.display = 'flex';
            camContainer.classList.remove('camera-view--active');
        }
    }

    /**
     * Processes verified payload strings extracted from the camera scanner.
     * @private
     * @param {HTMLElement} container 
     * @param {string} dataString 
     */
    static _handleScannedData(container, dataString) {
        try {
            const payload = JSON.parse(dataString);
            if (payload && payload.peerId) {
                this._stopCamera();
                const input = Utils.qs('#manual-peer-id', container);
                if (input) input.value = payload.peerId;
                Utils.showToast('QR Code Read Successfully', 'success');
                this._connectManual(container);
            }
        } catch (e) {
            // Ignored; likely scanning an unrelated QR code.
        }
    }

    /**
     * Severs hardware media tracks and drops polling loops.
     * @private
     */
    static _stopCamera() {
        if (this._scanInterval) {
            clearInterval(this._scanInterval);
            this._scanInterval = null;
        }
        if (this._cameraStream) {
            this._cameraStream.getTracks().forEach(t => t.stop());
            this._cameraStream = null;
        }
    }
}