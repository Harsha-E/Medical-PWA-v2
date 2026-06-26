import { objectLockEngine } from './ObjectLockEngine.js';
import { coverageTracker } from './CoverageTracker.js';

export class ScannerCoordinator {
    constructor() {
        this.isActive = false;
        this.cameraStream = null;
        this.onFrameCallback = null;
        this.onStateChangeCallback = null;
    }

    /**
     * Initializes the camera without continuous background scanning
     */
    async startScanner(videoElement, onStateChange, facingMode = 'environment') {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: facingMode, width: { ideal: 1920 }, height: { ideal: 1080 } } 
            });
            videoElement.srcObject = this.cameraStream;
            this.isActive = true;
            this.onStateChangeCallback = onStateChange;
            
            console.log('[ScannerCoordinator] Camera started in manual capture mode.');
            
            // Notify UI that camera is ready
            if (this.onStateChangeCallback) {
                this.onStateChangeCallback({ state: 'ready' });
            }
            
            return true;
        } catch (error) {
            console.error('[ScannerCoordinator] Failed to start camera:', error);
            if (this.onStateChangeCallback) {
                this.onStateChangeCallback({ state: 'error', message: 'Camera access denied' });
            }
            return false;
        }
    }

    stopScanner() {
        this.isActive = false;
        if (this.cameraStream) {
            this.cameraStream.getTracks().forEach(track => track.stop());
            this.cameraStream = null;
        }
        objectLockEngine.resetLock();
    }
}

export const scannerCoordinator = new ScannerCoordinator();
