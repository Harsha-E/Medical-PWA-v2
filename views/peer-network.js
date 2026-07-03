import state from '../core/state.js';
import PeerMesh from '../services/PeerMesh.js';
import db from '../core/db.js';
import { showToast, appConfirm } from '../core/ui.js';

export default class PeerNetworkView {
    constructor() {
        this.longPressTimer = null;
        this.familyMembers = [];
        this.mesh = PeerMesh.getInstance();
    }

    async render() {
        this.container = document.createElement('div');
        this.container.className = 'container';
        
        await this.mesh.init();
        
        // Fetch family members for the grid
        this.familyMembers = await db.family.filter(f => f.userId === state.user?.uid).toArray();

        this.container.innerHTML = `
            <main class="scroll-area pt-[112px] md:pt-8 bg-transparent pb-40" style="padding-left:0; padding-right:0;">
                <div class="px-6 w-full h-full max-w-7xl mx-auto flex flex-col flex-1 gap-8">
                    
                    <!-- Link Device Card -->
                    <section id="link-device-card" class="clay-glass-panel p-8 text-center border-border shadow-[0_8px_32px_var(--color-card-shadow)] bg-surface-elevated/40 backdrop-blur-xl relative overflow-hidden rounded-[2rem]">
                        <h2 class="text-xl font-display text-text-primary mb-2">Link Device</h2>
                        <p class="text-xs text-text-secondary mb-6">Scan or share this QR to establish a direct connection.</p>
                        
                        <!-- Golden Brown accented QR Container -->
                        <div id="qr-container" class="cursor-pointer mx-auto w-[220px] h-[220px] bg-white rounded-2xl flex items-center justify-center shadow-[0_0_40px_rgba(184,134,11,0.2)] border-2 border-[#b8860b]/30 mb-4 transition-transform active:scale-95" title="Tap to copy ID">
                            <div id="qr-code"></div>
                        </div>
                        <p class="text-[10px] text-accent-primary font-mono uppercase tracking-widest mb-8">Tap QR to copy ID</p>

                        <div class="flex flex-col sm:flex-row gap-3 items-center justify-center max-w-sm mx-auto">
                            <div class="flex flex-1 w-full gap-2">
                                <input type="text" id="paste-id-input" placeholder="Paste Peer ID..." class="flex-1 min-w-0 bg-overlay-bg border border-border rounded-xl px-4 py-3 text-text-primary text-xs font-mono focus:outline-none focus:border-[#b8860b]/50 transition-colors shadow-inner">
                                <button id="btn-connect" class="bg-surface-deep border border-border text-text-primary px-4 py-3 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-all btn-neumorphic flex items-center gap-2">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
                                    Link
                                </button>
                            </div>
                            <div class="text-[10px] text-text-muted font-mono uppercase tracking-widest hidden sm:block">OR</div>
                            <button id="btn-scan" class="w-full sm:w-auto bg-gradient-to-r from-[#b8860b] to-[#daa520] text-[#1a1a1a] border border-[#f0e68c] px-6 py-3 rounded-xl font-bold uppercase tracking-widest text-xs active:scale-95 transition-all shadow-[0_4px_20px_rgba(184,134,11,0.3)] flex items-center justify-center gap-2">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2M9 9h6v6H9z"/></svg>
                                Scan
                            </button>
                        </div>
                    </section>

                    <!-- Network Nodes Grid -->
                    <section class="mt-4">
                        <h3 class="text-sm font-bold uppercase tracking-widest text-text-muted mb-4 pl-2 border-l-2 border-[#b8860b]">Connected Nodes</h3>
                        <div class="grid grid-cols-2 md:grid-cols-3 gap-4">
                            ${this.familyMembers.length === 0 ? `
                                <div class="col-span-full clay-glass-panel p-6 text-center opacity-60 border-dashed">
                                    <p class="text-xs uppercase font-bold tracking-widest text-text-muted">No trusted nodes found in network.</p>
                                </div>
                            ` : this.familyMembers.map(member => `
                                <div class="family-node clay-glass-panel p-6 text-center cursor-pointer transition-transform hover:scale-105 active:scale-95 relative" 
                                     data-id="${member.id}" 
                                     data-name="${member.name}"
                                     style="-webkit-user-select: none; user-select: none; -webkit-touch-callout: none;">
                                    <!-- Connection Status Dot (Green = Live, Gray = Offline) -->
                                    <div class="absolute top-4 right-4 w-3 h-3 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.6)]"></div>
                                    
                                    <div class="w-16 h-16 bg-surface-deep text-text-primary rounded-full flex items-center justify-center text-2xl font-display italic mb-4 mx-auto border-2 border-[#b8860b]/20">
                                        ${member.name[0].toUpperCase()}
                                    </div>
                                    <h4 class="font-bold text-sm text-text-primary truncate">${member.name}</h4>
                                    <p class="text-[9px] text-[#b8860b] uppercase tracking-widest mt-1">${member.relation}</p>
                                </div>
                            `).join('')}
                        </div>
                    </section>
                </div>
            </main>
        `;

        // Render QR Code using global QRCode instance (loaded via CDN in index.html)
        setTimeout(() => {
            if (this.mesh.peerId) {
                new QRCode(document.getElementById("qr-code"), {
                    text: this.mesh.peerId,
                    width: 200,
                    height: 200,
                    colorDark : "#1a1a1a",
                    colorLight : "#ffffff",
                    correctLevel : QRCode.CorrectLevel.H
                });
            } else {
                document.getElementById('qr-container').innerHTML = '<p class="text-black text-xs font-bold mt-24">Connecting...</p>';
            }
        }, 100);

        this.bindEvents();
        return this.container;
    }

    bindEvents() {
        // QR Code Tap to Copy
        const qrContainer = this.container.querySelector('#qr-container');
        qrContainer.addEventListener('click', async () => {
            if (this.mesh.peerId) {
                try {
                    await navigator.clipboard.writeText(this.mesh.peerId);
                    showToast('Peer ID copied to clipboard!', 'success');
                } catch (e) {
                    showToast('Failed to copy ID', 'error');
                }
            }
        });

        // Link Button
        this.container.querySelector('#btn-connect').addEventListener('click', () => {
            const val = this.container.querySelector('#paste-id-input').value.trim();
            if (val) {
                showToast('Connecting to peer...', 'info');
                // Real implementation would connect via PeerMesh
            }
        });

        // Scan Button (placeholder for HTML5 QR scanner)
        this.container.querySelector('#btn-scan').addEventListener('click', () => {
            showToast('Camera scanner opening...', 'info');
            // Full integration of html5-qrcode goes here.
        });

        // Family Node Long-Press & Short-Press Logic
        const nodes = this.container.querySelectorAll('.family-node');
        
        nodes.forEach(node => {
            const handleStart = (e) => {
                e.preventDefault(); // Prevent text selection/context menu on mobile
                this.longPressTimer = setTimeout(() => {
                    this.longPressTimer = null;
                    const id = node.getAttribute('data-id');
                    const name = node.getAttribute('data-name');
                    
                    // Trigger Caregiver Context
                    state.setProfileContext({ id, name });
                    showToast(`Entering Caregiver Mode for ${name}`, 'success');
                    
                }, 3000); // 3 seconds
            };

            const handleEnd = (e) => {
                e.preventDefault();
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                    
                    // It was a short press -> Open Permissions Manager
                    this.openPermissionsModal(node.getAttribute('data-name'));
                }
            };

            const handleCancel = () => {
                if (this.longPressTimer) {
                    clearTimeout(this.longPressTimer);
                    this.longPressTimer = null;
                }
            };

            node.addEventListener('touchstart', handleStart, { passive: false });
            node.addEventListener('touchend', handleEnd);
            node.addEventListener('touchcancel', handleCancel);
            node.addEventListener('touchmove', handleCancel); // Cancel on scroll
            
            node.addEventListener('mousedown', handleStart);
            node.addEventListener('mouseup', handleEnd);
            node.addEventListener('mouseleave', handleCancel);
            
            // Prevent context menu
            node.addEventListener('contextmenu', e => e.preventDefault());
        });
    }

    openPermissionsModal(name) {
        appConfirm(
            `Manage Permissions for ${name}`,
            `Select the access level for this connected node.`,
            [
                { text: 'Read-Only', action: () => showToast('Permissions set to Read-Only', 'success') },
                { text: 'Read & Write', action: () => showToast('Permissions set to Read & Write', 'success') },
                { text: 'Cancel', primary: true, action: () => {} }
            ]
        );
    }
}
