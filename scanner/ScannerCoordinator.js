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
     * Initializes the camera and begins the scanning loop
     */
    async startScanner(videoElement, onStateChange) {
        try {
            this.cameraStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
            });
            videoElement.srcObject = this.cameraStream;
            this.isActive = true;
            this.onStateChangeCallback = onStateChange;
            
            console.log('[ScannerCoordinator] Camera started. Initiating frame loop.');
            this.processFrameLoop(videoElement);
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

    /**
     * The main execution loop processing video frames
     */
    async processFrameLoop(videoElement) {
        if (!this.isActive) return;

        // In a real implementation, we would extract the frame via canvas
        // and pass it to OpenCV.js or a WebWorker for contour detection.
        // Mocking the CV contour detection here:
        const mockContourData = {
            boundingBox: { x: 100, y: 200, width: 800, height: 300 }
        };

        const lockState = objectLockEngine.processFrame(mockContourData);

        if (this.onStateChangeCallback) {
            this.onStateChangeCallback({
                state: lockState.locked ? 'locked' : 'searching',
                message: lockState.message,
                boundingBox: lockState.boundingBox
            });
        }

        if (lockState.locked) {
            // If we just locked, initialize the coverage tracker
            if (coverageTracker.getCoveragePercentage() === 0) {
                coverageTracker.initialize(lockState.boundingBox);
            }
            
            // Here we would extract the foil crop and send to OCR
            // For now, we simulate coverage progress
            coverageTracker.updateCoverage(
                { x: Math.random() * 800, y: Math.random() * 300, width: 100, height: 50 }, 
                0.85
            );
        }

        // Request next frame (using timeout to avoid maxing out CPU in mock)
        setTimeout(() => {
            requestAnimationFrame(() => this.processFrameLoop(videoElement));
        }, 100);
    }
}

export const scannerCoordinator = new ScannerCoordinator();
