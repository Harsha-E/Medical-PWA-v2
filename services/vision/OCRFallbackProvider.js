import { BaseVisionProvider } from './BaseVisionProvider.js';
import { InvalidResponseError } from './VisionErrors.js';
import { ENV } from '../../core/env.js';

const DIRECT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class OCRFallbackProvider extends BaseVisionProvider {
  async extract(imageBlob) {
    const activeKey = ENV.getGroqKey ? ENV.getGroqKey() : ENV.GROQ_API_KEY;
    const promptText = this.getSystemPrompt();

    let ocrText = '';
    try {
      if (typeof window !== 'undefined' && window.Tesseract) {
        console.log('[OCRFallbackProvider] 🔍 Running client-side Tesseract OCR...');
        const ocrRes = await window.Tesseract.recognize(imageBlob, 'eng');
        ocrText = ocrRes?.data?.text || '';
      }
    } catch (ocrErr) {
      console.warn('[OCRFallbackProvider] Tesseract OCR error:', ocrErr);
    }

    const payload = {
      model: 'llama-3.3-70b-versatile',
      messages: [
        {
          role: 'user',
          content: promptText + (ocrText ? `\n\n[Extracted Medicine Packaging OCR Text]:\n"""\n${ocrText}\n"""` : '\n\nExtract medicine details accurately.')
        }
      ],
      temperature: 0.1,
      max_tokens: 800
    };

    console.log('[OCRFallbackProvider] 📝 Sending OCR text payload to Text LLM...');
    const response = await fetch(DIRECT_GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${activeKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new InvalidResponseError(`OCR Fallback Provider HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new InvalidResponseError('OCR Fallback returned non-JSON content: ' + content.slice(0, 200));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return this.normalizeMedicines(parsed, 'ocr-fallback');
  }
}
