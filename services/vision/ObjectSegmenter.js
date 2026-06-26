import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

// Cache enforcement
env.useBrowserCache = true;
env.allowLocalModels = false;

let _segmenterInstance = null;

export class ObjectSegmenter {
    /**
     * Initializes the image segmentation model via Transformers.js
     */
    static async loadModel(progressCallback = null) {
        if (!_segmenterInstance) {
            console.log(`[ObjectSegmenter] Loading WebGPU segmentation model: Xenova/modnet...`);
            const startTime = performance.now();
            
            // Initialize the segmentation pipeline
            _segmenterInstance = await window.transformers.pipeline('image-segmentation', 'Xenova/modnet', {
                device: navigator.gpu ? 'webgpu' : 'cpu',
                progress_callback: progressCallback
            });
            
            const endTime = performance.now();
            console.log(`[ObjectSegmenter] WebGPU/CPU model load time: ${(endTime - startTime).toFixed(2)} ms`);
        }
        return _segmenterInstance;
    }

    /**
     * Extracts the bounding box and creates a transparent background using WebAssembly.
     */
    static async extract(imageBlob, progressCallback = null) {
        const imgBitmap = await createImageBitmap(imageBlob);
        
        // Scale down to prevent out-of-memory errors on mobile
        const processWidth = 1024;
        const scale = Math.min(1.0, processWidth / imgBitmap.width);
        const w = Math.floor(imgBitmap.width * scale);
        const h = Math.floor(imgBitmap.height * scale);

        const canvas = new OffscreenCanvas(w, h);
        const ctx = canvas.getContext('2d');
        ctx.drawImage(imgBitmap, 0, 0, w, h);

        const dataUrl = await new Promise(resolve => {
            canvas.convertToBlob({ type: 'image/png' }).then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        });

        const segmenter = await this.loadModel(progressCallback);
        
        console.log(`[ObjectSegmenter] Running WebAssembly inference...`);
        const startTime = performance.now();
        const results = await segmenter(dataUrl);
        const endTime = performance.now();
        console.log(`[ObjectSegmenter] Inference speed: ${(endTime - startTime).toFixed(2)} ms`);

        let maskImage = Array.isArray(results) ? results[0].mask : results.mask || results;
        if (!maskImage) {
            console.warn('[ObjectSegmenter] Failed to generate mask, returning original frame.');
            return { croppedBlob: imageBlob, bbox: { x: 0, y: 0, w: imgBitmap.width, h: imgBitmap.height } };
        }

        const maskCanvas = new OffscreenCanvas(maskImage.width, maskImage.height);
        const maskCtx = maskCanvas.getContext('2d');
        
        if (maskImage.channels === 1) {
            const imgDataArray = new Uint8ClampedArray(maskImage.width * maskImage.height * 4);
            for (let i = 0; i < maskImage.data.length; i++) {
                imgDataArray[i * 4] = 0;
                imgDataArray[i * 4 + 1] = 0;
                imgDataArray[i * 4 + 2] = 0;
                imgDataArray[i * 4 + 3] = maskImage.data[i];
            }
            maskCtx.putImageData(new ImageData(imgDataArray, maskImage.width, maskImage.height), 0, 0);
        } else if (maskImage.channels === 4) {
            maskCtx.putImageData(new ImageData(new Uint8ClampedArray(maskImage.data), maskImage.width, maskImage.height), 0, 0);
        } else {
            const imgDataArray = new Uint8ClampedArray(maskImage.width * maskImage.height * 4);
            for (let i = 0; i < (maskImage.width * maskImage.height); i++) {
                imgDataArray[i * 4] = 0;
                imgDataArray[i * 4 + 1] = 0;
                imgDataArray[i * 4 + 2] = 0;
                imgDataArray[i * 4 + 3] = maskImage.data[i * 3];
            }
            maskCtx.putImageData(new ImageData(imgDataArray, maskImage.width, maskImage.height), 0, 0);
        }

        const finalCanvas = new OffscreenCanvas(w, h);
        const finalCtx = finalCanvas.getContext('2d');

        if (maskImage.channels === 4) {
            finalCtx.drawImage(maskCanvas, 0, 0, w, h);
        } else {
            finalCtx.drawImage(maskCanvas, 0, 0, w, h);
            finalCtx.globalCompositeOperation = 'source-in';
            finalCtx.drawImage(canvas, 0, 0, w, h);
            finalCtx.globalCompositeOperation = 'source-over';
        }

        const croppedBlob = await finalCanvas.convertToBlob({ type: 'image/png' });
        
        return {
            croppedBlob,
            bbox: { x: 0, y: 0, w: imgBitmap.width, h: imgBitmap.height }
        };
    }
}
