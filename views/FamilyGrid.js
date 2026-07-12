import app from '../app.js';
import { portalLayout } from '../components/PortalLayout.js';

export default class FamilyGrid {
  constructor() {
    this.peers = [
      { id: 'peer-1', name: 'Alice' },
      { id: 'peer-2', name: 'Bob' },
      { id: 'peer-3', name: 'Charlie' }
    ]; // Mock unassigned peers in tray
    
    this.connections = {
      Parent: [],
      Child: [],
      Spouse: [],
      Caregiver: []
    };
  }

  async render() {
    this.container = document.createElement('div');
    this.container.className = 'w-full h-[100dvh] pb-[90px] md:pb-0 flex flex-col relative overflow-hidden bg-[#0a050f] font-sans md:pl-64';
    // Infinite dotted grid
    this.container.style.backgroundImage = 'radial-gradient(rgba(255,255,255,0.1) 1px, transparent 1px)';
    this.container.style.backgroundSize = '20px 20px';

    this.container.innerHTML = `
      <!-- Grid Area (Flex 1) -->
      <div class="flex-1 relative w-full flex items-center justify-center min-h-0">
        <!-- Snap Zones Container -->
        <div class="relative w-[90vw] h-[90vw] max-w-[350px] max-h-[350px] md:max-w-[480px] md:max-h-[480px] lg:max-w-[560px] lg:max-h-[560px]">
          
          <!-- Center "ME" Orb -->
          <div class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center pointer-events-none">
            <div class="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full bg-surface shadow-[20px_20px_60px_#040206,-20px_-20px_60px_#100818] flex items-center justify-center border border-white/5 relative">
              <span class="text-lg sm:text-xl font-bold bg-gradient-to-br from-primary to-secondary bg-clip-text text-transparent">ME</span>
            </div>
          </div>

          <!-- Parents Zone (Top) -->
          <div class="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center transition-all pointer-events-auto snap-zone" data-zone="Parent">
            <span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/30 absolute -top-5 sm:-top-6">Parents</span>
            <div class="drop-target w-full h-full rounded-full flex flex-wrap items-center justify-center gap-1 p-2"></div>
          </div>

          <!-- Children Zone (Bottom) -->
          <div class="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center transition-all pointer-events-auto snap-zone" data-zone="Child">
            <span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/30 absolute -bottom-5 sm:-bottom-6">Children</span>
            <div class="drop-target w-full h-full rounded-full flex flex-wrap items-center justify-center gap-1 p-2"></div>
          </div>

          <!-- Spouse Zone (Right) -->
          <div class="absolute top-1/2 right-0 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center transition-all pointer-events-auto snap-zone" data-zone="Spouse">
            <span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/30 absolute -right-5 sm:-right-6 origin-left rotate-90 whitespace-nowrap">Spouse</span>
            <div class="drop-target w-full h-full rounded-full flex flex-wrap items-center justify-center gap-1 p-2"></div>
          </div>

          <!-- Caregiver Zone (Left) -->
          <div class="absolute top-1/2 left-0 -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center transition-all pointer-events-auto snap-zone" data-zone="Caregiver">
            <span class="text-[9px] sm:text-[10px] uppercase font-bold tracking-widest text-white/30 absolute -left-5 sm:-left-6 origin-right -rotate-90 whitespace-nowrap">Caregivers</span>
            <div class="drop-target w-full h-full rounded-full flex flex-wrap items-center justify-center gap-1 p-2"></div>
          </div>

        </div>
      </div>

      <!-- Bottom Peer Tray -->
      <div class="w-full h-32 shrink-0 bg-surface-elevated/40 backdrop-blur-xl border-t border-white/10 flex items-center px-6 overflow-x-auto gap-4 z-30" id="peer-tray">
        <div class="text-[10px] uppercase font-bold tracking-widest text-white/50 shrink-0 mr-4">Available Peers</div>
        ${this.peers.map(p => `
          <div class="peer-orb shrink-0 w-16 h-16 rounded-full bg-primary/20 border border-primary/50 flex flex-col items-center justify-center cursor-grab shadow-lg transition-transform hover:scale-110" draggable="true" data-id="${p.id}" data-name="${p.name}">
            <div class="w-6 h-6 bg-primary rounded-full mb-1"></div>
            <span class="text-[9px] uppercase font-bold tracking-widest truncate w-full text-center px-1">${p.name}</span>
          </div>
        `).join('')}
      </div>

      <!-- Manual Connection FAB -->
      <button id="manual-connect-btn" class="absolute top-24 md:top-8 right-6 md:right-8 w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg hover:scale-105 active:scale-95 transition-all z-40">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      <!-- Manual Modal -->
      <div id="manual-modal" class="hidden fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div class="bg-surface-elevated p-8 rounded-3xl border border-white/10 w-full max-w-sm">
          <h3 class="text-xl font-display mb-6 text-white">Manual Connection</h3>
          <input type="text" id="manual-peer-id" placeholder="Enter Peer ID" class="w-full bg-surface px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-white/10 text-white mb-4 text-sm font-mono focus:outline-none focus:border-primary">
          <select id="manual-relation" class="w-full bg-surface px-4 md:px-8 lg:px-12 py-3 rounded-xl border border-white/10 text-white mb-8 text-sm focus:outline-none focus:border-primary">
            <option value="Parent">Parent</option>
            <option value="Child">Child</option>
            <option value="Spouse">Spouse</option>
            <option value="Caregiver">Caregiver</option>
          </select>
          <div class="flex gap-3">
            <button id="modal-cancel" class="flex-1 px-4 md:px-8 lg:px-12 py-3 rounded-xl bg-surface text-white text-xs font-bold uppercase tracking-widest border border-white/10">Cancel</button>
            <button id="modal-connect" class="flex-1 px-4 md:px-8 lg:px-12 py-3 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest">Connect</button>
          </div>
        </div>
      </div>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/peer-hub', title: 'Family Topography' } }));
    this.attachListeners();
    return this.container;
  }

  attachListeners() {
    // Drag & Drop
    const orbs = this.container.querySelectorAll('.peer-orb');
    const zones = this.container.querySelectorAll('.snap-zone');

    orbs.forEach(orb => {
      orb.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', orb.dataset.id);
        orb.classList.add('opacity-50');
      });
      orb.addEventListener('dragend', () => {
        orb.classList.remove('opacity-50');
      });
    });

    zones.forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('bg-white/5', 'border-primary', 'scale-110');
      });
      zone.addEventListener('dragleave', () => {
        zone.classList.remove('bg-white/5', 'border-primary', 'scale-110');
      });
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('bg-white/5', 'border-primary', 'scale-110');
        const id = e.dataTransfer.getData('text/plain');
        const orb = this.container.querySelector(`[data-id="${id}"]`);
        
        if (orb) {
          const relation = zone.dataset.zone;
          this.connections[relation].push(id);
          
          // Re-style and move orb
          orb.classList.remove('w-16', 'h-16');
          orb.classList.add('w-10', 'h-10');
          orb.querySelector('.w-6').classList.replace('w-6', 'w-3');
          orb.querySelector('.h-6').classList.replace('h-6', 'h-3');
          orb.querySelector('span').classList.add('hidden'); // Hide text inside zone to save space
          
          zone.querySelector('.drop-target').appendChild(orb);
        }
      });
    });

    // Manual Modal
    const modal = this.container.querySelector('#manual-modal');
    this.container.querySelector('#manual-connect-btn')?.addEventListener('click', () => {
      modal.classList.remove('hidden');
    });
    this.container.querySelector('#modal-cancel')?.addEventListener('click', () => {
      modal.classList.add('hidden');
    });
    this.container.querySelector('#modal-connect')?.addEventListener('click', () => {
      const id = this.container.querySelector('#manual-peer-id').value;
      const relation = this.container.querySelector('#manual-relation').value;
      if (id) {
        alert(`Connected to ${id} as ${relation}!`);
        modal.classList.add('hidden');
      }
    });
  }
}
