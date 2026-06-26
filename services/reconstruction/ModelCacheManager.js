/**
 * @fileoverview ModelCacheManager
 * Implements "Offline First" model caching using the browser's Cache API.
 * Ensures large binary assets (like ONNX models) are downloaded exactly once,
 * stored efficiently, and fetched seamlessly across offline sessions.
 */

export class ModelCacheManager {
  constructor() {
    this.CACHE_NAME = 'medcare-models-v1';
  }

  /**
   * Fetches the model from the Cache API, or downloads and caches it if missing.
   * @param {string} url - The URL of the ONNX model
   * @param {string} modelId - A unique versioned ID for the model (e.g., 'dpt-hybrid-midas-v1')
   * @returns {Promise<ArrayBuffer>} The binary model data
   */
  async getModel(url, modelId) {
    if (!('caches' in window)) {
      console.warn('[ModelCacheManager] Cache API not supported. Falling back to network fetch.');
      return this._fetchFromNetwork(url);
    }

    try {
      const cache = await caches.open(this.CACHE_NAME);
      const cacheKey = new Request(`/models/${modelId}`);
      
      let response = await cache.match(cacheKey);

      if (response) {
        console.log(`[ModelCacheManager] ⚡ Cache HIT for ${modelId}`);
        return await response.arrayBuffer();
      }

      console.log(`[ModelCacheManager] ☁️ Cache MISS for ${modelId}. Downloading...`);
      const networkResponse = await fetch(url);
      
      if (!networkResponse.ok) {
        throw new Error(`Failed to download model: ${networkResponse.status} ${networkResponse.statusText}`);
      }

      // Clone the response because reading the buffer consumes the stream
      const cacheResponse = networkResponse.clone();
      await cache.put(cacheKey, cacheResponse);
      
      console.log(`[ModelCacheManager] ✅ Successfully cached ${modelId}.`);
      return await networkResponse.arrayBuffer();

    } catch (e) {
      console.error(`[ModelCacheManager] Error fetching ${modelId}:`, e);
      throw e;
    }
  }

  /**
   * Fallback for legacy browsers without Cache API support.
   */
  async _fetchFromNetwork(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Network fetch failed: ${response.status}`);
    return await response.arrayBuffer();
  }
}

export const modelCacheManager = new ModelCacheManager();
