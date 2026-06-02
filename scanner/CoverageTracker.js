export class CoverageTracker {
    constructor() {
        // We divide the expected bounding box into a 10x10 grid to track coverage
        this.gridSize = 10;
        this.coverageGrid = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(false));
        this.totalCells = this.gridSize * this.gridSize;
        
        // Strip dimensions to map physical pixels to our grid
        this.stripWidth = 1;
        this.stripHeight = 1;
    }

    /**
     * Initializes the tracker with the stable bounding box of the strip
     */
    initialize(boundingBox) {
        this.stripWidth = boundingBox.width;
        this.stripHeight = boundingBox.height;
        this.reset();
        console.log('[CoverageTracker] Initialized with bounds:', boundingBox);
    }

    /**
     * Updates the coverage map based on where text was successfully read
     * @param {Object} relativeOcrRect - The bounding box of the text RELATIVE to the strip's bounding box
     * @param {number} confidence - The OCR confidence score
     */
    updateCoverage(relativeOcrRect, confidence) {
        if (confidence < 0.7) return; // Ignore low confidence reads

        // Map the rect to grid coordinates
        const startX = Math.floor((relativeOcrRect.x / this.stripWidth) * this.gridSize);
        const startY = Math.floor((relativeOcrRect.y / this.stripHeight) * this.gridSize);
        const endX = Math.floor(((relativeOcrRect.x + relativeOcrRect.width) / this.stripWidth) * this.gridSize);
        const endY = Math.floor(((relativeOcrRect.y + relativeOcrRect.height) / this.stripHeight) * this.gridSize);

        // Clamp values
        const minX = Math.max(0, startX);
        const minY = Math.max(0, startY);
        const maxX = Math.min(this.gridSize - 1, endX);
        const maxY = Math.min(this.gridSize - 1, endY);

        // Mark cells as covered
        for (let y = minY; y <= maxY; y++) {
            for (let x = minX; x <= maxX; x++) {
                this.coverageGrid[y][x] = true;
            }
        }
    }

    /**
     * Returns the percentage of the strip that has been successfully scanned
     */
    getCoveragePercentage() {
        let coveredCells = 0;
        for (let y = 0; y < this.gridSize; y++) {
            for (let x = 0; x < this.gridSize; x++) {
                if (this.coverageGrid[y][x]) {
                    coveredCells++;
                }
            }
        }
        return (coveredCells / this.totalCells) * 100;
    }

    getGridState() {
        return this.coverageGrid;
    }

    reset() {
        this.coverageGrid = Array(this.gridSize).fill(0).map(() => Array(this.gridSize).fill(false));
    }
}

export const coverageTracker = new CoverageTracker();
