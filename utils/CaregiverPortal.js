/**
 * CaregiverPortal.js
 * Manages the UI transformation when entering a family member's mutual access portal.
 */

export default class CaregiverPortal {
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

        // 2. Inject the Sticky Pill Header
        let header = document.getElementById('caregiver-portal-header');
        if (!header) {
            header = document.createElement('div');
            header.id = 'caregiver-portal-header';
            header.style.cssText = `
                position: fixed; top: 15px; left: 50%; transform: translateX(-50%);
                z-index: 100000; display: flex; align-items: center; gap: 15px;
                padding: 10px 20px; border-radius: 30px; font-family: 'Inter', sans-serif;
                font-weight: bold; cursor: pointer; backdrop-filter: blur(20px);
                box-shadow: 0 10px 30px rgba(0,0,0,0.5);
            `;
            document.body.appendChild(header);
        }

        header.style.background = `${themeColor}30`;
        header.style.border = `1px solid ${themeColor}`;
        header.style.color = themeColor;
        
        header.innerHTML = `
            <span>👁️ Managing: ${peerName}</span>
            <div style="background: ${themeColor}; color: #000; padding: 2px 10px; border-radius: 12px; font-size: 0.8rem;">Exit</div>
        `;

        // Click to exit portal and return to your own timeline
        header.onclick = () => this.exitPortal();
    }

    static exitPortal() {
        window.activeProfileContext = 'self';
        
        // Remove borders and shadows
        document.body.style.border = 'none';
        document.body.style.boxShadow = 'none';
        
        // Remove header
        const header = document.getElementById('caregiver-portal-header');
        if (header) header.remove();

        console.log("[Portal] Exited Caregiver Mode. Returned to Self context.");
    }
}
