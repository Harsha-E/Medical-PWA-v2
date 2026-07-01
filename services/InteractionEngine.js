/**
 * InteractionEngine.js
 * Enterprise-Grade Local Processing Engine.
 * Features: Verbose debugging, One-Time IndexedDB Hydration, and LRU in-memory caching.
 */

export default class InteractionEngine {
    constructor() {
        this.dbName = 'MedCheck_Interactions_DB';
        this.storeName = 'interactions_store';
        this.isReady = false;
        this.db = null;
        this.cache = new Map();
        this.MAX_CACHE_SIZE = 50; 
    }

    async init(datasetUrl = '/data/indian_pharma_interactions.json') {
        console.log('[InteractionEngine] 🚀 Initialization started...');
        try {
            await this._initDB();
            
            console.log('[InteractionEngine] 🔍 Checking for existing local database...');
            const hasData = await this._checkIfDataExists();
            
            if (!hasData) {
                console.log('[InteractionEngine] ⚠️ Database is empty. First boot detected.');
                console.log(`[InteractionEngine] 📥 Streaming dataset from: ${datasetUrl}`);
                await this._fetchAndCacheDataset(datasetUrl);
            } else {
                console.log('[InteractionEngine] ✅ Local database is fully populated. SKIPPING HYDRATION.');
            }
            
            this.isReady = true;
            console.log('[InteractionEngine] 🟢 Engine is READY and active.');
        } catch (error) {
            console.error('[InteractionEngine] ❌ Critical Initialization Failure:', error);
        }
    }

    // --- Core Analysis Logic ---
    async analyze(newMedGeneric, patientProfile) {
        console.log(`[InteractionEngine] 🔬 Analyzing drug: "${newMedGeneric}" against patient profile...`);
        if (!this.isReady) {
            console.warn('[InteractionEngine] ⚠️ Engine offline or still initializing. Returning empty warnings.');
            return [];
        }

        const warnings = [];
        if (!newMedGeneric) return warnings;

        const targetDrug = this._normalize(newMedGeneric);
        console.log(`[InteractionEngine] 🧬 Normalized drug name: "${targetDrug}"`);

        // 1. Check Allergies
        if (patientProfile.allergies && Array.isArray(patientProfile.allergies)) {
            const isAllergic = patientProfile.allergies.some(allergy => 
                this._normalize(allergy).includes(targetDrug) || targetDrug.includes(this._normalize(allergy))
            );
            if (isAllergic) {
                console.warn(`[InteractionEngine] 🚨 ALLERGY DETECTED: ${newMedGeneric}`);
                warnings.push({ type: 'Allergy', severity: 'Critical', text: `Patient has a documented allergy to ${newMedGeneric}!` });
            }
        }

        // 2. Fetch specific drug profile
        const drugData = await this._getDrugData(targetDrug);

        if (!drugData) {
            console.log(`[InteractionEngine] ℹ️ No interaction profile found in database for: ${targetDrug}`);
            return warnings;
        }

        console.log(`[InteractionEngine] 📊 Drug profile found. Checking ${drugData.interactsWith?.length || 0} known interactions...`);

        // 3. Check Drug-Drug Interactions
        if (patientProfile.activeMeds && Array.isArray(drugData.interactsWith)) {
            patientProfile.activeMeds.forEach(currentMed => {
                const current = this._normalize(currentMed);
                const interaction = drugData.interactsWith.find(dd => {
                    const dbDrug = this._normalize(dd.drug);
                    return current.includes(dbDrug) || dbDrug.includes(current);
                });
                
                if (interaction) {
                    console.warn(`[InteractionEngine] 🚨 DRUG INTERACTION DETECTED: ${currentMed} + ${newMedGeneric}`);
                    warnings.push({ 
                        type: 'Drug Interaction', 
                        severity: interaction.severity, 
                        text: `Interaction with ${currentMed}: ${interaction.warning}` 
                    });
                }
            });
        }

        // 4. Check Disease Contraindications
        if (patientProfile.activeDiseases && Array.isArray(drugData.contraindications)) {
            patientProfile.activeDiseases.forEach(disease => {
                const dName = this._normalize(disease);
                const contraindication = drugData.contraindications.find(dc => {
                    const dbDisease = this._normalize(dc.disease);
                    return dName.includes(dbDisease) || dbDisease.includes(dName);
                });
                
                if (contraindication) {
                    console.warn(`[InteractionEngine] 🚨 DISEASE CONTRAINDICATION DETECTED: ${disease}`);
                    warnings.push({ 
                        type: 'Disease Warning', 
                        severity: contraindication.severity, 
                        text: `Contraindicated for ${disease}: ${contraindication.warning}` 
                    });
                }
            });
        }

        console.log(`[InteractionEngine] ✅ Analysis complete. Found ${warnings.length} warnings.`);
        return warnings;
    }

    _normalize(str) {
        if (!str) return '';
        return String(str).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    // --- IndexedDB Management ---
    _initDB() {
        return new Promise((resolve, reject) => {
            console.log('[InteractionEngine] 🗄️ Opening IndexedDB connection...');
            const request = indexedDB.open(this.dbName, 1);

            request.onupgradeneeded = (event) => {
                console.log('[InteractionEngine] 🛠️ Creating new Object Store: ' + this.storeName);
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'genericName' });
                }
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('[InteractionEngine] 🔓 IndexedDB connected successfully.');
                resolve();
            };

            request.onerror = (event) => {
                console.error('[InteractionEngine] ❌ IndexedDB connection failed:', event.target.error);
                reject(event.target.error);
            };
        });
    }

    async _checkIfDataExists() {
        return new Promise((resolve) => {
            try {
                const transaction = this.db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.count();
                
                request.onsuccess = () => {
                    console.log(`[InteractionEngine] 📊 DB Count check: Found ${request.result} records.`);
                    resolve(request.result > 0);
                };
                request.onerror = (err) => {
                    console.error('[InteractionEngine] ❌ Error checking DB count:', err);
                    resolve(false);
                };
            } catch (err) {
                console.error('[InteractionEngine] ❌ Exception checking DB count:', err);
                resolve(false);
            }
        });
    }

    async _fetchAndCacheDataset(url) {
        try {
            console.log(`[InteractionEngine] 🌐 Fetching JSON from network: ${url}`);
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            let dataset = await response.json();
            
            if (dataset.data && Array.isArray(dataset.data)) {
                console.log(`[InteractionEngine] 📦 Metadata detected. Version: ${dataset.metadata?.version || 'unknown'}`);
                dataset = dataset.data;
            }
            
            if (!Array.isArray(dataset)) {
                throw new Error("Invalid Dataset Schema: Expected Array of objects or { data: [] } wrapper.");
            }

            console.log(`[InteractionEngine] 📥 Memory loaded ${dataset.length} records. Writing to IndexedDB in chunks...`);
            await this._insertInChunks(dataset, 2500);

        } catch (error) {
            console.error('[InteractionEngine] ❌ Failed to fetch and cache dataset:', error);
            throw error;
        }
    }

    _insertInChunks(dataset, chunkSize) {
        return new Promise((resolve, reject) => {
            let index = 0;

            const processChunk = () => {
                const chunk = dataset.slice(index, index + chunkSize);
                
                if (chunk.length === 0) {
                    console.log(`[InteractionEngine] ✅ DB Write Complete: All ${dataset.length} records safely inserted.`);
                    resolve();
                    return;
                }

                console.log(`[InteractionEngine] 💾 Writing chunk ${index} to ${index + chunk.length}...`);
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                chunk.forEach(record => {
                    if (record && record.genericName) {
                        record.genericName = this._normalize(record.genericName);
                        store.put(record);
                    }
                });

                transaction.oncomplete = () => {
                    index += chunkSize;
                    setTimeout(processChunk, 0); // Yield to main thread
                };

                transaction.onerror = () => reject(transaction.error);
            };

            processChunk(); 
        });
    }

    async _getDrugData(normalizedGenericName) {
        if (this.cache.has(normalizedGenericName)) {
            console.log(`[InteractionEngine] ⚡ Cache HIT for: ${normalizedGenericName}`);
            return this.cache.get(normalizedGenericName);
        }

        console.log(`[InteractionEngine] 🐢 Cache MISS for: ${normalizedGenericName}. Querying IndexedDB...`);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction([this.storeName], 'readonly');
            const store = transaction.objectStore(this.storeName);
            const request = store.get(normalizedGenericName);

            request.onsuccess = () => {
                const result = request.result;
                if (result) {
                    console.log(`[InteractionEngine] 🎯 DB HIT for: ${normalizedGenericName}`);
                    this._addToCache(normalizedGenericName, result);
                } else {
                    console.log(`[InteractionEngine] 📭 DB MISS for: ${normalizedGenericName}`);
                }
                resolve(result);
            };
            request.onerror = (err) => reject(request.error);
        });
    }

    _addToCache(key, value) {
        if (this.cache.size >= this.MAX_CACHE_SIZE) {
            const firstKey = this.cache.keys().next().value;
            this.cache.delete(firstKey);
        }
        this.cache.set(key, value);
    }
}
