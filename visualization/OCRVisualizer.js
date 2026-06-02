export class OCRVisualizer {
    constructor() {
        this.containerId = 'ocr-visualizer-container';
        this.currentText = '';
        this.targetText = '';
    }

    initContainer() {
        if (!document.getElementById(this.containerId)) {
            const container = document.createElement('div');
            container.id = this.containerId;
            container.className = 'clay-panel';
            container.style.position = 'absolute';
            container.style.top = '120px';
            container.style.left = '50%';
            container.style.transform = 'translateX(-50%)';
            container.style.padding = '16px 32px';
            container.style.fontSize = '32px';
            container.style.fontWeight = 'bold';
            container.style.letterSpacing = '4px';
            container.style.fontFamily = 'monospace';
            container.style.color = 'var(--text-primary)';
            container.style.zIndex = '600';
            container.style.display = 'none';
            document.body.appendChild(container);
        }
    }

    /**
     * Animates the transition of OCR fragments (e.g. DO_O -> DOLO)
     * @param {string} incomingFragment - The newly detected text fragment
     * @param {string} fusionResult - The current best-guess stitched text
     */
    updateAssemblingText(incomingFragment, fusionResult) {
        this.initContainer();
        const container = document.getElementById(this.containerId);
        container.style.display = 'block';

        this.targetText = fusionResult;
        
        // Simple animation: show the fusion result but fade in new characters
        // In a complex implementation, this would map character indices and animate individual spans
        
        let htmlContent = '';
        for (let i = 0; i < this.targetText.length; i++) {
            const char = this.targetText[i];
            if (char === '_') {
                htmlContent += `<span style="opacity: 0.3;">_</span>`;
            } else {
                // If it's a confirmed character, give it a subtle glow
                htmlContent += `<span style="text-shadow: 0 0 8px var(--soft-cyan);">${char}</span>`;
            }
        }

        container.innerHTML = htmlContent;
    }

    clear() {
        const container = document.getElementById(this.containerId);
        if (container) {
            container.style.display = 'none';
            container.innerHTML = '';
        }
    }
}

export const ocrVisualizer = new OCRVisualizer();
