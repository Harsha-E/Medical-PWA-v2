/**
 * @fileoverview Strip Depth Estimator
 * generate a normalized float32 depth map for 3D reconstruction.
 */
import { modelCacheManager } from './ModelCacheManager.js';

export class StripDepthEstimator {
  constructor() {
    this.session = null;
    this.isReady = false;
    this.modelPath = 'https://huggingface.co/Xenova/dpt-hybrid-midas/resolve/main/onnx/model.onnx';
  }

  /**
   * Initializes the ONNX Runtime session with the depth model.
   */
  async init() {
    if (this.isReady) return;
    try {
      // 1. Ensure ONNX Runtime Web is loaded
      if (typeof window.ort === 'undefined') {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/ort.min.js';
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      window.ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';
      
      // 2. Fetch the model via Cache API
      const modelBuffer = await modelCacheManager.getModel(this.modelPath, 'dpt-hybrid-midas-v1');
      console.log(`[StripDepthEstimator] Model loaded into memory. Size: ${(modelBuffer.byteLength / 1024 / 1024).toFixed(2)} MB`);

      // 3. Initialize Session
      this.session = await window.ort.InferenceSession.create(new Uint8Array(modelBuffer), {
        executionProviders: ['wasm']
      });
      
      this.isReady = true;
      console.log('--- ONNX SESSION CREATED ---');
      console.log('Input Names:', this.session.inputNames);
      console.log('Output Names:', this.session.outputNames);
      console.log('----------------------------');
      
    } catch (e) {
      console.error('[StripDepthEstimator] Failed to load ONNX model:', e);
    }
  }

  /**
   * Generates a depth map from a frame.
   * @param {ImageBitmap|HTMLCanvasElement} imageSource 
   * @returns {Promise<{ depthMap: Float32Array, width: number, height: number }>}
   */
  async estimateDepth(imageSource) {
    if (!this.isReady || !this.session) {
      await this.init();
    }
    if (!this.isReady) return null;

    // 1. Prepare Image (DPT-Hybrid-Midas expects 384x384 RGB input)
    const targetSize = 384;
    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageSource, 0, 0, targetSize, targetSize);
    const imgData = ctx.getImageData(0, 0, targetSize, targetSize);

    // 2. Normalize and convert to Float32 tensor (NCHW format)
    // dpt-hybrid-midas preprocessor config: mean=[0.5, 0.5, 0.5], std=[0.5, 0.5, 0.5]
    const float32Data = new Float32Array(3 * targetSize * targetSize);
    for (let i = 0; i < targetSize * targetSize; i++) {
      float32Data[i] = (imgData.data[i * 4] / 255.0 - 0.5) / 0.5;           // R
      float32Data[targetSize * targetSize + i] = (imgData.data[i * 4 + 1] / 255.0 - 0.5) / 0.5; // G
      float32Data[2 * targetSize * targetSize + i] = (imgData.data[i * 4 + 2] / 255.0 - 0.5) / 0.5; // B
    }

    const tensor = new window.ort.Tensor('float32', float32Data, [1, 3, targetSize, targetSize]);

    // 3. Run Inference
    try {
      const feeds = {};
      feeds[this.session.inputNames[0]] = tensor;
      const results = await this.session.run(feeds);
      
      const outputTensor = results[this.session.outputNames[0]];
      const rawDepth = outputTensor.data; // Float32Array
      
      console.log('--- ONNX INFERENCE SUCCESS ---');
      console.log('Output Dims:', outputTensor.dims);

      // 4. Normalize depth map to 0.0 - 1.0 range & Calculate Stats
      let min = Infinity;
      let max = -Infinity;
      let sum = 0;
      
      for (let i = 0; i < rawDepth.length; i++) {
        if (rawDepth[i] < min) min = rawDepth[i];
        if (rawDepth[i] > max) max = rawDepth[i];
        sum += rawDepth[i];
      }
      
      const mean = sum / rawDepth.length;
      console.log(`Depth Stats -> Min: ${min.toFixed(3)}, Max: ${max.toFixed(3)}, Mean: ${mean.toFixed(3)}`);
      
      if (Math.abs(max - min) < 0.01) {
         console.warn('[StripDepthEstimator] WARNING: Depth map is completely flat! Inference may be broken.');
      }

      const normalizedDepth = new Float32Array(rawDepth.length);
      for (let i = 0; i < rawDepth.length; i++) {
        normalizedDepth[i] = (rawDepth[i] - min) / (max - min);
      }

      return {
        depthMap: normalizedDepth,
        width: targetSize,
        height: targetSize
      };
    } catch (e) {
      console.error('[StripDepthEstimator] Inference failed:', e);
      return null;
    }
  }
}
