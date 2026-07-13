/**
 * InteractionEngine.js
 * Enterprise-Grade Local Processing Engine.
 * Features: Verbose debugging, One-Time IndexedDB Hydration, and LRU in-memory caching.
 */

export default class InteractionEngine {
    constructor() {
        this.dbName = 'MedCheck_Interactions_DB_v2';
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

        let targetDrug = this._normalize(newMedGeneric);
        let activeMedsResolved = [];

        // Attempt to resolve brand names to generic names using Dexie IndexedDB
        try {
            const { default: db } = await import('../core/db.js');
            
            const resolveName = async (name) => {
                if (!name) return name;
                const match = await db.medicines.where('name').equalsIgnoreCase(name).first();
                if (match && match.genericName) {
                    return this._normalize(match.genericName);
                }
                return this._normalize(name);
            };

            targetDrug = await resolveName(newMedGeneric);
            if (patientProfile.activeMeds) {
                const resolvedPromises = patientProfile.activeMeds.map(med => resolveName(med));
                activeMedsResolved = await Promise.all(resolvedPromises);
            }
        } catch (e) {
            console.warn('[InteractionEngine] Could not connect to Dexie for brand resolution.', e);
            targetDrug = this._normalize(newMedGeneric);
            if (patientProfile.activeMeds) activeMedsResolved = patientProfile.activeMeds.map(m => this._normalize(m));
        }

        console.log(`[InteractionEngine] 🧬 Resolved target drug name: "${targetDrug}"`);

        // 0. Duplicate Therapy Check
        if (activeMedsResolved.length > 0) {
            const isDuplicate = activeMedsResolved.some(current => current === targetDrug);
            if (isDuplicate) {
                console.warn(`[InteractionEngine] 🚨 DUPLICATE THERAPY DETECTED: ${newMedGeneric}`);
                warnings.push({
                    type: 'Duplicate Therapy',
                    severity: 'Critical',
                    text: `You are already taking a medication containing ${newMedGeneric}. Taking multiple medications with the same active compound can lead to a dangerous overdose!`
                });
            }
        }

        // 1. Check Allergies
        if (patientProfile.allergies && Array.isArray(patientProfile.allergies)) {
            const isAllergic = patientProfile.allergies.some(allergy => 
                this._isMatch(this._normalize(allergy), targetDrug)
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
        if (activeMedsResolved.length > 0 && Array.isArray(drugData.interactsWith)) {
            activeMedsResolved.forEach(current => {
                const interaction = drugData.interactsWith.find(dd => {
                    const dbDrug = this._normalize(dd.drug);
                    return this._isMatch(current, dbDrug);
                });
                
                if (interaction) {
                    console.warn(`[InteractionEngine] 🚨 DRUG INTERACTION DETECTED: ${current} + ${newMedGeneric}`);
                    warnings.push({ 
                        type: 'Drug Interaction', 
                        severity: interaction.severity, 
                        text: `Interaction with ${current}: ${interaction.warning || interaction.mechanism || interaction.recommendation || 'Potential adverse effect detected.'}` 
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
                    return this._isMatch(dName, dbDisease);
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

    async analyzeProfile(patientProfile) {
        console.log(`[InteractionEngine] 🔬 Analyzing entire patient profile...`);
        if (!this.isReady) return [];
        const warnings = [];
        const meds = patientProfile.activeMeds || [];
        
        for (let i = 0; i < meds.length; i++) {
            const drug1 = meds[i];
            
            // 1. Check Diseases and Allergies for drug1
            const profileWithoutMeds = { activeMeds: [], activeDiseases: patientProfile.activeDiseases, allergies: patientProfile.allergies };
            const specificWarnings = await this.analyze(drug1, profileWithoutMeds);
            specificWarnings.forEach(w => {
                warnings.push({ ...w, drug1: drug1, drug2: 'Profile' });
            });
            
            // 2. Check Drug-Drug against remaining meds (to avoid A->B and B->A duplicates)
            const drugData = await this._getDrugData(this._normalize(drug1));
            if (drugData && Array.isArray(drugData.interactsWith)) {
                for (let j = i + 1; j < meds.length; j++) {
                    const drug2 = meds[j];
                    const target = this._normalize(drug2);
                    const interaction = drugData.interactsWith.find(dd => {
                        const dbDrug = this._normalize(dd.drug);
                        return this._isMatch(target, dbDrug);
                    });
                    if (interaction) {
                        warnings.push({
                            type: 'Drug Interaction',
                            severity: interaction.severity,
                            text: `Interaction between ${drug1} and ${drug2}: ${interaction.warning}`,
                            drug1: drug1,
                            drug2: drug2
                        });
                    }
                }
            }
            
            // 3. Duplicate Therapy Check
            const targetDrug = this._normalize(drug1);
            for (let j = i + 1; j < meds.length; j++) {
                const current = this._normalize(meds[j]);
                if (current === targetDrug) {
                    warnings.push({
                        type: 'Duplicate Therapy',
                        severity: 'Critical',
                        text: `You are taking multiple medications containing ${targetDrug}. Taking multiple medications with the same active compound can lead to a dangerous overdose!`,
                        drug1: drug1,
                        drug2: meds[j]
                    });
                }
            }
        }
        
        console.log(`[InteractionEngine] ✅ Profile Analysis complete. Found ${warnings.length} warnings.`);
        return warnings;
    }

    _normalize(str) {
        if (!str) return '';
        return String(str).toLowerCase().replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
    }

    _isMatch(str1, str2) {
        if (!str1 || !str2) return false;
        if (str1 === str2) return true;
        // _normalize strips regex special chars, making this safe
        const regex1 = new RegExp(`\\b${str1}\\b`, 'i');
        const regex2 = new RegExp(`\\b${str2}\\b`, 'i');
        return regex1.test(str2) || regex2.test(str1);
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
                if (index >= dataset.length) {
                    console.log(`[InteractionEngine] ✅ DB Write Complete: All ${dataset.length} records safely inserted.`);
                    resolve();
                    return;
                }

                const end = Math.min(index + chunkSize, dataset.length);
                console.log(`[InteractionEngine] 💾 Writing chunk ${index} to ${end}...`);
                const transaction = this.db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                
                for (let i = index; i < end; i++) {
                    const record = dataset[i];
                    if (record && record.genericName) {
                        record.genericName = this._normalize(record.genericName);
                        store.put(record);
                    }
                }

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
