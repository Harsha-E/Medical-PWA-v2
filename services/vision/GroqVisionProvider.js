import { BaseVisionProvider } from './BaseVisionProvider.js';
import { AuthenticationError, InvalidResponseError } from './VisionErrors.js';
import { ENV } from '../../core/env.js';

const DIRECT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

export class GroqVisionProvider extends BaseVisionProvider {
  async extract(imageBlob) {
    const activeKey = ENV.getGroqKey ? ENV.getGroqKey() : ENV.GROQ_API_KEY;
    if (!activeKey) {
      throw new AuthenticationError('Groq API Key is uninitialized or missing.');
    }

    const base64Image = await this.blobToBase64(imageBlob);
    const promptText = this.getSystemPrompt();

    // 1. Primary: Native Image Vision Payload
    const visionPayload = {
      model: 'llama-3.2-90b-vision-preview',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: promptText },
            { type: 'image_url', image_url: { url: base64Image } }
          ]
        }
      ],
      temperature: 0.1,
      max_tokens: 800
    };

    let response;
    try {
      console.log('[GroqVisionProvider] 📸 Sending native image payload to Groq Vision API...');
      response = await fetch(DIRECT_GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify(visionPayload)
      });
    } catch (err) {
      console.warn('[GroqVisionProvider] Native Vision fetch error:', err);
    }

    // 2. Fallback: If Vision model is decommissioned or returns 400/404, fallback to OCR + Text LLM
    if (!response || !response.ok) {
      console.log('[GroqVisionProvider] 🔄 Vision endpoint returned non-200. Activating OCR text fallback...');
      let ocrText = '';
      try {
        if (typeof window !== 'undefined' && window.Tesseract) {
          const ocrRes = await window.Tesseract.recognize(imageBlob, 'eng');
          ocrText = ocrRes?.data?.text || '';
        }
      } catch (ocrErr) {
        console.warn('[GroqVisionProvider] Local Tesseract OCR pre-pass error:', ocrErr);
      }

      const textPayload = {
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'user',
            content: promptText + (ocrText ? `\n\n[Extracted Packaging Text]:\n"""\n${ocrText}\n"""` : '\n\nExtract medicine details accurately.')
          }
        ],
        temperature: 0.1,
        max_tokens: 800
      };

      response = await fetch(DIRECT_GROQ_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${activeKey}`
        },
        body: JSON.stringify(textPayload)
      });
    }

    if (!response.ok) {
      const errText = await response.text();
      throw new InvalidResponseError(`Groq Provider HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    let content = data?.choices?.[0]?.message?.content || '';
    content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

    const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new InvalidResponseError('Groq returned non-JSON content: ' + content.slice(0, 200));
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return this.normalizeMedicines(parsed, 'groq-vision');
  }
}
