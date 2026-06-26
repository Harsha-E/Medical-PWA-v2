/**
 * @fileoverview Surface Unwrapper
 * Handles curved blister-pack strips where the foil is not flat by using the
 * depth map to topologically flatten the canonical image.
 */

export class SurfaceUnwrapper {
  /**
   * Unwraps a curved surface using depth map row-shifting.
   * @param {Blob} imageBlob - Deskewed flat projection
   * @param {Float32Array} depthMap - Normalized depth map
   * @param {number} width - Depth map width
   * @param {number} height - Depth map height
   * @returns {Promise<Blob>} The unwrapped flat image
   */
  static async unwrap(imageBlob, depthMap, width, height) {
    if (!depthMap) return imageBlob;

    const img = await createImageBitmap(imageBlob);
    const canvas = new OffscreenCanvas(img.width, img.height);
    const ctx = canvas.getContext('2d');
    
    // Draw the source image
    ctx.drawImage(img, 0, 0);
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const outData = new ImageData(img.width, img.height);
    
    // Simple heuristic row-shift based on depth amplitude
    // (A true unwrap requires integrating the depth gradients to find the geodesic distance)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const depthIdx = y * width + x;
        const depthVal = depthMap[depthIdx];
        
        // Shift x based on depth (bulges shift outwards)
        const shiftX = Math.round((depthVal - 0.5) * 10); // arbitrary max shift
        const srcX = Math.min(Math.max(x + shiftX, 0), width - 1);
        
        const srcIdx = (y * width + srcX) * 4;
        const dstIdx = (y * width + x) * 4;
        
        outData.data[dstIdx] = imageData.data[srcIdx];
        outData.data[dstIdx+1] = imageData.data[srcIdx+1];
        outData.data[dstIdx+2] = imageData.data[srcIdx+2];
        outData.data[dstIdx+3] = imageData.data[srcIdx+3];
      }
    }
    
    ctx.putImageData(outData, 0, 0);
    return await canvas.convertToBlob({ type: 'image/png' });
  }
}
