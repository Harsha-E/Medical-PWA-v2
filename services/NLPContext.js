/**
 * @fileoverview Natural Language Processing and Fuzzy String Context Service.
 * Architecture: ES6 Module, Client-Side Matrix Computation.
 * Paradigm: Edge-computed post-OCR character alignment and token vector ranking.
 * Requires: TensorFlow.js (global `tf`) loaded via CDN in index.html.
 */

import db from '../core/db.js';
import state from '../core/state.js';

/**
 * @typedef {Object} OCRCorrectionResult
 * @property {string} candidate - The cleaned token extracted from raw text.
 * @property {string|null} matched - The closest dictionary matched drug name string, or null.
 * @property {number} confidence - The similarity coefficient score (0.0 to 1.0).
 */

/**
 * @typedef {Object} FuzzyMatchResult
 * @property {string|null} matched - The absolute top match exceeding thresholds.
 * @property {number} score - The structural matching score evaluated for the top candidate.
 * @property {string[]} candidates - Array of top 5 dictionary matched candidates.
 */

class NLPContext {
    constructor() {
        /**
         * Flat array containing authoritative drug name vocabulary list.
         * @private
         * @type {string[]}
         */
        this._drugIndex = [];

        /**
         * Inverted index structure mapping bigram tokens to matched drug name sets.
         * @private
         * @type {Map<string, Set<string>>}
         */
        this._bigrams = new Map();

        /**
         * Tracks status of background TensorFlow runtime engine layers.
         * @private
         * @type {boolean}
         */
        this._modelReady = false;

        /**
         * Statically matched vocabulary domain array for character distribution calculations.
         * @private
         * @type {string[]}
         */
        this._charVocabulary = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
    }

    /**
     * Rehydrates memory layers with target catalog arrays and initializes the TF context.
     * @param {string[]} drugIndexArray - Flat domain list containing verified drug names.
     * @returns {Promise<void>} Resolves when indices are fully warmed and parsed.
     * @throws {TypeError} If provided parameter is not a structured array format.
     */
    async hydrate(drugIndexArray) {
        if (!Array.isArray(drugIndexArray)) {
            throw new TypeError('[NLP Context] Hydration parameters must be encapsulated in a flat array format.');
        }

        this._drugIndex = drugIndexArray;
        this._bigrams.clear();

        let uniqueBigramCount = 0;

        // Populate Character-level Bigram Inverted Index Maps
        for (const drugName of this._drugIndex) {
            const parsedBigrams = this._generateBigrams(drugName);
            
            for (const bigram of parsedBigrams) {
                if (!this._bigrams.has(bigram)) {
                    this._bigrams.set(bigram, new Set());
                    uniqueBigramCount++;
                }
                this._bigrams.get(bigram).add(drugName.toUpperCase());
            }
        }

        // Initialize and warm local hardware-accelerated Tensors
        try {
            if (typeof tf !== 'undefined') {
                await tf.ready();
                this._modelReady = true;
            } else {
                console.warn('[NLP Engine] WebGPU/WebGL Tensor acceleration layers unavailable. Falling back to CPU vector matching.');
            }
        } catch (tensorError) {
            console.error('[NLP Engine] Failure occurred during Tensor stack initialization:', tensorError);
            this._modelReady = false;
        }

    }

    /**
     * Isolates medication terms from structured text blocks using custom token rules.
     * @param {string} rawText - Unfiltered string chunk extracted by vision pipelines.
     * @returns {OCRCorrectionResult} Standardized data payload containing validation stats.
     */
    correctOCRText(rawText) {
        if (!rawText || typeof rawText !== 'string') {
            return { candidate: '', matched: null, confidence: 0 };
        }

        // Step 1 — Line Filter Sequence
        const structuredLines = rawText.split(/\r?\n/);
        const metadataKeywords = /batch|lot|exp|mfg|date|serial|phone|rx|ndc/i;
        const datePattern = /\d{2}\/\d{2,4}/;

        const filteredLines = structuredLines.filter(line => {
            const cleanLine = line.trim();
            if (cleanLine.length === 0) return false;
            if (/^\d+$/.test(cleanLine)) return false; // Purge absolute integers
            if (datePattern.test(cleanLine)) return false; // Purge expiry dates
            if (metadataKeywords.test(cleanLine)) return false; // Purge processing metadata
            return true;
        });

        // Step 2 — Token Extraction Sequence
        let extractedTokens = [];
        for (const line of filteredLines) {
            const tokensOnLine = line.split(/[\s,]+/);
            for (const token of tokensOnLine) {
                const cleanToken = token.replace(/[^a-zA-Z0-9|@]/g, '').trim();
                if (cleanToken.length >= 3) {
                    extractedTokens.push(cleanToken);
                }
            }
        }

        if (extractedTokens.length === 0) {
            return { candidate: '', matched: null, confidence: 0 };
        }

        // Isolate longest sequence token as baseline candidate
        let candidateToken = extractedTokens.reduce((longest, current) => 
            current.length > longest.length ? current : longest, ''
        );

        // Step 3 — Structural Character Normalization (Fix common OCR mistakes)
        candidateToken = candidateToken.toLowerCase()
            .replace(/0/g, 'o')
            .replace(/1/g, 'l') // Assume 1 is l in drug names mostly
            .replace(/5/g, 's')
            .replace(/8/g, 'b')
            .replace(/\|/g, 'i')
            .replace(/@/g, 'a');

        const upperCandidate = candidateToken.toUpperCase();

        // Step 4 — Contextual String Matrix Lookup (Jaccard + Bigrams)
        const validationOutput = this.matchDrugName(upperCandidate);

        return {
            candidate: upperCandidate,
            matched: validationOutput.matched,
            confidence: validationOutput.score
        };
    }

    /**
     * Executes mathematical Jaccard validation routines using localized string subsets.
     * @param {string} query - Target string parsed by correction algorithms.
     * @returns {FuzzyMatchResult} Formatted matching dataset.
     */
    matchDrugName(query) {
        const queryNormalized = query.toUpperCase().trim();
        const queryBigrams = this._generateBigrams(queryNormalized);

        if (queryBigrams.size === 0) {
            return { matched: null, score: 0, candidates: [] };
        }

        const calculatedIntersections = new Map();

        // Scan bigram intersections across dictionary keys
        for (const bigram of queryBigrams) {
            if (this._bigrams.has(bigram)) {
                for (const drugName of this._bigrams.get(bigram)) {
                    calculatedIntersections.set(
                        drugName, 
                        (calculatedIntersections.get(drugName) || 0) + 1
                    );
                }
            }
        }

        const scoringPipeline = [];

        // Compute formal Jaccard weights coefficients
        for (const [candidateName, intersectionCount] of calculatedIntersections.entries()) {
            const candidateBigrams = this._generateBigrams(candidateName);
            const unionCount = queryBigrams.size + candidateBigrams.size - intersectionCount;
            const jaccardCoefficient = intersectionCount / unionCount;

            scoringPipeline.push({
                name: candidateName,
                score: parseFloat(jaccardCoefficient.toFixed(4))
            });
        }

        // Sort records descending based on structural matching weights
        scoringPipeline.sort((elementA, elementB) => elementB.score - elementA.score);

        const isolatedTopMatches = scoringPipeline.slice(0, 5).map(item => item.name);
        const absoluteTopMatch = scoringPipeline[0];

        // Apply strict architectural safety gates matching requirement boundaries
        const passesThreshold = absoluteTopMatch && absoluteTopMatch.score >= 0.35;

        return {
            matched: passesThreshold ? absoluteTopMatch.name : null,
            score: absoluteTopMatch ? absoluteTopMatch.score : 0,
            candidates: isolatedTopMatches
        };
    }

    /**
     * Re-orders candidates lists evaluating multidimensional character vector distances via TF.
     * @param {string} query - Reference text payload.
     * @param {string[]} candidates - Array consisting of subset string elements to filter.
     * @returns {Promise<string[]>} Sorted copy containing candidates mapped by vector distance metrics.
     */
    async semanticRank(query, candidates) {
        if (!this._modelReady || typeof tf === 'undefined' || !candidates || candidates.length === 0) {
            return candidates; // Graceful structural execution fallback bypass
        }

        try {
            // Execution managed natively inside tidy boundaries preventing memory leak vulnerabilities
            return tf.tidy(() => {
                const queryVector = tf.tensor1d(this._generateBagOfCharactersVector(query));
                const queryNorm = tf.norm(queryVector);

                if (queryNorm.dataSync()[0] === 0) return candidates;

                const scalarEvaluations = candidates.map(candidate => {
                    const candidateVector = tf.tensor1d(this._generateBagOfCharactersVector(candidate));
                    const candidateNorm = tf.norm(candidateVector);

                    if (candidateNorm.dataSync()[0] === 0) {
                        return { text: candidate, similarity: 0 };
                    }

                    // Dot product identity operation mapping vector trends (Cosine Similarity)
                    const dotProductTensor = tf.sum(tf.mul(queryVector, candidateVector));
                    const scoreIdentity = tf.div(dotProductTensor, tf.mul(queryNorm, candidateNorm));
                    
                    return {
                        text: candidate,
                        similarity: scoreIdentity.dataSync()[0]
                    };
                });

                // Arrange array based on cosine similarity parameters
                scalarEvaluations.sort((itemA, itemB) => itemB.similarity - itemA.similarity);
                return scalarEvaluations.map(record => record.text);
            });
        } catch (tensorExecutionException) {
            console.error('[NLP:Semantic] System level failure detected during context tensor calculations:', tensorExecutionException);
            return candidates; // Safeguard interface structure preventing execution lockouts
        }
    }

    /**
     * Cleans text structures by stripping stopwords and special metadata variables.
     * @param {string} text - Unprocessed incoming character array.
     * @returns {string[]} Sanitized collection of segmented tokens.
     */
    tokenize(text) {
        if (!text || typeof text !== 'string') return [];

        const structuralStopwords = [
            'the', 'a', 'an', 'tablet', 'tab', 'cap', 'capsule', 
            'mg', 'ml', 'mcg', 'box', 'vial', 'pills', 'pill'
        ];

        return text.toLowerCase()
            .replace(/[^a-z0-9\s]/g, '')
            .split(/[\s]+/)
            .map(token => token.trim())
            .filter(token => token.length > 0 && !structuralStopwords.includes(token));
    }

    /**
     * Internal token slicing routine splitting characters into structural paired blocks.
     * @private
     * @param {string} inputString - Target data payload.
     * @returns {Set<string>} Deduplicated tracking collection of localized bigrams.
     */
    _generateBigrams(inputString) {
        const bigramSet = new Set();
        const cleansedTarget = inputString.toLowerCase().replace(/[^a-z0-9]/g, '');

        for (let idx = 0; idx < cleansedTarget.length - 1; idx++) {
            bigramSet.add(cleansedTarget.substring(idx, idx + 2));
        }

        return bigramSet;
    }

    /**
     * Generates an array mapping the frequency distribution of characters inside vocabulary constraints.
     * @private
     * @param {string} targetString - Target processing string.
     * @returns {number[]} Mathematical vector matrix representation.
     */
    _generateBagOfCharactersVector(targetString) {
        const vectorProfile = new Array(this._charVocabulary.length).fill(0);
        const normalizedInput = targetString.toLowerCase();

        for (let idx = 0; idx < normalizedInput.length; idx++) {
            const vocabularyPosition = this._charVocabulary.indexOf(normalizedInput[idx]);
            if (vocabularyPosition !== -1) {
                vectorProfile[vocabularyPosition]++;
            }
        }

        return vectorProfile;
    }

    /**
     * Process conversational natural language queries over clinical data
     * @param {string} query
     * @returns {Promise<string>}
     */
    async processQuery(query) {
        if (!query) return '';
        
        const userId = state.user?.uid || 'anonymous';
        const lowerQuery = query.toLowerCase();
        
        // Intent: Medication Adherence / Check
        if (lowerQuery.includes('did i take') || lowerQuery.includes('have i taken') || lowerQuery.includes('did i miss')) {
            const drugMatch = await this._extractDrugName(lowerQuery);
            const today = new Date().toISOString().split('T')[0];
            
            if (drugMatch) {
                const doses = await db.doses.filter(d => d.medicationId === drugMatch.id && (d.userId === userId || !d.userId)).toArray();
                const todayDose = doses.find(d => typeof d.takenAt === 'string' && d.takenAt.startsWith(today));
                
                if (todayDose) {
                    if (todayDose.skipped) {
                        return `You marked ${drugMatch.name} as SKIPPED today.`;
                    }
                    const timeStr = new Date(todayDose.takenAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    return `Yes, you recorded taking ${drugMatch.name} today at ${timeStr}.`;
                } else {
                    return `I couldn't find any record of you taking ${drugMatch.name} today.`;
                }
            } else {
                const allDoses = await db.doses.filter(d => (d.userId === userId || !d.userId) && typeof d.takenAt === 'string' && d.takenAt.startsWith(today)).toArray();
                if (allDoses.length > 0) {
                    return `You have recorded ${allDoses.length} dose(s) today. Check your dashboard timeline for details.`;
                }
                return "I couldn't find any recorded doses for today. Could you specify the exact medication name?";
            }
        }

        // Intent: Fetch Document / Discharge Summary
        if (lowerQuery.includes('discharge') || lowerQuery.includes('report') || lowerQuery.includes('summary')) {
            const docs = await db.history.filter(h => h.userId === userId).toArray();
            const match = docs.find(d => d.title.toLowerCase().includes('discharge') || d.type.toLowerCase().includes('document') || d.notes?.toLowerCase().includes('discharge'));
            
            if (match) {
                return `I found a matching clinical record: "${match.title}" dated ${match.date}. You can find it in your Medical Records.`;
            }
            return "I searched your secure vault but couldn't find any discharge summaries or related reports.";
        }

        // Intent: General Medications List
        if (lowerQuery.includes('what meds') || lowerQuery.includes('what medications') || lowerQuery.includes('my active meds')) {
            const activeMeds = await db.medications.toArray();
            const myMeds = activeMeds.filter(m => (m.userId === userId || !m.userId) && m.active !== false);
            
            if (myMeds.length > 0) {
                const names = myMeds.map(m => m.name).join(', ');
                return `You currently have ${myMeds.length} active medications: ${names}.`;
            }
            return "You don't have any active medications recorded in your profile.";
        }

        // Intent: Allergies
        if (lowerQuery.includes('allergies') || lowerQuery.includes('allergic to')) {
            const profileAllergies = state.userProfile?.profile?.allergies || [];
            const historyDocs = await db.history.filter(h => h.userId === userId).toArray();
            const addedAllergies = historyDocs.filter(h => h.type === 'Allergy').map(a => a.title);
            const allAllergies = [...profileAllergies, ...addedAllergies];

            if (allAllergies.length > 0) {
                return `Your recorded allergies are: ${allAllergies.join(', ')}.`;
            }
            return "You have no allergies recorded in your profile.";
        }

        // Fallback
        return "I'm your clinical orchestrator. I can check your medication adherence, summarize your allergies, or pull up documents from your vault. How can I assist you?";
    }

    async _extractDrugName(query) {
        const activeMeds = await db.medications.toArray();
        for (const med of activeMeds) {
            if (query.includes(med.name.toLowerCase())) {
                return med;
            }
        }
        return null;
    }
}

// Export singleton instance of NLP Processing Engine
export const nlpContext = new NLPContext();