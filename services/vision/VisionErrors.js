/**
 * Standardized Vision Provider Error Hierarchy
 */
export class VisionProviderError extends Error {
  constructor(message, code = 'VISION_ERROR', originalError = null) {
    super(message);
    this.name = 'VisionProviderError';
    this.code = code;
    this.originalError = originalError;
  }
}

export class AuthenticationError extends VisionProviderError {
  constructor(message, originalError = null) {
    super(message, 'AUTH_ERROR', originalError);
  }
}

export class RateLimitError extends VisionProviderError {
  constructor(message, originalError = null) {
    super(message, 'RATE_LIMIT_ERROR', originalError);
  }
}

export class InvalidResponseError extends VisionProviderError {
  constructor(message, originalError = null) {
    super(message, 'INVALID_RESPONSE_ERROR', originalError);
  }
}

export class UnsupportedModelError extends VisionProviderError {
  constructor(message, originalError = null) {
    super(message, 'UNSUPPORTED_MODEL_ERROR', originalError);
  }
}
