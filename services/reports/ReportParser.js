/**
 * @fileoverview Report Parser Service
 * Parses raw OCR text strings to extract specific biomarker metrics (HbA1c, TSH, Blood Pressure).
 */

export default class ReportParser {
  /**
   * Parses OCR text for clinical metrics.
   * @param {string} text
   * @returns {Object} Dictionary of parsed metrics
   */
  parseOcrText(text) {
    if (!text) return {};
    const metrics = {};

    const cleanText = text.replace(/\s+/g, ' ').toLowerCase();

    // 1. HbA1c parsing (e.g. "hba1c 5.7%", "hba1c level: 6.8")
    const hba1cRegex = /hba1c\s*(?:level|value|test)?\s*(?::|-)?\s*(\d+(?:\.\d+)?)\s*%/i;
    const hba1cMatch = text.match(hba1cRegex);
    if (hba1cMatch) {
      metrics.hba1c = parseFloat(hba1cMatch[1]);
    } else {
      // Fallback without percentage symbol
      const hba1cFallback = /hba1c\s*(?:level|value|test)?\s*(?::|-)?\s*(\d+(?:\.\d+)?)\b/i;
      const fallbackMatch = text.match(hba1cFallback);
      if (fallbackMatch) {
        metrics.hba1c = parseFloat(fallbackMatch[1]);
      }
    }

    // 2. Thyroid TSH parsing (e.g. "tsh 2.45 ui/ml", "tsh level: 4.2")
    const tshRegex = /\btsh\b\s*(?:level|value)?\s*(?::|-)?\s*(\d+(?:\.\d+)?)\b/i;
    const tshMatch = text.match(tshRegex);
    if (tshMatch) {
      metrics.tsh = parseFloat(tshMatch[1]);
    }

    // 3. Blood Pressure parsing (e.g. "bp 120/80", "blood pressure: 130 / 85")
    const bpRegex = /(?:bp|blood pressure)\s*(?::|-)?\s*(\d{2,3})\s*\/\s*(\d{2,3})/i;
    const bpMatch = text.match(bpRegex);
    if (bpMatch) {
      metrics.systolic = parseInt(bpMatch[1], 10);
      metrics.diastolic = parseInt(bpMatch[2], 10);
    }

    return metrics;
  }
}
