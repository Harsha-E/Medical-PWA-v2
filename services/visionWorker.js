/**
 * @fileoverview visionWorker.js
 * Restored Groq Vision pipeline routing through secure Cloudflare Proxy.
 */

self.onmessage = async (e) => {
    try {
        const { image_url } = e.data;
        if (!image_url) throw new Error("No image data provided");

        console.log("[Groq Worker] Sending payload...");

        const promptText = `You are an expert pharmaceutical extraction engine. Your job is to extract highly accurate data from medicine packaging.
First, read all text on the packaging silently. Then, carefully identify the PRIMARY BRAND NAME (the trade name, usually in large stylized font) and the GENERIC/CHEMICAL NAME (the active ingredient, often written below the brand name or followed by "Tablets" / "Capsules" / etc.).
Do not confuse manufacturer names (like Alkem, Sun Pharma, Cipla) with the medicine's brand or generic name.

Return ONLY a strict JSON object with this EXACT structure (no markdown, no backticks, no extra text):
{
  "brandName": "Exact Brand Name (e.g., 'Symbicort', 'Itratuf', 'Pan'. If there is no brand name, use the generic name)",
  "genericName": "Exact Generic Name/Active Ingredient/Compound. You MUST provide this if you recognize the brand (e.g. 'Bisacodyl' for 'Dulcoflex'). NEVER return null if you can infer the compound. Critical for clinical databases.",
  "dosage": {
    "rawText": "Exact printed strength (e.g., '160/4.5 μg' or '500 mg')",
    "parsed": {
      "amount": "Numeric portion only (e.g., '160/4.5' or '500')",
      "unit": "Unit portion only, normalizing greek symbols (e.g., 'mcg', 'mg', 'g', 'ml')"
    }
  },
  "form": "Dosage form (e.g., 'Tablet', 'Capsule', 'Inhaler', 'Syrup', 'Injection')",
  "totalQuantity": "Integer value of total quantity in the pack (e.g. 10, 15, 60). Look for '10 Tablets' or '120 Metered Doses'. Extract JUST the number. If unknown, output null",
  "isAsNeeded": true or false,
  "manufacturer": "Company that makes the drug (e.g., 'ALKEM', 'Pfizer')"
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

        const GROQ_KEY = self.GROQ_API_KEY || '';
        let response;
        try {
            response = await fetch('https://medcare-groq-proxy.harshaedupuganti70.workers.dev/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_KEY}`
                },
                body: JSON.stringify(payload)
            });
        } catch (err) {
            console.warn('[Groq Worker] Proxy failed, falling back to direct Groq API:', err);
        }

        if (!response || !response.ok) {
            payload.model = 'llama-3.3-70b-versatile';
            response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_KEY}`
                },
                body: JSON.stringify(payload)
            });
        }

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
