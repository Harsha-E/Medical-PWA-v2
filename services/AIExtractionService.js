/**
 * AIExtractionService
 *
 * Direct Groq Vision Pipeline with Cloudflare Proxy + Direct API fallback.
 */

import { ENV } from '../core/env.js';

const getGroqProxyUrl = () => `${(ENV.getAiBaseUrl ? ENV.getAiBaseUrl() : ENV.AI_BASE_URL).replace(/\/$/, '')}/`;
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

        // 1. Perform OCR Pre-pass helper
        let ocrText = '';
        try {
            if (typeof window !== 'undefined' && window.Tesseract) {
                const ocrRes = await window.Tesseract.recognize(imageBlob, 'eng');
                ocrText = ocrRes?.data?.text || '';
            }
        } catch (ocrErr) {
            console.warn('[AIExtractionService] Local Tesseract OCR pre-pass error:', ocrErr);
        }

        const activeKey = ENV.getGroqKey ? ENV.getGroqKey() : ENV.GROQ_API_KEY;
        const textPromptWithOcr = promptText + (ocrText ? `\n\n[Extracted Packaging Text]:\n"""\n${ocrText}\n"""` : '\n\nExtract medicine details accurately.');

        const modelsToTry = [
            {
                name: 'llama-3.2-90b-vision-preview',
                payload: {
                    model: 'llama-3.2-90b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: textPromptWithOcr },
                                { type: 'image_url', image_url: { url: base64Image } }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 800
                }
            },
            {
                name: 'llama-3.2-11b-vision-preview',
                payload: {
                    model: 'llama-3.2-11b-vision-preview',
                    messages: [
                        {
                            role: 'user',
                            content: [
                                { type: 'text', text: textPromptWithOcr },
                                { type: 'image_url', image_url: { url: base64Image } }
                            ]
                        }
                    ],
                    temperature: 0.1,
                    max_tokens: 800
                }
            },
            {
                name: 'llama-3.3-70b-versatile',
                payload: {
                    model: 'llama-3.3-70b-versatile',
                    messages: [
                        { role: 'user', content: textPromptWithOcr }
                    ],
                    temperature: 0.1,
                    max_tokens: 800
                }
            }
        ];

        let response = null;
        let lastError = null;

        for (const modelConfig of modelsToTry) {
            try {
                console.log(`[AIExtractionService] 🚀 Sending extraction payload to Groq model: ${modelConfig.name}...`);
                const res = await fetch(DIRECT_GROQ_URL, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${activeKey}`
                    },
                    body: JSON.stringify(modelConfig.payload)
                });

                if (res.ok) {
                    response = res;
                    break;
                } else {
                    const errText = await res.text();
                    console.warn(`[AIExtractionService] Model ${modelConfig.name} failed (${res.status}): ${errText}`);
                    lastError = new Error(`Groq Extraction Error: ${res.status} - ${errText}`);
                }
            } catch (err) {
                console.warn(`[AIExtractionService] Network/fetch error with ${modelConfig.name}:`, err);
                lastError = err;
            }
        }

        if (!response || !response.ok) {
            throw lastError || new Error('All Groq extraction models failed.');
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

        // Pass through Medical NLP Spell-Corrector engine
        try {
            const { MedicalNLPEngine } = await import('./MedicalNLPEngine.js');
            medicines = MedicalNLPEngine.cleanExtractedMedicines(medicines);
        } catch (nlpErr) {
            console.warn('[AIExtractionService] MedicalNLPEngine cleaning warning:', nlpErr);
        }

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
