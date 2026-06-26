/**
 * @fileoverview visionWorker.js
 * Restored Groq Vision pipeline using the valid API key and Strict Payload formatting.
 */

self.onmessage = async (e) => {
    try {
        const { image_url } = e.data;
        if (!image_url) throw new Error("No image data provided");

        console.log("[Groq Worker] Sending payload...");

        const promptText = `You are a medical OCR extraction engine. Analyze this image of a medicine package.
Identify the primary brand name AND the generic/chemical name. 
CRITICAL: Heavily isolate the primary brand name (e.g., "Symbicort", "Pan", "Itratuf") and the generic/active ingredient (e.g., "Itraconazole", "Pantoprazole"). Check for manufacturer/company names as well (e.g., Alkem). If a company name is found, carefully rescan the text to ensure you capture the actual medicine generic name.

Return ONLY a pure JSON object in this exact format, with no markdown formatting or extra text:
{
  "brandName": "isolated brand name here (if missing, use the generic name)",
  "genericName": "isolated generic/chemical name here (critical for database matching)",
  "dosage": {
    "rawText": "exactly what is printed on label, e.g., '160/4.5 μg' or '100 mg'",
    "parsed": {
      "amount": "pure number or ratio string e.g., '160/4.5' or '100'",
      "unit": "translate greek symbols like μg to mcg, e.g., 'mcg', 'mg', 'g', 'ml'"
    }
  },
  "form": "e.g., Tablet, Inhaler, Liquid, Capsule",
  "totalQuantity": "integer only (look explicitly for 'Doses', 'Puffs', 'Metered actuations', or 'Tablets' on the label and extract JUST the number, e.g. 60 or 120)",
  "isAsNeeded": true or false (boolean, true if PRN / 'as needed' is indicated),
  "manufacturer": "any manufacturer found (e.g. ALKEM)"
}`;

        const payload = {
            model: 'meta-llama/llama-4-scout-17b-16e-instruct',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: promptText },
                        { type: 'image_url', image_url: { url: image_url } }
                    ]
                }
            ],
            temperature: 0.1,
            max_tokens: 500
        };

        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer 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',
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Groq API Error: ${response.status} - ${errText}`);
        }

        const data = await response.json();
        console.log("[Groq] Raw Response Received:", data);
        let content = data.choices[0].message.content;

        // Clean up any markdown blocks if the LLM hallucinated them
        content = content.replace(/```json/gi, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(content);
        self.postMessage(parsed);

    } catch (error) {
        console.error("[Groq Worker] Fetch failed:", error);
        self.postMessage({ error: error.message });
    }
};
