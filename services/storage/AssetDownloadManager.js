/**
 * @fileoverview Asset Download Manager Service
 * Manages progressive download and caching of large models, datasets, and catalog files,
 * reporting percentage progress to the UI.
 */

export default class AssetDownloadManager {
  /**
   * Downloads a large file with progress reporting and stores it in Cache Storage.
   * @param {string} url - URL of asset
   * @param {Function} onProgress - Callback with download progress percentage (0-100)
   * @returns {Promise<Response>} Downloaded response
   */
  async downloadAssetWithProgress(url, onProgress = () => {}) {
    const cache = await caches.open('medcare-assets-v1');
    const cached = await cache.match(url);
    if (cached) {
      onProgress(100);
      return cached;
    }

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const contentLength = response.headers.get('content-length');
      const totalBytes = contentLength ? parseInt(contentLength, 10) : 0;
      
      if (totalBytes === 0) {
        // Fallback if content-length is missing
        const clone = response.clone();
        await cache.put(url, response);
        onProgress(100);
        return clone;
      }

      const reader = response.body.getReader();
      let receivedBytes = 0;
      const chunks = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        receivedBytes += value.length;
        const progress = Math.round((receivedBytes / totalBytes) * 100);
        onProgress(progress);
      }

      const combined = new Uint8Array(receivedBytes);
      let offset = 0;
      for (const chunk of chunks) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }

      const newResponse = new Response(combined, {
        headers: response.headers,
        status: response.status,
        statusText: response.statusText
      });

      await cache.put(url, newResponse.clone());
      return newResponse;
    } catch (e) {
      console.error('[AssetDownloadManager] Progressive download failed:', e);
      throw e;
    }
  }

  /**
   * Deletes a cached asset.
   * @param {string} url
   * @returns {Promise<boolean>} True if successfully deleted
   */
  async purgeAsset(url) {
    const cache = await caches.open('medcare-assets-v1');
    return cache.delete(url);
  }
}
