import { BaseVisionProvider } from './BaseVisionProvider.js';
import { AuthenticationError, InvalidResponseError } from './VisionErrors.js';
import { ENV } from '../../core/env.js';

export class GeminiVisionProvider extends BaseVisionProvider {
  async extract(imageBlob) {
    const apiKey = (typeof window !== 'undefined' && localStorage.getItem('GEMINI_API_KEY')) || ENV.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn('[GeminiVisionProvider] Gemini API Key missing, falling back to Groq Vision provider...');
      const { GroqVisionProvider } = await import('./GroqVisionProvider.js');
      return new GroqVisionProvider().extract(imageBlob);
    }

    const dataUrl = await this.blobToBase64(imageBlob);
    const base64Data = dataUrl.split(',')[1] || dataUrl;
    const mimeType = imageBlob.type || 'image/jpeg';
    const promptText = this.getSystemPrompt();

    const payload = {
      contents: [
        {
          parts: [
            { text: promptText },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 800
      }
    };

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    console.log('[GeminiVisionProvider] 📸 Sending native image payload to Gemini 1.5 Flash Vision API...');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new InvalidResponseError(`Gemini Provider HTTP ${response.status}: ${errText}`);
    }

    const result = await response.json();
    let text = result?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    text = text.replace(/```json/gi, '').replace(/```/g, '').trim();

    const jsonMatch = text.match(/\[[\s\S]*\]/) || text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new InvalidResponseError('Gemini returned non-JSON content: ' + text.slice(0, 200));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return this.normalizeMedicines(parsed, 'gemini-vision');
  }
}
