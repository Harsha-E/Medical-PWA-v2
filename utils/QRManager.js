/**
 * QRManager.js
 * Generates Google Lens-compatible QR codes and parses deep links.
 * Requires: <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
 */

export default class QRManager {
    static getBaseUrl() {
        // Deployed GitHub Pages URL or local development fallback
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return `${window.location.protocol}//${window.location.host}${window.location.pathname}`;
        }
        return 'https://harsha-e.github.io/Medical-PWA-v2/';
    }

    /**
     * Generates a QR code on a canvas element that points to the deep link
     * Now uses an encrypted/JSON Base64 payload instead of just peerId
     */
    static generateConnectQR(containerElement, peerId, installationId, deviceName) {
        if (typeof QRCode === 'undefined') {
            console.error("[QRManager] QRCode library missing.");
            return;
        }

        containerElement.innerHTML = ''; // Clear existing
        
        // Construct a static, permanent JSON payload (Safe because connections still require manual approval)
        const payload = {
            id: peerId,
            installationId: installationId || 'unknown_install',
            name: deviceName || 'Unknown Device',
            supportedProtocols: [2]
        };

        const base64Payload = btoa(JSON.stringify(payload));
        const deepLink = `${this.getBaseUrl()}?connect_v2=${base64Payload}`;

        new QRCode(containerElement, {
            text: deepLink,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.M // Lower error correction for larger payloads to keep it readable
        });
    }

    /**
     * Call this in your app.js on boot to check if the user scanned a QR code via native camera
     */
    static checkDeepLink(peerMeshInstance) {
        const urlParams = new URLSearchParams(window.location.search);
        let targetPeer = urlParams.get('connect'); // Legacy
        let payloadV2 = urlParams.get('connect_v2');

        if (payloadV2) {
            console.log(`[QRManager] 🔗 Deep link V2 detected!`);
            try {
                const decoded = JSON.parse(atob(payloadV2));
                
                // Trigger connection passing the full payload for the mesh to validate
                window.history.replaceState({}, document.title, window.location.pathname);
                if (peerMeshInstance && typeof peerMeshInstance.connectToFamilyMember === 'function') {
                    peerMeshInstance.connectToFamilyMember(decoded.id, decoded);
                }
                return;
            } catch(e) {
                console.error('[QRManager] Failed to decode V2 payload', e);
            }
        } else if (targetPeer) {
            console.log(`[QRManager] 🔗 Deep link detected! Attempting to connect to: ${targetPeer}`);
            window.history.replaceState({}, document.title, window.location.pathname);
            
            if (peerMeshInstance) {
                if (typeof peerMeshInstance.connectToFamilyMember === 'function') {
                    peerMeshInstance.connectToFamilyMember(targetPeer, { id: targetPeer, installationId: 'legacy' });
                }
            } else {
                console.error("[QRManager] peerMeshInstance not provided.");
            }
        }
    }
}
