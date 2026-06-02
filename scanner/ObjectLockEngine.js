export class ObjectLockEngine {
    constructor() {
        this.frameHistory = [];
        this.LOCK_THRESHOLD = 5; // Frames required for a stable lock
        this.STABILITY_TOLERANCE = 0.05; // 5% variance in bounding box allowed
        
        this.isLocked = false;
        this.lockedBoundingBox = null;
    }

    /**
     * Process a raw frame or contour data to determine lock status.
     * @param {Object} contourData - Detected contours or bounding box from CV layer
     */
    processFrame(contourData) {
        if (!contourData || !contourData.boundingBox) {
            this.resetLock();
            return { locked: false, message: 'No object detected' };
        }

        const bbox = contourData.boundingBox;
        this.frameHistory.push(bbox);

        if (this.frameHistory.length > this.LOCK_THRESHOLD) {
            this.frameHistory.shift(); // Keep only recent frames
        }

        this.checkStability();

        if (this.isLocked) {
            return { 
                locked: true, 
                boundingBox: this.lockedBoundingBox,
                message: 'Particle lock achieved'
            };
        } else {
            return { 
                locked: false, 
                message: 'Stabilize camera' 
            };
        }
    }

    /**
     * Checks if the bounding box has remained stable across the frame history
     */
    checkStability() {
        if (this.frameHistory.length < this.LOCK_THRESHOLD) {
            this.isLocked = false;
            return;
        }

        let isStable = true;
        const reference = this.frameHistory[0];

        for (let i = 1; i < this.frameHistory.length; i++) {
            const current = this.frameHistory[i];
            const areaRef = reference.width * reference.height;
            const areaCur = current.width * current.height;
            
            // Check area variance
            if (Math.abs(areaCur - areaRef) / areaRef > this.STABILITY_TOLERANCE) {
                isStable = false;
                break;
            }
            
            // Check position variance
            const xVariance = Math.abs(current.x - reference.x) / reference.width;
            const yVariance = Math.abs(current.y - reference.y) / reference.height;
            if (xVariance > this.STABILITY_TOLERANCE || yVariance > this.STABILITY_TOLERANCE) {
                isStable = false;
                break;
            }
        }

        this.isLocked = isStable;
        if (isStable) {
            // Average out the bounding box for the locked state
            this.lockedBoundingBox = this.averageBoundingBoxes(this.frameHistory);
        } else {
            this.lockedBoundingBox = null;
        }
    }

    averageBoundingBoxes(boxes) {
        const avg = boxes.reduce((acc, box) => {
            acc.x += box.x;
            acc.y += box.y;
            acc.width += box.width;
            acc.height += box.height;
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
        this.isLocked = false;
        this.lockedBoundingBox = null;
    }
}

export const objectLockEngine = new ObjectLockEngine();
