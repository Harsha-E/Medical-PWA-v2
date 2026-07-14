/**
 * CaregiverPortal.js
 * Manages the UI transformation when entering a family member's mutual access portal.
 */

export default class CaregiverPortal {
    // Audit Trail: Wraps the payload with identity/time data
    static signPayload(data, actorId) {
        return {
            ...data,
            audit_trail: {
                actorId: actorId,
                timestamp: new Date().toISOString(),
                nodeId: navigator.userAgent.substring(0, 20), // Placeholder for device ID
                integrityHash: btoa(unescape(encodeURIComponent(JSON.stringify(data) + Date.now()))) // Simple proof of submission, Unicode safe
            }
        };
    }

    // Clinical Idle Timeout Engine
    static createIdleTimer(onTimeout) {
        let timeoutId;
        const idleDuration = 180000; // 3 minutes in ms
        const warnDuration = 15000; // 15 seconds warning

        const reset = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(onTimeout, idleDuration);
            
            // Update UI progress bar if it exists
            const pb = document.getElementById('session-progress');
            if (pb) {
                // Reset width to 100% instantly
                pb.style.transition = 'none';
                pb.style.width = '100%';
                pb.style.backgroundColor = '#3b82f6'; // Reset to blue
                
                // Force reflow
                void pb.offsetWidth;
                
                // Start shrink animation
                pb.style.transition = `width ${idleDuration}ms linear`;
                pb.style.width = '0%';
                
                // Set timeout for red fade warning
                clearTimeout(this._warnTimeoutId);
                this._warnTimeoutId = setTimeout(() => {
                    pb.style.transition = `width ${warnDuration}ms linear, background-color 0.5s ease`;
                    pb.style.backgroundColor = '#ef4444'; // Fade to red
                }, idleDuration - warnDuration);
            }
        };

        const activityEvents = ['mousemove', 'keydown', 'touchstart'];
        activityEvents.forEach(evt => window.addEventListener(evt, reset));

        reset(); // Start immediately

        return () => {
            activityEvents.forEach(evt => window.removeEventListener(evt, reset));
            clearTimeout(timeoutId);
            clearTimeout(this._warnTimeoutId);
        };
    }

    /**
     * Deterministic color generator based on the hash/PeerID
     */
    static getPeerColor(peerId) {
        let hash = 0;
        for (let i = 0; i < peerId.length; i++) {
            hash = peerId.charCodeAt(i) + ((hash << 5) - hash);
        }
        const hue = Math.abs(hash % 360);
        return `hsl(${hue}, 80%, 60%)`; // Always returns the exact same bright color for that ID
    }

    /**
     * Enters the portal. Wraps the app in a colored border and adds a sticky header.
     */
    static enterPortal(peerId, peerName) {
        window.activeProfileContext = peerId; // Set the global target for the scanner/timeline
        const themeColor = this.getPeerColor(peerId);

        // 1. Add the glowing border to the entire app body
        document.body.style.border = `4px solid ${themeColor}`;
        document.body.style.boxShadow = `inset 0 0 30px ${themeColor}40`; // 40 is hex for 25% opacity
        document.body.style.transition = 'all 0.4s ease';
        
        // Push content down so the banner doesn't cover the screen
        document.body.style.paddingTop = '50px';

        // 2. Inject the Sticky Header
        let header = document.getElementById('caregiver-portal-header');
        if (!header) {
            header = document.createElement('div');
            header.id = 'caregiver-portal-header';
            header.style.cssText = `
                position: fixed; top: 0; left: 0; width: 100%; z-index: 10000;
                display: flex; align-items: center; justify-content: space-between;
                padding: 10px 15px; font-family: 'Inter', sans-serif;
                backdrop-filter: blur(20px); background-color: rgba(15, 20, 30, 0.9);
                border-bottom: 2px solid ${themeColor};
                box-shadow: 0 4px 20px rgba(0,0,0,0.3);
            `;
            
            // The session progress bar at the top of the header
            const pb = document.createElement('div');
            pb.id = 'session-progress';
            pb.style.cssText = `
                position: absolute; bottom: -2px; left: 0; height: 2px; width: 100%;
                background-color: ${themeColor};
            `;
            header.appendChild(pb);
            
            const content = document.createElement('div');
            content.style.cssText = `display: flex; align-items: center; gap: 15px; width: 100%; justify-content: space-between;`;
            content.id = 'caregiver-portal-content';
            header.appendChild(content);

            document.body.appendChild(header);
        }

        header.style.borderBottom = `2px solid ${themeColor}`;
        
        const content = document.getElementById('caregiver-portal-content');
        if (content) {
            // Using the user's requested layout for the banner
            content.innerHTML = `
                <div class="text-white font-bold text-sm uppercase tracking-wider flex items-center gap-2">
                    <span>👁️</span> 
                    <span>Managing: <span id="portal-banner-name" style="color: ${themeColor}">${peerName}</span></span>
                </div>
                <button id="exit-portal-btn" class="bg-red-500/20 text-red-300 border border-red-500/50 px-4 py-1.5 rounded font-bold text-xs uppercase tracking-widest active:scale-95 transition-all">
                    Exit
                </button>
            `;
        }

        // Click to exit portal and return to your own timeline
        const exitBtn = document.getElementById('exit-portal-btn');
        if (exitBtn) {
            exitBtn.onclick = (e) => {
                e.stopPropagation();
                this.exitPortal();
            };
        }

        // 3. Initialize the Idle Timer
        if (this._cleanupTimer) this._cleanupTimer(); // Cleanup existing if any
        this._cleanupTimer = this.createIdleTimer(() => {
            console.warn("[Portal] Idle timeout reached. Exiting Caregiver Mode to prevent data cross-contamination.");
            this.exitPortal();
        });
    }

    static exitPortal() {
        window.activeProfileContext = 'self';
        
        // Remove borders and shadows
        document.body.style.border = 'none';
        document.body.style.boxShadow = 'none';
        document.body.style.paddingTop = '0';
        
        // Remove header
        const header = document.getElementById('caregiver-portal-header');
        if (header) header.remove();

        // Cleanup timer
        if (this._cleanupTimer) {
            this._cleanupTimer();
            this._cleanupTimer = null;
        }

        console.log("[Portal] Exited Caregiver Mode. Returned to Self context.");
        
        // If we are on a page that depends on activeProfileContext, we might want to redirect to dashboard
        if (window.location.hash !== '#/dashboard') {
            window.location.hash = '#/dashboard';
        }
    }
}
