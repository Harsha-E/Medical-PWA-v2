/**
 * @fileoverview Medicine Matcher Service
 * Core drug identification engine. Integrates Fuse.js, resolves entities, and calculates
 * weighted match scores across brands, generic ingredients, dosages, and manufacturers.
 */

import Fuse from 'https://esm.sh/fuse.js@7.0.0';
import BrandResolver from './BrandResolver.js';
import GenericNameResolver from './GenericNameResolver.js';
import ManufacturerResolver from './ManufacturerResolver.js';
import AliasResolver from './AliasResolver.js';

/**
 * @typedef {Object} MatchQuery
 * @property {string} rawText - Combined text block
 * @property {string} [brand] - Extracted brand name
 * @property {string} [generic] - Extracted generic name
 * @property {string} [manufacturer] - Extracted manufacturer
 * @property {string} [dosage] - Extracted dosage (e.g. '500mg')
 */

/**
 * @typedef {Object} MatchCandidate
 * @property {any} drugRecord - Original record from the dataset
 * @property {number} matchConfidence - Calculated confidence score (0-100)
 * @property {Object} matchDetails - Explanation of which fields matched
 * @property {string} matchDetails.matchedField - 'brandName', 'genericName', 'alias', etc.
 * @property {number} matchDetails.distance - Jaro/Levenshtein similarity
 */

export default class MedicineMatcher {
  /**
   * Initializes the matcher engine.
   * @param {any[]} dataset - Master medicine database
   */
  constructor(dataset) {
    if (!Array.isArray(dataset)) {
      throw new Error('[MedicineMatcher] Constructor requires a valid dataset array.');
    }
    
    this.dataset = dataset;
    this.cache = new Map();

    this.brandResolver = new BrandResolver();
    this.genericResolver = new GenericNameResolver();
    this.mfgResolver = new ManufacturerResolver();
    this.aliasResolver = new AliasResolver();

    // Configure Fuse.js options
    this.fuse = new Fuse(this.dataset, {
      keys: [
        { name: 'name', weight: 0.7 },        // Generic name
        { name: 'brandNames', weight: 0.8 },  // Brand names array
        { name: 'aliases', weight: 0.5 }      // Aliases array
      ],
      threshold: 0.35,
      distance: 100,
      includeScore: true
    });
  }

  /**
   * Performs multi-stage matching against the medicine database.
   * @param {string|MatchQuery} query - Raw string or pre-parsed query fields
   * @returns {MatchCandidate[]} Sorted list of matched candidates
   */
  matchMedicine(query) {
    if (!query) return [];

    // Resolve cache if query is a simple string
    const cacheKey = typeof query === 'string' ? query.trim().toLowerCase() : JSON.stringify(query);
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    // 1. Normalize Query Structure
    /** @type {MatchQuery} */
    let matchQuery;
    if (typeof query === 'string') {
      const resolvedAlias = this.aliasResolver.resolveAliases(query);
      const normalizedStr = resolvedAlias.resolvedText;

      const brandResult = this.brandResolver.resolveBrand(normalizedStr, this.dataset);
      const genericResults = this.genericResolver.resolveGeneric(normalizedStr, this.dataset);
      const mfgResult = this.mfgResolver.resolveManufacturer(normalizedStr);
      
      // Extract dosage e.g. "500mg" or "10ml"
      const dosageRegex = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|ml|g)\b/i;
      const dosageMatch = normalizedStr.match(dosageRegex);

      matchQuery = {
        rawText: normalizedStr,
        brand: brandResult ? brandResult.brandName : undefined,
        generic: genericResults.length > 0 ? genericResults[0].genericName : undefined,
        manufacturer: mfgResult ? mfgResult.manufacturerName : undefined,
        dosage: dosageMatch ? dosageMatch[0].trim() : undefined
      };
    } else {
      matchQuery = {
        rawText: query.rawText || '',
        brand: query.brand,
        generic: query.generic,
        manufacturer: query.manufacturer,
        dosage: query.dosage
      };
    }

    let rawCandidates = [];
    if (matchQuery.manufacturer) {
      // 1. Try narrowing search space by manufacturer
      rawCandidates = this._performMatching(matchQuery, true);
    }
    
    // 2. If no candidate found (or manufacturer was missing/misread), search the full dataset
    if (rawCandidates.length === 0) {
      rawCandidates = this._performMatching(matchQuery, false);
    }

    // --- STAGE 3: Re-Scoring and Ranking ---
    const rankedCandidates = this.rankCandidates(rawCandidates, matchQuery);

    // Save to Cache (cap at 100 cache entries)
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(cacheKey, rankedCandidates);

    return rankedCandidates;
  }

  /**
   * Sorts candidate matches, re-grading confidence scores with weighted attributes.
   * @param {MatchCandidate[]} candidates - List of match candidates
   * @param {MatchQuery} matchQuery - Original parsed query details
   * @returns {MatchCandidate[]} Sorted and filtered list
   */
  rankCandidates(candidates, matchQuery) {
    if (!Array.isArray(candidates)) return [];

    return candidates
      .map(cand => {
        const confidence = this.calculateMatchConfidence(cand.drugRecord, matchQuery);
        return {
          ...cand,
          matchConfidence: confidence
        };
      })
      .filter(cand => cand.matchConfidence >= 35) // Filter out weak matches
      .sort((a, b) => b.matchConfidence - a.matchConfidence);
  }

  /**
   * Multi-dimensional scoring weights.
   * @param {any} drugRecord - Database record
   * @param {MatchQuery} query - Extracted parameters
   * @returns {number} Fused match confidence (0-100)
   */
  calculateMatchConfidence(drugRecord, query) {
    if (!drugRecord || !query) return 0;

    let score = 0;

    // Weights: Brand (40%), Generic (30%), Manufacturer (15%), Dosage (15%)
    const WEIGHTS = {
      brand: 0.40,
      generic: 0.30,
      mfg: 0.15,
      dosage: 0.15
    };

    // 1. Brand Score (exact or fuzzy)
    if (query.brand) {
      const brandLower = query.brand.toLowerCase();
      const brands = drugRecord.brandNames || (drugRecord.brandName ? [drugRecord.brandName] : []);
      const bestBrandSim = brands.reduce((max, b) => {
        const sim = this._getStringSimilarity(brandLower, b.toLowerCase());
        return Math.max(max, sim);
      }, 0);
      score += (bestBrandSim * 100) * WEIGHTS.brand;
    }

    // 2. Generic Ingredient Score
    const recordGeneric = (drugRecord.genericName || drugRecord.name || '').toLowerCase();
    if (query.generic && recordGeneric) {
      const genericLower = query.generic.toLowerCase();
      const genericSim = this._getStringSimilarity(genericLower, recordGeneric);
      score += (genericSim * 100) * WEIGHTS.generic;
    } else if (query.rawText && recordGeneric && query.rawText.toLowerCase().includes(recordGeneric)) {
      // Substring fallback
      score += 85 * WEIGHTS.generic;
    }

    // 3. Manufacturer Match Score
    const recordMfgs = drugRecord.manufacturer || [];
    const recordMfgArray = Array.isArray(recordMfgs) ? recordMfgs : [recordMfgs];
    if (query.manufacturer && recordMfgArray.length > 0) {
      const qMfg = query.manufacturer.toLowerCase();
      const hasMfgMatch = recordMfgArray.some(m => {
        const normM = m.toLowerCase();
        return normM.includes(qMfg) || qMfg.includes(normM);
      });
      score += (hasMfgMatch ? 100 : 0) * WEIGHTS.mfg;
    } else {
      // No manufacturer query, award middle score so we don't penalize record
      score += 50 * WEIGHTS.mfg;
    }

    // 4. Dosage Match Score
    const recordDoses = drugRecord.commonDoses || [];
    if (query.dosage && recordDoses.length > 0) {
      const qDose = query.dosage.toLowerCase().replace(/\s+/g, '');
      const hasDoseMatch = recordDoses.some(d => {
        const normD = d.toLowerCase().replace(/\s+/g, '');
        return normD === qDose || normD.includes(qDose) || qDose.includes(normD);
      });
      score += (hasDoseMatch ? 100 : 30) * WEIGHTS.dosage;
    } else {
      // No dosage queried, award neutral score
      score += 50 * WEIGHTS.dosage;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  /**
   * Helper builder.
   * @private
   */
  _buildCandidate(record, query, matchedField, similarity) {
    return {
      drugRecord: record,
      matchConfidence: Math.round(similarity * 100),
      matchDetails: {
        matchedField,
        distance: similarity
      }
    };
  }

  /**
   * Helper calculation for basic similarity.
   * @private
   */
  _getStringSimilarity(s1, s2) {
    if (s1 === s2) return 1.0;
    if (s1.includes(s2) || s2.includes(s1)) {
      return 0.7 + (Math.min(s1.length, s2.length) / Math.max(s1.length, s2.length) * 0.25);
    }
    return 0;
  }

  /**
   * Performs stage 1 and stage 2 matching, optionally filtering by manufacturer.
   * @private
   */
  _performMatching(matchQuery, useMfgFilter = false) {
    const rawCandidates = [];
    const seenIds = new Set();
    
    const mfgLower = useMfgFilter && matchQuery.manufacturer ? matchQuery.manufacturer.toLowerCase() : null;
    const matchesMfg = (record) => {
      if (!mfgLower) return true;
      const recordMfgs = record.manufacturer ? (Array.isArray(record.manufacturer) ? record.manufacturer : [record.manufacturer]) : [];
      return recordMfgs.some(m => m.toLowerCase().includes(mfgLower) || mfgLower.includes(m.toLowerCase()));
    };

    // --- STAGE 1: Exact matches of Brand or Generic ---
    if (matchQuery.brand) {
      const brandLower = matchQuery.brand.toLowerCase();
      const exactBrands = this.dataset.filter(record => {
        if (!matchesMfg(record)) return false;
        const brands = record.brandNames || (record.brandName ? [record.brandName] : []);
        return brands.some(b => b.toLowerCase() === brandLower);
      });

      for (const rec of exactBrands) {
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          rawCandidates.push(this._buildCandidate(rec, matchQuery, 'brandName', 1.0));
        }
      }
    }

    if (matchQuery.generic) {
      const genericLower = matchQuery.generic.toLowerCase();
      const exactGenerics = this.dataset.filter(record => {
        if (!matchesMfg(record)) return false;
        const name = record.genericName || record.name;
        return name && name.toLowerCase() === genericLower;
      });

      for (const rec of exactGenerics) {
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          rawCandidates.push(this._buildCandidate(rec, matchQuery, 'genericName', 1.0));
        }
      }
    }

    // --- STAGE 2: Fuzzy Match via Fuse.js ---
    const searchTerms = [
      matchQuery.brand,
      matchQuery.generic,
      matchQuery.rawText
    ].filter(Boolean);

    for (const term of searchTerms) {
      const fuseResults = this.fuse.search(term);
      for (const res of fuseResults) {
        const rec = res.item;
        if (!matchesMfg(rec)) continue;
        if (!seenIds.has(rec.id)) {
          seenIds.add(rec.id);
          const similarity = 1 - (res.score || 0);
          rawCandidates.push(this._buildCandidate(rec, matchQuery, 'fuzzySearch', similarity));
        }
      }
    }

    return rawCandidates;
  }
}
