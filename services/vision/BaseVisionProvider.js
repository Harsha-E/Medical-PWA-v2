/**
 * Abstract Base Class for Vision Providers
 */
export class BaseVisionProvider {
  /**
   * Abstract extract method
   * @param {Blob} imageBlob
   * @returns {Promise<Array>} Standardized array of medicine objects
   */
  async extract(imageBlob) {
    throw new Error('extract(imageBlob) must be implemented by subclass');
  }

  /**
   * Converts a Blob to a base64 data URL string.
   */
  blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Standardized JSON normalizer returning identical schema across all providers
   */
  normalizeMedicines(parsedData, sourceName = 'vision') {
    const list = Array.isArray(parsedData) ? parsedData : [parsedData];
    return list.map((m, i) => ({
      id: 'med_' + Date.now() + '_' + i,
      name: m.brandName || m.genericName || 'Unknown',
      brandName: m.brandName || '',
      genericName: m.genericName || '',
      dosage: m.dosage || m.dosage?.rawText || '',
      form: m.form || 'Tablet',
      totalQuantity: m.totalQuantity || m.quantity || null,
      manufacturer: m.manufacturer || '',
      instructions: m.instructions || '',
      extractedAt: new Date().toISOString(),
      source: sourceName
    }));
  }

  /**
   * Standard Extraction Prompt
   */
  getSystemPrompt() {
    return `You are an expert pharmaceutical extraction engine. Your job is to extract highly accurate data from medicine packaging images.

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
  }
}
