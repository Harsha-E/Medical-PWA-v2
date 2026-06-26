/**
 * @fileoverview Image Enhancer
 * Preprocessing layer applied before OCR. Implements unsharp masking, 
 * glare suppression, and foil desaturation in a dedicated offscreen pass.
 */

export class ImageEnhancer {
  /**
   * Enhances an image blob for OCR readability.
   * @param {Blob} imageBlob 
   * @returns {Promise<Blob>} Enhanced image blob
   */
  static async enhance(imageBlob) {
    const img = await createImageBitmap(imageBlob);
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(img, 0, 0);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Pass 1: Glare Suppression (replace luminance > 240 with local median approximation)
    // Pass 2: Foil Reflection Desaturation (metallic highlights desaturated)
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i+1];
      const b = data[i+2];
      
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b);
      
      // Glare blowout - darken it slightly
      if (luminance > 240) {
        data[i] = data[i] * 0.9;
        data[i+1] = data[i+1] * 0.9;
        data[i+2] = data[i+2] * 0.9;
      }
      
      // High saturation metallic check (simple std deviation of rgb)
      const avg = (r + g + b) / 3;
      const saturation = Math.abs(r - avg) + Math.abs(g - avg) + Math.abs(b - avg);
      if (luminance > 150 && saturation < 30) {
        // Desaturate completely to kill color noise on foil
        data[i] = avg;
        data[i+1] = avg;
        data[i+2] = avg;
      }
    }
    
    // Pass 3: Unsharp Masking (3x3 Laplacian boost)
    const sharpened = this._applyUnsharpMask(imageData, canvas.width, canvas.height);
    
    ctx.putImageData(sharpened, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  }

  static _applyUnsharpMask(imageData, width, height) {
    const src = imageData.data;
    const dst = new Uint8ClampedArray(src.length);
    const weights = [
       0, -1,  0,
      -1,  5, -1,
       0, -1,  0
    ];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let r = 0, g = 0, b = 0;
        
        for (let wy = -1; wy <= 1; wy++) {
          for (let wx = -1; wx <= 1; wx++) {
            const weight = weights[(wy + 1) * 3 + (wx + 1)];
            const idx = ((y + wy) * width + (x + wx)) * 4;
            
            r += src[idx] * weight;
            g += src[idx+1] * weight;
            b += src[idx+2] * weight;
          }
        }
        
        const centerIdx = (y * width + x) * 4;
        dst[centerIdx] = r;
        dst[centerIdx+1] = g;
        dst[centerIdx+2] = b;
        dst[centerIdx+3] = src[centerIdx+3];
      }
    }
    
    // Copy edges
    for (let x = 0; x < width; x++) {
      for (const y of [0, height - 1]) {
        const idx = (y * width + x) * 4;
        dst[idx] = src[idx];
        dst[idx+1] = src[idx+1];
        dst[idx+2] = src[idx+2];
        dst[idx+3] = src[idx+3];
      }
    }
    for (let y = 0; y < height; y++) {
      for (const x of [0, width - 1]) {
        const idx = (y * width + x) * 4;
        dst[idx] = src[idx];
        dst[idx+1] = src[idx+1];
        dst[idx+2] = src[idx+2];
        dst[idx+3] = src[idx+3];
      }
    }

    return new ImageData(dst, width, height);
  }
}
