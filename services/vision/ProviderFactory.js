import { GroqVisionProvider } from './GroqVisionProvider.js';
import { GeminiVisionProvider } from './GeminiVisionProvider.js';
import { OCRFallbackProvider } from './OCRFallbackProvider.js';
import { ENV } from '../../core/env.js';

export class ProviderFactory {
  /**
   * Factory method resolving active Vision Provider
   * Selection priority:
   * 1. Explicit argument override
   * 2. localStorage.getItem('VISION_PROVIDER')
   * 3. ENV.VISION_PROVIDER
   * 4. Default: 'groq'
   */
  static getProvider(overrideType = null) {
    const providerType = overrideType || 
      (typeof window !== 'undefined' && localStorage.getItem('VISION_PROVIDER')) || 
      ENV.VISION_PROVIDER || 
      'groq';

    console.log(`[ProviderFactory] 🏭 Active Vision Provider Selected: "${providerType.toUpperCase()}"`);

    switch (providerType.toLowerCase()) {
      case 'gemini':
        return new GeminiVisionProvider();
      case 'ocr':
        return new OCRFallbackProvider();
      case 'groq':
      default:
        return new GroqVisionProvider();
    }
  }
}
