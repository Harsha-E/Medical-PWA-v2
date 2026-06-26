/**
 * CanvasEditor.js
 * The "Photoroom" style manual refinement tool.
 * Handles erasing AI artifacts and restoring accidentally deleted pixels.
 */

export default class CanvasEditor {
    constructor(containerElement, originalImageSrc, aiCutoutSrc, onComplete) {
        this.container = containerElement;
        this.onComplete = onComplete; // Callback when editing is done
        
        this.mode = 'erase'; // 'erase' or 'restore'
        this.brushSize = 20;
        this.isDrawing = false;

        // Create the UI
        this.initUI();
        this.loadImages(originalImageSrc, aiCutoutSrc);
    }

    initUI() {
        this.container.innerHTML = `
            <div class="editor-toolbar" style="position: absolute; top: 10px; left: 10px; z-index: 100; display: flex; gap: 10px; background: var(--theme-surface, #fff); padding: 10px; border-radius: 12px; box-shadow: 0 4px 15px rgba(0,0,0,0.1);">
                <button id="btn-erase" style="padding: 8px 16px; border-radius: 8px; background: #ff4757; color: white; border: none; font-weight: bold; cursor: pointer;">Erase 🔴</button>
                <input type="range" id="brush-size" min="5" max="50" value="20" style="margin-left: 10px;">
                <button id="btn-done" style="padding: 8px 16px; border-radius: 8px; background: #1e90ff; color: white; border: none; font-weight: bold; cursor: pointer; margin-left: auto;">Done ✔️</button>
            </div>
            <div style="position: relative; width: 100%; height: 100%; display: flex; justify-content: center; align-items: center; overflow: hidden;">
                <!-- Editable Canvas (The Cutout) -->
                <canvas id="edit-canvas" style="position: absolute; cursor: crosshair; touch-action: none;"></canvas>
            </div>
        `;

        // Event Listeners for Toolbar
        this.container.querySelector('#btn-erase').onclick = () => this.mode = 'erase';
        this.container.querySelector('#brush-size').oninput = (e) => this.brushSize = parseInt(e.target.value);
        this.container.querySelector('#btn-done').onclick = () => this.exportResult();

        this.editCanvas = this.container.querySelector('#edit-canvas');
        this.ctx = this.editCanvas.getContext('2d');

        this.bindDrawingEvents();
    }

    async loadImages(originalSrc, cutoutSrc) {
        this.cutoutImg = new Image();

        await new Promise(r => { this.cutoutImg.onload = r; this.cutoutImg.src = cutoutSrc; });

        // Match canvas size to image size
        this.editCanvas.width = this.cutoutImg.width;
        this.editCanvas.height = this.cutoutImg.height;

        // Scale down for UI fitting (CSS scale)
        const scale = Math.min(window.innerWidth / this.cutoutImg.width, (window.innerHeight - 100) / this.cutoutImg.height) * 0.9;
        this.editCanvas.style.transform = `scale(${scale})`;

        // Draw initial states
        this.ctx.drawImage(this.cutoutImg, 0, 0);
    }

    bindDrawingEvents() {
        const getPointerPos = (e) => {
            const rect = this.editCanvas.getBoundingClientRect();
            // Adjust for CSS scaling
            const scaleX = this.editCanvas.width / rect.width;
            const scaleY = this.editCanvas.height / rect.height;
            return {
                x: (e.clientX || e.touches[0].clientX - rect.left) * scaleX,
                y: (e.clientY || e.touches[0].clientY - rect.top) * scaleY
            };
        };

        const startDraw = (e) => { this.isDrawing = true; this.draw(e); };
        const endDraw = () => { this.isDrawing = false; this.ctx.beginPath(); };

        this.editCanvas.addEventListener('pointerdown', startDraw);
        this.editCanvas.addEventListener('pointermove', (e) => { if(this.isDrawing) this.draw(e); });
        this.editCanvas.addEventListener('pointerup', endDraw);
        this.editCanvas.addEventListener('pointerleave', endDraw);
    }

    draw(e) {
        e.preventDefault();
        const { x, y } = getPointerPos(e);

        if (this.mode === 'erase') {
            // Destructive erasing (makes pixels transparent)
            this.ctx.globalCompositeOperation = 'destination-out';
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.brushSize, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }

    exportResult() {
        // Return the edited canvas as a base64 string
        const finalDataUrl = this.editCanvas.toDataURL('image/png');
        if (this.onComplete) this.onComplete(finalDataUrl);
        this.container.innerHTML = ''; // Clean up UI
    }
}
