import db from '../core/db.js';
import state from '../core/state.js';

export default class ClinicalDashboard {
  constructor() {
    this.container = null;
  }

  async render() {
    this.container = document.createElement('div');
    this.container.className = 'w-full h-full min-h-screen relative font-sans overflow-y-auto overflow-x-hidden pt-24';

    const userName = (state.userProfile?.name || state.user?.displayName || 'User').split(' ')[0].toUpperCase();
    const todayStr = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }).toUpperCase();

    const styles = `
      <style>
        .dashboard-root {
          padding: 32px 20px 120px 20px;
          max-width: 600px;
          margin: 0 auto;
        }
        .unified-card {
          background: rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(24px) saturate(150%);
          -webkit-backdrop-filter: blur(24px) saturate(150%);
          border-radius: 32px;
          box-shadow: 
            16px 16px 32px rgba(0, 0, 0, 0.5),
            inset 4px 4px 12px rgba(255, 255, 255, 0.05),
            inset -4px -4px 12px rgba(0, 0, 0, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.04);
          padding: 24px;
          margin-bottom: 24px;
          position: relative;
          z-index: 10;
          transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .dashed-box {
          border: 1px dashed rgba(255, 255, 255, 0.15);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          background: rgba(0, 0, 0, 0.3);
          box-shadow: inset 0 5px 15px rgba(0, 0, 0, 0.8);
        }
        .solid-box {
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 20px;
          padding: 24px;
          text-align: center;
          background: linear-gradient(180deg, rgba(255,255,255,0.02) 0%, rgba(0,0,0,0.2) 100%);
          box-shadow: 
              inset 0 1px 1px rgba(255, 255, 255, 0.05),
              0 8px 20px rgba(0, 0, 0, 0.5);
        }
        .mini-btn {
          padding: 8px 20px;
          border-radius: 999px;
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-top: 1px solid rgba(255, 255, 255, 0.15);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.9);
          background: linear-gradient(145deg, #22121b, #0f070b);
          box-shadow: 
            0 4px 10px rgba(0, 0, 0, 0.5),
            inset 0 1px 1px rgba(255, 255, 255, 0.1);
          transition: all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1);
        }
        .mini-btn:active {
          transform: scale(0.95) translateY(2px);
          box-shadow: 
            0 1px 2px rgba(0, 0, 0, 0.8),
            inset 0 4px 10px rgba(0, 0, 0, 0.9);
          background: #0a0407;
          border-top: 1px solid rgba(255, 255, 255, 0.02);
        }
        .divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.05);
          box-shadow: 0 1px 0 rgba(0, 0, 0, 0.5);
          margin: 16px 0;
        }
        .text-copper { color: #ffb88c; }
        .text-muted { color: rgba(255, 255, 255, 0.4); }
        .text-xs-track { 
          font-size: 10px; 
          text-transform: uppercase; 
          letter-spacing: 0.1em; 
          font-weight: 800; 
        }
      </style>
    `;

    this.container.innerHTML = `
      ${styles}
      <!-- Gradient background layer -->
      <div class="fixed inset-0 z-0 pointer-events-none" style="background: radial-gradient(circle at 100% 0%, rgba(255, 184, 140, 0.12) 0%, transparent 50%), radial-gradient(circle at 0% 100%, rgba(127, 47, 93, 0.08) 0%, transparent 50%) #0a0407;"></div>
      <!-- Frosted glass blur layer just like header -->
      <div class="fixed inset-0 z-[1] pointer-events-none backdrop-blur-3xl bg-[#0a0407]/40"></div>
      
      <div class="dashboard-root relative z-10 pt-4">
        
        <!-- Card 1: Taking Medicines -->
        <div class="unified-card">
          <div class="flex justify-between items-start mb-4">
            <div>
              <div class="text-xs-track text-white mb-1.5">Taking Medicines</div>
              <div class="text-[10px] text-muted uppercase font-bold tracking-widest">${todayStr}</div>
            </div>
            <div class="text-[10px] text-white/60 font-bold uppercase tracking-widest mt-1">No Schedule</div>
          </div>
          <div class="divider"></div>
          <div class="dashed-box flex flex-col items-center justify-center mt-2">
            <div class="text-[10px] text-muted font-bold tracking-widest uppercase mb-2">No Scheduled Doses Today.</div>
            <div class="text-[10px] text-white font-bold tracking-widest uppercase">Add Medication</div>
          </div>
        </div>

        <!-- Card 2: No Scheduled -->
        <div class="unified-card flex flex-col items-center py-7">
          <div class="w-12 h-12 rounded-full border border-white/5 border-t-white/10 flex items-center justify-center mb-4 bg-black/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8),0_2px_10px_rgba(255,184,140,0.05)]">
            <div class="w-4 h-[2px] bg-white/50 rounded-full shadow-[0_1px_2px_rgba(0,0,0,0.5)]"></div>
          </div>
          <div class="text-[10px] text-white font-bold tracking-widest uppercase">No Scheduled Medicines Today</div>
        </div>

        <!-- Card 3: Monthly Follow-up -->
        <div class="unified-card pb-6">
          <div class="text-xs-track text-white mb-4">Monthly Health Follow-up</div>
          <div class="divider mb-6"></div>
          
          <div class="flex justify-between items-center mb-5">
            <div>
              <div class="text-sm text-white font-bold mb-1.5">HbA1c Level</div>
              <div class="text-[10px] text-muted font-medium">Last test: Never</div>
            </div>
            <button class="mini-btn">Add</button>
          </div>
          <div class="divider my-5"></div>

          <div class="flex justify-between items-center mb-5">
            <div>
              <div class="text-sm text-white font-bold mb-1.5">Blood Pressure</div>
              <div class="text-[10px] text-muted font-medium">Last reading: Never</div>
            </div>
            <button class="mini-btn">Add</button>
          </div>
          <div class="divider my-5"></div>

          <div class="flex justify-between items-center">
            <div>
              <div class="text-sm text-white font-bold mb-1.5">Thyroid (TSH)</div>
              <div class="text-[10px] text-muted font-medium">Last test: Never</div>
            </div>
            <button class="mini-btn">Add</button>
          </div>
        </div>

        <!-- Card 4: Health Progress -->
        <div class="unified-card pb-8">
          <div class="text-xs-track text-white mb-4">Health Progress</div>
          <div class="divider mb-6"></div>

          <div class="flex justify-between items-center mb-3">
            <div class="text-[10px] text-white font-bold tracking-widest uppercase">Taking Medicines This Week</div>
            <div class="text-[10px] text-white font-bold tracking-widest uppercase">0 / 0</div>
          </div>
          <div class="h-2 w-full bg-black/60 rounded-full mb-6 overflow-hidden border border-white/5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.9)]">
            <div class="h-full bg-gradient-to-r from-copper/60 to-copper w-0 rounded-full shadow-[0_0_10px_rgba(255,184,140,0.5)]"></div>
          </div>
          <div class="divider my-5"></div>

          <div class="flex justify-between items-center mb-6">
            <div class="text-[10px] text-white font-bold tracking-widest uppercase">Reports Added This Year</div>
            <div class="text-[10px] text-white font-bold tracking-widest uppercase">0 Reports</div>
          </div>
          <div class="divider my-5"></div>

          <div class="text-[10px] text-white font-bold tracking-widest uppercase mb-4">Health Journey (HbA1c)</div>
          <div class="solid-box flex flex-col items-center justify-center py-10">
            <div class="text-[10px] text-white font-bold tracking-widest uppercase">No HbA1c Records Yet</div>
          </div>
        </div>

        <!-- Card 5: Family Updates -->
        <div class="unified-card pb-8">
          <div class="flex justify-between items-center mb-4">
            <div class="text-xs-track text-white">Family Updates</div>
            <div class="text-[10px] text-white/50 font-bold tracking-widest uppercase">Manage Network</div>
          </div>
          <div class="divider mb-6"></div>
          <div class="flex flex-col items-center justify-center py-4">
            <div class="text-[10px] text-muted font-bold tracking-widest uppercase mb-2.5">No Active Family Nodes</div>
            <div class="text-[10px] text-white/40 font-bold tracking-widest uppercase">Add Family Member</div>
          </div>
        </div>

        <!-- Card 6: Recent Reports -->
        <div class="unified-card flex justify-between items-center py-5">
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full border border-white/5 border-t-white/10 flex items-center justify-center bg-black/40 shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]">
              <svg class="w-5 h-5 text-white/60 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            </div>
            <div>
              <div class="text-[10px] text-white font-bold tracking-widest uppercase mb-1">Recent Reports</div>
              <div class="text-[10px] text-muted font-medium">0 reports added this month</div>
            </div>
          </div>
          <div class="text-[10px] text-white font-bold tracking-widest uppercase">View</div>
        </div>

      </div>
    `;

    document.dispatchEvent(new CustomEvent('view:ready', { detail: { hash: '#/dashboard', title: 'Dashboard' } }));
    return this.container;
  }
}
