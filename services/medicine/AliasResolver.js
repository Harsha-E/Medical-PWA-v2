/**
 * @fileoverview Alias Resolver Service
 * Standardizes OCR texts and resolves known OCR corruptions, brand nicknames,
 * and manufacturer abbreviations.
 */

import { correctOcrText, correctCharacters } from '../../datasets/aliases/ocr-error-map.js';
import { resolveBrandAlias } from '../../datasets/aliases/brand-aliases.js';
import { resolveManufacturerAlias } from '../../datasets/aliases/manufacturer-aliases.js';

/**
 * @typedef {Object} AliasResolutionResult
 * @property {string} originalText - The input text
 * @property {string} normalizedText - Text after structural cleanup
 * @property {string} resolvedText - Text after replacing aliases/errors
 * @property {Record<string, string>} correctionsApplied - Map of originalWord -> correctedWord
 * @property {number} confidenceFactor - Local accuracy rating of corrections (0 to 1)
 */

export default class AliasResolver {
  constructor() {
    this.customDictionary = new Map();
  }

  /**
   * Adds custom runtime dictionary mapping overrides.
   * @param {string} raw - The raw text pattern
   * @param {string} correction - The target output
   * @returns {void}
   */
  expandDictionary(raw, correction) {
    if (raw && correction) {
      this.customDictionary.set(raw.trim().toLowerCase(), correction.trim());
    }
  }

  /**
   * Normalizes raw text casing, spacing, and character substitutions.
   * @param {string} text - Raw OCR text
   * @returns {string} Cleaned alphanumeric text
   */
  normalizeText(text) {
    if (!text) return '';
    
    // Use the error map module to binarize spacing and basic OCR letters
    let clean = correctOcrText(text);

    // Apply custom dictionary mappings
    if (this.customDictionary.size > 0) {
      const words = clean.split(/\s+/);
      const corrected = words.map(w => this.customDictionary.get(w) || w);
      clean = corrected.join(' ');
    }

    return clean;
  }

  /**
   * Performs complete entity alias resolution (Brands + Manufacturers + OCR typos).
   * @param {string} text - The raw OCR text block
   * @returns {AliasResolutionResult}
   */
  resolveAliases(text) {
    if (!text || typeof text !== 'string') {
      return {
        originalText: '',
        normalizedText: '',
        resolvedText: '',
        correctionsApplied: {},
        confidenceFactor: 1.0
      };
    }

    const cleanInput = text.trim();
    const normalizedText = this.normalizeText(cleanInput);
    
    const correctionsApplied = {};
    let resolvedText = normalizedText;
    let correctionDeduction = 0;

    // Tokenize to find word-level substitutions
    const words = normalizedText.split(/\s+/);
    const resolvedWords = words.map(word => {
      // 1. Resolve brand aliases
      const brandMatch = resolveBrandAlias(word);
      if (brandMatch && brandMatch.toLowerCase() !== word) {
        correctionsApplied[word] = brandMatch;
        correctionDeduction += 0.05; // slight trust deduction for correcting
        return brandMatch;
      }

      // 2. Resolve manufacturer aliases
      const mfgMatch = resolveManufacturerAlias(word);
      if (mfgMatch && mfgMatch.toLowerCase() !== word) {
        correctionsApplied[word] = mfgMatch;
        correctionDeduction += 0.05;
        return mfgMatch;
      }

      return word;
    });

    resolvedText = resolvedWords.join(' ');

    // Calculate confidence factor: starts at 1.0, declines slightly with the volume of heavy corrections made.
    const confidenceFactor = Math.max(0.5, parseFloat((1.0 - correctionDeduction).toFixed(2)));

    return {
      originalText: cleanInput,
      normalizedText,
      resolvedText,
      correctionsApplied,
      confidenceFactor
    };
  }
}
