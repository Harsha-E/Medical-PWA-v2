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
     */
    static generateConnectQR(containerElement, peerId) {
        if (typeof QRCode === 'undefined') {
            console.error("[QRManager] QRCode library missing.");
            return;
        }

        containerElement.innerHTML = ''; // Clear existing
        const deepLink = `${this.getBaseUrl()}?connect=${peerId}`;

        new QRCode(containerElement, {
            text: deepLink,
            width: 200,
            height: 200,
            colorDark: "#000000",
            colorLight: "#ffffff",
            correctLevel: QRCode.CorrectLevel.H
        });

        // Add a visual hash code below it for manual entry
        const hashDisplay = document.createElement('div');
        hashDisplay.style.cssText = "margin-top: 15px; font-family: monospace; color: #1e90ff; font-weight: bold; font-size: 1.1rem; letter-spacing: 2px;";
        hashDisplay.innerText = peerId;
        containerElement.appendChild(hashDisplay);
    }

    /**
     * Call this in your app.js on boot to check if the user scanned a QR code
     */
    static checkDeepLink(peerMeshInstance) {
        const urlParams = new URLSearchParams(window.location.search);
        const targetPeer = urlParams.get('connect');

        if (targetPeer) {
            console.log(`[QRManager] 🔗 Deep link detected! Attempting to connect to: ${targetPeer}`);
            
            // Clean up the URL so it doesn't try to reconnect on page refresh
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Trigger the connection in the mesh
            if (peerMeshInstance && typeof peerMeshInstance.connectToPeer === 'function') {
                peerMeshInstance.connectToPeer(targetPeer); // Our peer mesh has connectToPeer
            } else {
                console.error("[QRManager] peerMeshInstance not provided or missing connectToPeer method.");
            }
        }
    }
}
