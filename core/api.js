/**
 * @fileoverview ApiClient.js
 * Explicit Dual Backend Routing:
 * - DIC_BASE_URL (Render): https://drug-intelligence-console.onrender.com for clinical reasoning (/api/v1/*)
 * - AI_BASE_URL (Cloudflare): https://medcare-groq-proxy.harshaedupuganti70.workers.dev for AI extraction
 */

import { ENV } from './env.js';

export class ApiDiagnosticError extends Error {
  constructor(message, code, status = 0, details = null) {
    super(message);
    this.name = 'ApiDiagnosticError';
    this.code = code; // 'OFFLINE', 'TIMEOUT', 'CORS_OR_NETWORK', 'HTTP_ERROR', 'JSON_PARSE'
    this.status = status;
    this.details = details;
  }
}

export class ApiClient {
  /**
   * Resolves base URL for Clinical Drug Intelligence Console (DIC on Render)
   */
  static getDicBaseUrl() {
    if (ENV.getDicBaseUrl) return ENV.getDicBaseUrl();
    if (ENV.DIC_BASE_URL) return ENV.DIC_BASE_URL;
    return 'https://drug-intelligence-console.onrender.com';
  }

  /**
   * Resolves base URL for AI Extraction Proxy (Cloudflare Worker)
   */
  static getAiBaseUrl() {
    if (ENV.getAiBaseUrl) return ENV.getAiBaseUrl();
    if (ENV.AI_BASE_URL) return ENV.AI_BASE_URL;
    return 'https://medcare-groq-proxy.harshaedupuganti70.workers.dev';
  }

  /**
   * Legacy getter mapping to DIC Base URL
   */
  static getBaseUrl() {
    return this.getDicBaseUrl();
  }

  /**
   * Generic HTTP fetch wrapper with diagnostic error classification and timeout
   */
  static async _request(method, url, body = null, options = {}) {
    const timeoutMs = options.timeout || 3000;
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    console.log(`[ApiClient] 🚀 Executing ${method} to ${url}`, { body, timeoutMs });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ApiDiagnosticError('Device is offline', 'OFFLINE');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const fetchConfig = {
        method,
        headers,
        signal: controller.signal
      };

      if (body !== null) {
        fetchConfig.body = JSON.stringify(body);
      }

      const response = await fetch(url, fetchConfig);
      clearTimeout(timer);

      console.log(`[ApiClient] 📡 Status [${response.status}] from ${url}`);

      if (!response.ok) {
        const errorText = await response.text().catch(() => '');
        throw new ApiDiagnosticError(
          `HTTP ${response.status}: ${response.statusText}`,
          'HTTP_ERROR',
          response.status,
          errorText
        );
      }

      const data = await response.json().catch(err => {
        throw new ApiDiagnosticError('Invalid JSON response format', 'JSON_PARSE', response.status, err);
      });

      return data;
    } catch (err) {
      clearTimeout(timer);
      if (err instanceof ApiDiagnosticError) throw err;

      if (err.name === 'AbortError') {
        throw new ApiDiagnosticError(`Request timed out after ${timeoutMs}ms`, 'TIMEOUT');
      }

      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isHttpTarget = url.startsWith('http:');

      if (isHttps && isHttpTarget) {
        throw new ApiDiagnosticError('Browser blocked Mixed Content (HTTP requested inside HTTPS page)', 'CORS_OR_NETWORK', 0, err);
      }

      throw new ApiDiagnosticError(`Network fetch failed: ${err.message || err}`, 'CORS_OR_NETWORK', 0, err);
    }
  }

  /**
   * POST request to Clinical Drug Intelligence Console (Render)
   */
  static async post(endpoint, body, options = {}) {
    const baseUrl = this.getDicBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    return this._request('POST', url, body, options);
  }

  /**
   * GET request to Clinical Drug Intelligence Console (Render)
   */
  static async get(endpoint, options = {}) {
    const baseUrl = this.getDicBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    return this._request('GET', url, null, options);
  }

  /**
   * POST request to AI Extraction Proxy (Cloudflare Worker)
   */
  static async postAi(endpoint, body, options = {}) {
    const baseUrl = this.getAiBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    return this._request('POST', url, body, options);
  }
}
