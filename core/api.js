/**
 * @fileoverview ApiClient.js
 * Structured ApiClient wrapper with diagnostic error classification (NetworkError, CorsError, TimeoutError, OfflineError).
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
  static getBaseUrl() {
    if (ENV.getApiBaseUrl) return ENV.getApiBaseUrl();
    if (ENV.API_BASE_URL) return ENV.API_BASE_URL;
    return 'http://localhost:8000';
  }

  static async post(endpoint, body, options = {}) {
    const baseUrl = this.getBaseUrl();
    const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
    const timeoutMs = options.timeout || 3000;

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    };

    console.log('[ApiClient] 🚀 Phase 1 Request Trace:', {
      url,
      method: 'POST',
      headers,
      payload: body,
      timeoutMs
    });

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new ApiDiagnosticError('Device is offline', 'OFFLINE');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timer);

      console.log(`[ApiClient] 📡 Response Status [${response.status}] from ${url}`);

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

      // Distinguish CORS vs Network unreachable
      const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
      const isHttpTarget = url.startsWith('http:');

      if (isHttps && isHttpTarget) {
        throw new ApiDiagnosticError('Browser blocked Mixed Content (HTTP requested inside HTTPS page)', 'CORS_OR_NETWORK', 0, err);
      }

      throw new ApiDiagnosticError(`Network fetch failed: ${err.message || err}`, 'CORS_OR_NETWORK', 0, err);
    }
  }
}
