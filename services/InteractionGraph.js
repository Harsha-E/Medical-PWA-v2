/**
 * @fileoverview Directed Interaction Graph for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module, Adjacency List Graph.
 * Paradigm: Offline mathematical calculation of Drug-Drug Interactions (DDI) via Breadth-First Search.
 */

/**
 * @typedef {Object} InteractionDetails
 * @property {'severe'|'moderate'|'mild'} severity - The clinical severity of the interaction.
 * @property {string} mechanism - The pharmacokinetic or pharmacodynamic mechanism.
 * @property {string} evidence - Supporting clinical evidence or literature reference.
 */

/**
 * @typedef {Object} ClashPair
 * @property {string} drugA - First interacting drug.
 * @property {string} drugB - Second interacting drug.
 * @property {'severe'|'moderate'|'mild'} severity - Interaction severity.
 * @property {string} mechanism - Interaction mechanism.
 * @property {string} evidence - Interaction evidence.
 */

/**
 * @typedef {Object} InteractionSummary
 * @property {ClashPair[]} severe - List of severe interactions.
 * @property {ClashPair[]} moderate - List of moderate interactions.
 * @property {ClashPair[]} mild - List of mild interactions.
 * @property {string[]} safe - List of drugs with no known interactions in the current matrix.
 */

/**
 * Core mathematical engine for calculating drug interactions locally.
 * Utilizes a directed adjacency list to represent metabolic pathways and clashes.
 */
class InteractionGraph {
    constructor() {
        /** * The primary graph structure. Map of Maps.
         * Structure: Map<DrugA_Name, Map<DrugB_Name, InteractionDetails>>
         * @private 
         * @type {Map<string, Map<string, InteractionDetails>>} 
         */
        this._adjacencyList = new Map();
        
        this._initFallbackData();
    }

    /**
     * Injects a hardcoded payload of critical drug interactions.
     * Guarantees baseline safety checks even if the network fails to fetch the full JSON graph.
     * @private
     */
    _initFallbackData() {
        const baselineInteractions = [
            {
                drugA: 'METFORMIN', drugB: 'LISINOPRIL',
                severity: 'moderate',
                mechanism: 'Increased risk of hypoglycemia and lactic acidosis due to renal profile changes.',
                evidence: 'Clinical consensus; monitor renal function and blood glucose.'
            },
            {
                drugA: 'ATORVASTATIN', drugB: 'CLARITHROMYCIN',
                severity: 'severe',
                mechanism: 'Clarithromycin strongly inhibits CYP3A4, drastically increasing atorvastatin exposure and risk of rhabdomyolysis.',
                evidence: 'FDA Warning; Concurrent use contraindicated.'
            },
            {
                drugA: 'ASPIRIN', drugB: 'IBUPROFEN',
                severity: 'moderate',
                mechanism: 'Ibuprofen competitively binds to COX-1, negating the cardioprotective antiplatelet effect of low-dose aspirin.',
                evidence: 'AHA guidelines; take aspirin 2 hours before ibuprofen.'
            },
            {
                drugA: 'WARFARIN', drugB: 'AMIODARONE',
                severity: 'severe',
                mechanism: 'Amiodarone inhibits multiple CYP enzymes (2C9, 1A2, 3A4), significantly amplifying warfarin effects and bleeding risk.',
                evidence: 'Standard prescribing guidelines; Requires immediate INR monitoring and dose reduction.'
            },
            {
                drugA: 'SILDENAFIL', drugB: 'NITROGLYCERIN',
                severity: 'severe',
                mechanism: 'Synergistic vasodilation via the nitric oxide/cGMP pathway leading to profound, potentially fatal hypotension.',
                evidence: 'Strict absolute contraindication.'
            },
            {
                drugA: 'OMEPRAZOLE', drugB: 'CLOPIDOGREL',
                severity: 'moderate',
                mechanism: 'Omeprazole inhibits CYP2C19, preventing the conversion of clopidogrel into its active antiplatelet metabolite.',
                evidence: 'FDA Boxed Warning; Consider alternative PPI like pantoprazole.'
            },
            {
                drugA: 'LISINOPRIL', drugB: 'SPIRONOLACTONE',
                severity: 'severe',
                mechanism: 'Dual blockade/interference with the renin-angiotensin-aldosterone system (RAAS) greatly increases fatal hyperkalemia risk.',
                evidence: 'Standard monitoring required; avoid potassium supplements.'
            },
            {
                drugA: 'CIPROFLOXACIN', drugB: 'TIZANIDINE',
                severity: 'severe',
                mechanism: 'Ciprofloxacin is a potent CYP1A2 inhibitor, causing massive spikes in tizanidine plasma concentrations (hypotension/sedation).',
                evidence: 'Contraindicated; use alternative antibiotic or muscle relaxant.'
            }
        ];

        this.loadGraph(baselineInteractions);
        console.log('[InteractionGraph] Baseline fallback matrix initialized.');
    }

    /**
     * Parses and loads a JSON dataset into the adjacency list.
     * @param {Array<Object>} jsonData - Array of interaction objects.
     */
    loadGraph(jsonData) {
        if (!Array.isArray(jsonData)) {
            console.error('[InteractionGraph] loadGraph expects an array of interaction objects.');
            return;
        }

        let addedEdges = 0;

        for (const entry of jsonData) {
            try {
                if (!entry.drugA || !entry.drugB || !entry.severity) continue;

                const interactionDetails = {
                    severity: entry.severity.toLowerCase(),
                    mechanism: entry.mechanism || 'Mechanism unspecified.',
                    evidence: entry.evidence || 'Evidence unspecified.'
                };

                // Drug interactions are inherently bi-directional clinically.
                // We add directed edges in both directions to ensure graph traversal catches it regardless of entry point.
                this.addEdge(entry.drugA, entry.drugB, interactionDetails);
                this.addEdge(entry.drugB, entry.drugA, interactionDetails);
                
                addedEdges += 2;
            } catch (parseError) {
                console.warn('[InteractionGraph] Failed to parse graph edge:', parseError);
            }
        }

        console.log(`[InteractionGraph] Successfully loaded ${addedEdges} directed edges into memory.`);
    }

    /**
     * Appends a directed edge between two nodes in the graph.
     * @param {string} sourceDrug - The origin node.
     * @param {string} targetDrug - The destination node.
     * @param {InteractionDetails} interaction - The mathematical weight/data of the edge.
     */
    addEdge(sourceDrug, targetDrug, interaction) {
        if (!sourceDrug || !targetDrug) return;

        const normalizedSource = sourceDrug.toUpperCase().trim();
        const normalizedTarget = targetDrug.toUpperCase().trim();

        if (!this._adjacencyList.has(normalizedSource)) {
            this._adjacencyList.set(normalizedSource, new Map());
        }

        this._adjacencyList.get(normalizedSource).set(normalizedTarget, interaction);
    }

    /**
     * Executes a Breadth-First Search (BFS) to identify all clashes within a specific list of medications.
     * Constrains the search bounds strictly to the provided list to optimize mobile CPU time.
     * @param {string[]} patientDrugList - Array of drug names currently taken by the patient.
     * @returns {ClashPair[]} An array of identified interaction pairs.
     */
    findInteractions(patientDrugList) {
        if (!Array.isArray(patientDrugList) || patientDrugList.length < 2) {
            return [];
        }

        const normalizedList = patientDrugList.map(drugName => drugName.toUpperCase().trim());
        const discoveredClashes = [];
        const processedEdges = new Set();

        for (const originNode of normalizedList) {
            if (!this._adjacencyList.has(originNode)) continue;

            // BFS Initialization
            const traversalQueue = [originNode];
            const visitedNodes = new Set([originNode]);

            while (traversalQueue.length > 0) {
                const currentNode = traversalQueue.shift();
                const neighborEdges = this._adjacencyList.get(currentNode);

                if (!neighborEdges) continue;

                for (const [neighborNode, interactionData] of neighborEdges.entries()) {
                    // We only care if the neighboring clash is actually a drug the patient is taking
                    if (normalizedList.includes(neighborNode)) {
                        
                        // Create a bidirectional hash to prevent logging A->B and B->A as two separate clashes
                        const edgeHash = [currentNode, neighborNode].sort().join('::');
                        
                        if (!processedEdges.has(edgeHash)) {
                            processedEdges.add(edgeHash);
                            discoveredClashes.push({
                                drugA: currentNode,
                                drugB: neighborNode,
                                severity: interactionData.severity,
                                mechanism: interactionData.mechanism,
                                evidence: interactionData.evidence
                            });
                        }
                    }

                    // Continue BFS traversal down the metabolic pathway ONLY if the neighbor is in the patient's list
                    // This prevents the algorithm from endlessly crawling the entire 200,000 node FDA database
                    if (normalizedList.includes(neighborNode) && !visitedNodes.has(neighborNode)) {
                        visitedNodes.add(neighborNode);
                        traversalQueue.push(neighborNode);
                    }
                }
            }
        }

        return discoveredClashes;
    }

    /**
     * Transforms the raw BFS clash data into a categorized, UI-ready summary object.
     * @param {string[]} patientDrugList - Array of drug names.
     * @returns {InteractionSummary}
     */
    getInteractionSummary(patientDrugList) {
        const rawClashes = this.findInteractions(patientDrugList);
        
        const summaryBucket = {
            severe: [],
            moderate: [],
            mild: [],
            safe: []
        };

        const interactingDrugsSet = new Set();

        // Bucket the clashes
        for (const clash of rawClashes) {
            if (summaryBucket[clash.severity]) {
                summaryBucket[clash.severity].push(clash);
            } else {
                // Fallback for malformed data
                summaryBucket.moderate.push(clash); 
            }
            
            interactingDrugsSet.add(clash.drugA);
            interactingDrugsSet.add(clash.drugB);
        }

        // Identify completely safe drugs (no edges found within the current graph subset)
        for (const drugName of patientDrugList) {
            const normalizedName = drugName.toUpperCase().trim();
            if (!interactingDrugsSet.has(normalizedName)) {
                summaryBucket.safe.push(normalizedName);
            }
        }

        // Sort sub-arrays alphabetically by Drug A for predictable UI rendering
        summaryBucket.severe.sort((a, b) => a.drugA.localeCompare(b.drugA));
        summaryBucket.moderate.sort((a, b) => a.drugA.localeCompare(b.drugA));
        summaryBucket.mild.sort((a, b) => a.drugA.localeCompare(b.drugA));
        summaryBucket.safe.sort((a, b) => a.localeCompare(b));

        return summaryBucket;
    }
}

// Export singleton instance to preserve memory across the application lifecycle
export const interactionGraph = new InteractionGraph();