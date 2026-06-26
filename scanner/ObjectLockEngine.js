import { worldModel } from '../services/intelligence/WorldModel.js';
import { entityLifecycleManager, EntityState } from '../services/intelligence/EntityLifecycleManager.js';
import { scanTelemetryLogger } from '../services/analytics/ScanTelemetryLogger.js';

export const LockState = {
    UNLOCKED: 'UNLOCKED',
    LOCKED: 'LOCKED',
    UNSTABLE: 'UNSTABLE',
    LOST: 'LOST',
    REACQUIRED: 'REACQUIRED'
};

export class ObjectLockEngine {
    constructor() {
        this.frameHistory = [];
        this.LOCK_THRESHOLD = 5; 
        this.STABILITY_TOLERANCE = 0.05; // 5% variance allowed
        this.LOST_THRESHOLD = 15; // 15 frames without object = totally lost
        
        this.currentState = LockState.UNLOCKED;
        this.lockedBoundingBox = null;
        this.framesSinceLastSeen = 0;
        
        this.activeEntityId = null;
    }

    /**
     * Process contour data to determine physical lock state and drive WorldModel lifecycle.
     */
    processFrame(contourData) {
        if (!contourData || !contourData.boundingBox) {
            this.framesSinceLastSeen++;
            
            if (this.framesSinceLastSeen > this.LOST_THRESHOLD) {
                this._transitionTo(LockState.LOST);
            } else if (this.currentState === LockState.LOCKED) {
                this._transitionTo(LockState.UNSTABLE);
            }
            return { locked: false, state: this.currentState, message: 'No object detected' };
        }

        // Object seen
        this.framesSinceLastSeen = 0;
        const bbox = contourData.boundingBox;
        this.frameHistory.push(bbox);

        if (this.frameHistory.length > this.LOCK_THRESHOLD) {
            this.frameHistory.shift(); 
        }

        const isStable = this.checkStability();

        if (isStable) {
            this.lockedBoundingBox = this.averageBoundingBoxes(this.frameHistory);
            
            if (this.currentState === LockState.UNLOCKED) {
                this._transitionTo(LockState.LOCKED);
            } else if (this.currentState === LockState.UNSTABLE || this.currentState === LockState.LOST) {
                this._transitionTo(LockState.REACQUIRED);
            }
            
            return { 
                locked: true, 
                state: this.currentState,
                boundingBox: this.lockedBoundingBox,
                message: 'Particle lock achieved'
            };
        } else {
            if (this.currentState === LockState.LOCKED) {
                this._transitionTo(LockState.UNSTABLE);
            }
            return { 
                locked: false, 
                state: this.currentState,
                message: 'Stabilize camera' 
            };
        }
    }

    /**
     * Checks if bounding box variance is within tolerance across frame history.
     */
    checkStability() {
        if (this.frameHistory.length < this.LOCK_THRESHOLD) return false;

        const reference = this.frameHistory[0];
        for (let i = 1; i < this.frameHistory.length; i++) {
            const current = this.frameHistory[i];
            const areaRef = reference.width * reference.height;
            const areaCur = current.width * current.height;
            
            if (Math.abs(areaCur - areaRef) / areaRef > this.STABILITY_TOLERANCE) return false;
            
            const xVar = Math.abs(current.x - reference.x) / reference.width;
            const yVar = Math.abs(current.y - reference.y) / reference.height;
            if (xVar > this.STABILITY_TOLERANCE || yVar > this.STABILITY_TOLERANCE) return false;
        }
        return true;
    }

    _transitionTo(newState) {
        if (this.currentState === newState) return;
        console.log(`[ObjectLockEngine] State changed: ${this.currentState} -> ${newState}`);
        this.currentState = newState;

        // Drive WorldModel Lifecycle based on physical lock
        if (newState === LockState.LOCKED || newState === LockState.REACQUIRED) {
            if (!this.activeEntityId) {
                // Initialize scan session & entity
                const entity = worldModel.createEntity('UNKNOWN_OBJECT');
                this.activeEntityId = entity.id;
                entityLifecycleManager.startLifecycle(this.activeEntityId);
                
                // Initialize Telemetry
                const sessionId = `scan-${Date.now()}`;
                scanTelemetryLogger.startSession(sessionId, 'UNKNOWN_OBJECT');
                console.log(`[ObjectLockEngine] Created WorldModel Entity: ${this.activeEntityId}`);
            } else {
                // Return to active scanning
                entityLifecycleManager.forceState(this.activeEntityId, EntityState.SCANNING);
            }
        } 
        else if (newState === LockState.LOST) {
            if (this.activeEntityId) {
                // User completely dropped the object or moved camera away
                entityLifecycleManager.forceState(this.activeEntityId, EntityState.ARCHIVED);
                console.log(`[ObjectLockEngine] Archived WorldModel Entity (Object Lost)`);
                this.activeEntityId = null; // Reset for next scan
            }
        }
    }

    averageBoundingBoxes(boxes) {
        const avg = boxes.reduce((acc, box) => {
            acc.x += box.x; acc.y += box.y; acc.width += box.width; acc.height += box.height;
            return acc;
        }, { x: 0, y: 0, width: 0, height: 0 });

        return {
            x: avg.x / boxes.length,
            y: avg.y / boxes.length,
            width: avg.width / boxes.length,
            height: avg.height / boxes.length
        };
    }

    resetLock() {
        this.frameHistory = [];
        this.currentState = LockState.UNLOCKED;
        this.lockedBoundingBox = null;
        this.framesSinceLastSeen = 0;
        if (this.activeEntityId) {
            entityLifecycleManager.forceState(this.activeEntityId, EntityState.ARCHIVED);
            this.activeEntityId = null;
        }
    }
}

export const objectLockEngine = new ObjectLockEngine();
