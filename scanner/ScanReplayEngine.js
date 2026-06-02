export class ScanReplayEngine {
    constructor() {
        this.currentSession = null;
        this.isPlaying = false;
        this.currentFrameIndex = 0;
    }

    /**
     * Loads a compressed diagnostic session blob (usually from a failed scan)
     * @param {Object} sessionData - The recorded frame and metadata bundle
     */
    loadSession(sessionData) {
        this.currentSession = sessionData;
        this.currentFrameIndex = 0;
        console.log(`[ScanReplayEngine] Loaded session with ${sessionData.frameCount} frames.`);
    }

    /**
     * Steps through the recorded frames to simulate the camera feed for debugging
     */
    replayNextFrame() {
        if (!this.currentSession || this.currentFrameIndex >= this.currentSession.frameCount) {
            this.isPlaying = false;
            return null;
        }

        const frame = this.currentSession.framesData[this.currentFrameIndex];
        this.currentFrameIndex++;

        // In a real environment, this frame would be dispatched to the ObjectLockEngine
        // bypassing the ScannerCoordinator's camera feed
        
        return frame;
    }

    startReplay(fps = 30) {
        this.isPlaying = true;
        const interval = 1000 / fps;
        
        const loop = setInterval(() => {
            if (!this.isPlaying) {
                clearInterval(loop);
                return;
            }
            
            const frame = this.replayNextFrame();
            if (!frame) {
                console.log('[ScanReplayEngine] Replay finished.');
                clearInterval(loop);
            }
        }, interval);
    }
}

export const scanReplayEngine = new ScanReplayEngine();
