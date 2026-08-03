/**
 * AIExtractionService
 *
 * Direct Groq Vision Pipeline with Cloudflare Proxy + Direct API fallback.
 */

import { ENV } from '../core/env.js';

const GROQ_PROXY_URL = 'https://medcare-groq-proxy.harshaedupuganti70.workers.dev/';
const DIRECT_GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIExtractionService {
    constructor() {
        this.useDemoMode = false;
    }

    /**
     * Extracts medicines from a captured image blob.
     * @param {Blob} imageBlob
     * @returns {Promise<Array>} Structured list of medicine objects.
     */
    async extractMedicines(imageBlob) {
        try {
            return await this._runGroqExtraction(imageBlob);
        } catch (err) {
            console.error('[AIExtractionService] Groq extraction failed.', err);
            throw err;
        }
    }

    /**
     * Primary Groq Vision Pipeline
     */
    async _runGroqExtraction(imageBlob) {
        const base64Image = await this._blobToBase64(imageBlob);

        const promptText = `You are an expert pharmaceutical extraction engine. Your job is to extract highly accurate data from medicine packaging images.

First, read all text on the packaging silently. Then, carefully identify:
- PRIMARY BRAND NAME (trade name, usually in large stylized font)
- GENERIC/CHEMICAL NAME (active ingredient, often below brand name)
- DOSAGE (strength with units, e.g. "100mg + 325mg", "500mg")
- FORM (Tablet, Capsule, Syrup, Inhaler, Injection, etc.)
- MANUFACTURER (company name like Intas, Sun Pharma, Cipla, etc.)
- TOTAL QUANTITY in the pack

Do NOT confuse manufacturer names with medicine names.
Extract ONLY what is actually visible. Do NOT hallucinate.

Return ONLY a strict JSON array (no markdown, no backticks, no extra text):
[
  {
    "brandName": "Exact Brand Name (e.g. 'Hifenac-P', 'Crocin', 'Dolo 650')",
    "genericName": "Exact Generic/Active Ingredient (e.g. 'Aceclofenac + Paracetamol', 'Paracetamol')",
    "dosage": "Full strength string (e.g. '100mg + 325mg', '650mg')",
    "form": "Tablet | Capsule | Syrup | Injection | etc.",
    "totalQuantity": 10,
    "manufacturer": "Company name if visible",
    "instructions": "Any storage or usage instructions if visible"
  }
]`;

        const payload = {
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

        const activeKey = ENV.getGroqKey ? ENV.getGroqKey() : ENV.GROQ_API_KEY;

        let response;
        try {
            console.log('[AIExtractionService] 🚀 Sending image payload to Groq Proxy...');
            response = await fetch(GROQ_PROXY_URL, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${activeKey}`
                },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.warn('[AIExtractionService] Proxy fetch failed, attempting direct Groq API:', err);
        }

        if (!response || !response.ok) {
            console.log('[AIExtractionService] Fallback: Sending direct text extraction payload to Groq API...');
            let ocrText = '';
            try {
                if (typeof window !== 'undefined' && window.Tesseract) {
                    const ocrRes = await window.Tesseract.recognize(imageBlob, 'eng');
                    ocrText = ocrRes?.data?.text || '';
                }
            } catch (ocrErr) {
                console.warn('[AIExtractionService] Local Tesseract OCR pre-pass error:', ocrErr);
            }

            const directPayload = {
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
                body: JSON.stringify(directPayload)
            });
        }

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq Extraction Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        console.log('[AIExtractionService] Groq raw response:', data);

        let content = data?.choices?.[0]?.message?.content || '';
        content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

        let medicines = [];
        const jsonMatch = content.match(/\[[\s\S]*\]/) || content.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Groq returned non-JSON: ' + content.slice(0, 200));

        const parsed = JSON.parse(jsonMatch[0]);
        medicines = Array.isArray(parsed) ? parsed : [parsed];

        return medicines.map((m, i) => ({
            id: 'med_' + Date.now() + '_' + i,
            name: m.brandName || m.genericName || 'Unknown',
            brandName: m.brandName || '',
            genericName: m.genericName || '',
            dosage: m.dosage || m.dosage?.rawText || '',
            form: m.form || 'Tablet',
            totalQuantity: m.totalQuantity || null,
            manufacturer: m.manufacturer || '',
            instructions: m.instructions || '',
            extractedAt: new Date().toISOString(),
            source: 'groq-vision'
        }));
    }

    /**
     * Converts a Blob to a base64 data URL string.
     */
    _blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }
}

export default new AIExtractionService();
