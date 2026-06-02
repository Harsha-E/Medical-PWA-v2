import { usageAnalyticsEngine } from '../analytics/UsageAnalyticsEngine.js';
import { failureRecoveryUI } from '../experience/FailureRecoveryUI.js';

export class ScanHealthMonitor {
    constructor() {
        this.frameCounter = 0;
        this.lastFrameTime = performance.now();
        this.fpsTarget = 30; // Target frames per second
        this.fpsDropThreshold = 10; // If FPS drops below this, we intervene
        this.consecutiveLowFpsCount = 0;
    }

    /**
     * Called on every frame processed to monitor the health and performance of the scanner loop
     */
    ping() {
        this.frameCounter++;
        const now = performance.now();
        const delta = now - this.lastFrameTime;
        
        // Check FPS every second
        if (delta >= 1000) {
            const fps = Math.round((this.frameCounter * 1000) / delta);
            this.evaluatePerformance(fps);
            
            this.frameCounter = 0;
            this.lastFrameTime = now;
        }
    }

    /**
     * Determines if the system is struggling to maintain real-time performance
     */
    evaluatePerformance(fps) {
        if (fps < this.fpsDropThreshold) {
            this.consecutiveLowFpsCount++;
            console.warn(`[ScanHealthMonitor] Low FPS detected: ${fps}`);
            
            if (this.consecutiveLowFpsCount > 3) {
                // Critical performance drop - intervene
                usageAnalyticsEngine.trackMetric('critical_performance_drop', { fps: fps });
                failureRecoveryUI.displayFallback('CRITICAL_CRASH');
                this.consecutiveLowFpsCount = 0;
            }
        } else {
            this.consecutiveLowFpsCount = 0;
        }
    }
}

export const scanHealthMonitor = new ScanHealthMonitor();
