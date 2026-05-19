/**
 * @fileoverview Database Engine Service for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module, Dexie.js Wrapper.
 * Paradigm: Offline-First Edge Data Storage with ACID Transactions.
 * Requires: Dexie available on the global window object via index.html CDN.
 */

// ============================================================================
// TYPE DEFINITIONS (TypeScript-Style JSDoc)
// ============================================================================

/**
 * @typedef {Object} Medication
 * @property {number} [id] - Auto-incremented primary key.
 * @property {string} name - Brand name of the medication.
 * @property {string} genericName - Scientific/generic compound identifier.
 * @property {string} category - Therapeutic class (e.g., 'antibiotic', 'statin').
 * @property {string} dosage - Quantitative strength metric (e.g., '500mg').
 * @property {string} frequency - Dosing intervals ('once_daily'|'twice_daily'|'thrice_daily'|'as_needed').
 * @property {string[]} activeDays - Calendar constraints e.g., ['mon','wed','fri'].
 * @property {string[]} scheduledTimes - Precise daily alarms in 24h string format ['08:00','20:00'].
 * @property {string} startDate - Therapy start window in ISO date format.
 * @property {string|null} endDate - Therapy conclusion window or null if permanent.
 * @property {string} notes - Direct patient administrative guidance directives.
 * @property {string} createdAt - Explicit ledger ingestion ISO datetime string.
 */

/**
 * @typedef {Object} DoseLog
 * @property {number} [id] - Auto-incremented primary key.
 * @property {number} medicationId - Foreign relational key linking to parent Medication record.
 * @property {string|null} scheduledAt - Theoretical target administration window in ISO format.
 * @property {string} takenAt - Real-time physical ingestion action stamp in ISO format.
 * @property {string} status - Ingestion verification state flag ('taken'|'missed'|'skipped').
 * @property {string} notes - Anomalous logging metadata notes.
 * @property {string} createdAt - Ledger insertion validation time string.
 */

/**
 * @typedef {Object} UserProfile
 * @property {number} [id] - Auto-incremented primary key.
 * @property {string} key - Unique key index string for configuration state values.
 * @property {any} value - Polymorphic configuration data block.
 */

/**
 * @typedef {Object} Alert
 * @property {number} [id] - Auto-incremented primary key.
 * @property {string} type - System alert categorizations (e.g., 'interaction', 'missed_dose').
 * @property {string} severity - Critical clinical tiering score ('high'|'medium'|'low').
 * @property {number[]} medicationIds - Array pointer cross-referencing clashing nodes.
 * @property {string} message - Descriptive warning summary block text.
 * @property {string} createdAt - Ingestion ledger date string.
 * @property {boolean} dismissed - Acknowledged visualization flag toggled by interface actions.
 */

/**
 * @typedef {Object} SyncLog
 * @property {number} [id] - Auto-incremented primary key.
 * @property {string} peerId - WebRTC hash signature of the collaborating client node.
 * @property {string} syncedAt - Transaction timeline ISO log entry stamp.
 * @property {string} delta - Compressed, stringified JSON representing the merged CRDT mutation vector.
 */

// ============================================================================
// DATABASE ENGINE IMPLEMENTATION
// ============================================================================

class DatabaseEngine {
    constructor() {
        if (typeof Dexie === 'undefined') {
            console.error('[DatabaseEngine] Critical Error: Dexie core binary missing from window namespace.');
        }
        
        this.db = new Dexie('MedCare_OfflineDB');
        this._initSchema();
    }

    /**
     * Instantiates declarative stores. Version parameter incremented to 2 
     * to purge corrupt object store layouts gracefully on client devices.
     * @private
     */
    _initSchema() {
        this.db.version(2).stores({
            medications: '++id, name, genericName, category, *activeDays',
            doseLogs: '++id, medicationId, takenAt, scheduledAt, status, [medicationId+takenAt]',
            userProfile: '++id, key',
            alerts: '++id, type, severity, *medicationIds, createdAt, dismissed',
            syncLog: '++id, peerId, syncedAt, delta'
        });

        console.log('[DatabaseEngine] Schema version 2 registered successfully.');
    }

    /**
     * Programmatic hook to force IndexedDB connection initialization.
     * Called during application bootstrap routing loops.
     * @returns {Promise<void>} Resolves when connection layer is established.
     */
    async open() {
        try {
            await this.db.open();
            console.log('[DatabaseEngine] Database connection opened.');
        } catch (error) {
            console.error('[DatabaseEngine Fatal] Connection attempt rejected:', error);
            throw error;
        }
    }

    // ============================================================================
    // MEDICATIONS API
    // ============================================================================

    /**
     * @param {Omit<Medication, 'id'|'createdAt'>} medicationData 
     * @returns {Promise<number>} Generated medication integer reference key.
     */
    async addMedication(medicationData) {
        try {
            const packedRecord = {
                ...medicationData,
                createdAt: new Date().toISOString()
            };
            return await this.db.medications.add(packedRecord);
        } catch (error) {
            console.error('[DatabaseEngine:addMedication] Operation rejected:', error);
            throw error;
        }
    }

    /**
     * @param {number} id 
     * @returns {Promise<Medication|null>}
     */
    async getMedication(id) {
        try {
            const match = await this.db.medications.get(id);
            return match || null;
        } catch (error) {
            console.error(`[DatabaseEngine:getMedication] Failed fetching ID ${id}:`, error);
            throw error;
        }
    }

    /**
     * @returns {Promise<Medication[]>}
     */
    async getAllMedications() {
        try {
            return await this.db.medications.toArray();
        } catch (error) {
            console.error('[DatabaseEngine:getAllMedications] Select all query failed:', error);
            throw error;
        }
    }

    /**
     * @param {number} id 
     * @param {Partial<Medication>} changes 
     * @returns {Promise<void>}
     */
    async updateMedication(id, changes) {
        try {
            await this.db.medications.update(id, changes);
        } catch (error) {
            console.error(`[DatabaseEngine:updateMedication] Write cycle failed on target ${id}:`, error);
            throw error;
        }
    }

    /**
     * Cascade Transaction: Permanently purges target drug definition along with all linked telemetry entries.
     * @param {number} id 
     * @returns {Promise<void>}
     */
    async deleteMedication(id) {
        try {
            await this.db.transaction('rw', this.db.medications, this.db.doseLogs, async () => {
                await this.db.doseLogs.where('medicationId').equals(id).delete();
                await this.db.medications.delete(id);
            });
        } catch (error) {
            console.error(`[DatabaseEngine:deleteMedication] Cascade rollback triggered for target ${id}:`, error);
            throw error;
        }
    }

    /**
     * Case-insensitive substring matching over fields.
     * @param {string} query 
     * @returns {Promise<Medication[]>}
     */
    async searchMedications(query) {
        try {
            if (!query) return [];
            const sanitizedSearch = query.toLowerCase().trim();
            return await this.db.medications.filter(medication => {
                return (medication.name && medication.name.toLowerCase().includes(sanitizedSearch)) ||
                       (medication.genericName && medication.genericName.toLowerCase().includes(sanitizedSearch));
            }).toArray();
        } catch (error) {
            console.error(`[DatabaseEngine:searchMedications] Match sequence rejected for token "${query}":`, error);
            throw error;
        }
    }

    // ============================================================================
    // DOSE LOGGING API
    // ============================================================================

    /**
     * @param {number} medicationId 
     * @param {'taken'|'missed'|'skipped'} [status='taken'] 
     * @param {string} [notes=''] 
     * @returns {Promise<number>}
     */
    async recordDose(medicationId, status = 'taken', notes = '') {
        try {
            const eventTimestamp = new Date().toISOString();
            const payload = {
                medicationId,
                status,
                notes,
                takenAt: eventTimestamp,
                scheduledAt: eventTimestamp,
                createdAt: eventTimestamp
            };
            return await this.db.doseLogs.add(payload);
        } catch (error) {
            console.error('[DatabaseEngine:recordDose] Write cycle rejected:', error);
            throw error;
        }
    }

    /**
     * Pulls log events within explicit daily boundaries.
     * @param {string|Date} date 
     * @returns {Promise<DoseLog[]>}
     */
    async getDosesForDay(date) {
        try {
            const anchorDate = new Date(date);
            anchorDate.setHours(0, 0, 0, 0);
            const lowerLimit = anchorDate.toISOString();
            
            anchorDate.setHours(23, 59, 59, 999);
            const upperLimit = anchorDate.toISOString();

            return await this.db.doseLogs
                .where('takenAt')
                .between(lowerLimit, upperLimit, true, true)
                .toArray();
        } catch (error) {
            console.error('[DatabaseEngine:getDosesForDay] Range calculation failed:', error);
            throw error;
        }
    }

    /**
     * @param {number} medicationId 
     * @param {number} [limit=30] 
     * @returns {Promise<DoseLog[]>}
     */
    async getDosesForMedication(medicationId, limit = 30) {
        try {
            return await this.db.doseLogs
                .where('medicationId').equals(medicationId)
                .reverse()
                .limit(limit)
                .toArray();
        } catch (error) {
            console.error(`[DatabaseEngine:getDosesForMedication] Query target failed on ID ${medicationId}:`, error);
            throw error;
        }
    }

    /**
     * Mathematical compilation calculating compliance factors.
     * @param {number} medicationId 
     * @param {number} [days=30] 
     * @returns {Promise<number>} Adherence scalar weight float ranging between 0.0000 and 1.0000.
     */
    async getAdherenceRate(medicationId, days = 30) {
        try {
            const temporalBound = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
            
            const entries = await this.db.doseLogs
                .where('medicationId').equals(medicationId)
                .filter(log => log.takenAt >= temporalBound)
                .toArray();

            if (entries.length === 0) return 1.0;

            const strictCompliantCount = entries.filter(log => log.status === 'taken').length;
            return parseFloat((strictCompliantCount / entries.length).toFixed(4));
        } catch (error) {
            console.error(`[DatabaseEngine:getAdherenceRate] Analytics thread failure on target ${medicationId}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // USER PROFILE KEY-VALUE API
    // ============================================================================

    /**
     * @param {string} key 
     * @param {any} value 
     * @returns {Promise<void>}
     */
    async setProfileField(key, value) {
        try {
            const entryMatch = await this.db.userProfile.where('key').equals(key).first();
            if (entryMatch) {
                await this.db.userProfile.update(entryMatch.id, { value });
            } else {
                await this.db.userProfile.add({ key, value });
            }
        } catch (error) {
            console.error(`[DatabaseEngine:setProfileField] Fail state writing key "${key}":`, error);
            throw error;
        }
    }

    /**
     * @param {string} key 
     * @returns {Promise<any|null>}
     */
    async getProfileField(key) {
        try {
            const entryMatch = await this.db.userProfile.where('key').equals(key).first();
            return entryMatch ? entryMatch.value : null;
        } catch (error) {
            console.error(`[DatabaseEngine:getProfileField] Failed targeting read array line for "${key}":`, error);
            throw error;
        }
    }

    /**
     * Collects scattered configuration pairs into a unified structural payload.
     * @returns {Promise<Object>} Flattened key-value mapping object representation.
     */
    async getFullProfile() {
        try {
            const linearStore = await this.db.userProfile.toArray();
            return linearStore.reduce((mappedResult, item) => {
                mappedResult[item.key] = item.value;
                return mappedResult;
            }, {});
        } catch (error) {
            console.error('[DatabaseEngine:getFullProfile] Aggregation translation crashed:', error);
            throw error;
        }
    }

    // ============================================================================
    // SYSTEM ALERTS MANAGEMENT API
    // ============================================================================

    /**
     * @param {string} type 
     * @param {'high'|'medium'|'low'} severity 
     * @param {number[]} medicationIds 
     * @param {string} message 
     * @returns {Promise<number>}
     */
    async addAlert(type, severity, medicationIds, message) {
        try {
            const packedAlert = {
                type,
                severity,
                medicationIds,
                message,
                createdAt: new Date().toISOString(),
                dismissed: false
            };
            return await this.db.alerts.add(packedAlert);
        } catch (error) {
            console.error('[DatabaseEngine:addAlert] System event logging failed:', error);
            throw error;
        }
    }

    /**
     * Pulls active notifications sorted strictly by clinical weight priorities.
     * @returns {Promise<Alert[]>}
     */
    async getActiveAlerts() {
        try {
            const reactiveAlertList = await this.db.alerts
                .filter(alert => alert.dismissed === false)
                .toArray();

            const tierWeights = { high: 3, medium: 2, low: 1 };
            
            return reactiveAlertList.sort((a, b) => {
                const weightDiff = (tierWeights[b.severity] || 0) - (tierWeights[a.severity] || 0);
                if (weightDiff !== 0) return weightDiff;
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            });
        } catch (error) {
            console.error('[DatabaseEngine:getActiveAlerts] Sort evaluation failure:', error);
            throw error;
        }
    }

    /**
     * @param {number} id 
     * @returns {Promise<void>}
     */
    async dismissAlert(id) {
        try {
            await this.db.alerts.update(id, { dismissed: true });
        } catch (error) {
            console.error(`[DatabaseEngine:dismissAlert] State mutation rejected on target ${id}:`, error);
            throw error;
        }
    }

    // ============================================================================
    // SYSTEM SEED SEEDING HISTORY ENGINE
    // ============================================================================

    /**
     * Runs localized demographic baseline populations if primary datasets are pristine.
     * Sets clinical logging patterns spanning the prior 14 calendar days.
     * @returns {Promise<number>} Sum total value of synthetic logs written to client node.
     */
    async seed() {
        try {
            const drugEntriesCount = await this.db.medications.count();
            if (drugEntriesCount > 0) {
                console.log('[DatabaseEngine:seed] Existing medication ledger detected. Bypassing hydration.');
                return 0;
            }

            console.log('[DatabaseEngine:seed] Processing baseline edge hydration matrices...');
            const absoluteCalendarWeek = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];
            const comparativeBaseTime = new Date();

            const targetPayloadCatalog = [
                {
                    name: 'Glucophage', genericName: 'Metformin', category: 'antidiabetic',
                    dosage: '500mg', frequency: 'twice_daily', activeDays: absoluteCalendarWeek,
                    scheduledTimes: ['08:00', '20:00'], notes: 'Take with meals.',
                    startDate: new Date(comparativeBaseTime.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: null, createdAt: new Date().toISOString()
                },
                {
                    name: 'Prinivil', genericName: 'Lisinopril', category: 'antihypertensive',
                    dosage: '10mg', frequency: 'once_daily', activeDays: absoluteCalendarWeek,
                    scheduledTimes: ['09:00'], notes: 'Monitor BP metrics weekly.',
                    startDate: new Date(comparativeBaseTime.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: null, createdAt: new Date().toISOString()
                },
                {
                    name: 'Lipitor', genericName: 'Atorvastatin', category: 'statin',
                    dosage: '20mg', frequency: 'once_daily', activeDays: absoluteCalendarWeek,
                    scheduledTimes: ['21:00'], notes: 'Take in evening. Avoid grapefruit.',
                    startDate: new Date(comparativeBaseTime.getTime() - 120 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: null, createdAt: new Date().toISOString()
                },
                {
                    name: 'Bayer', genericName: 'Aspirin', category: 'antiplatelet',
                    dosage: '75mg', frequency: 'once_daily', activeDays: absoluteCalendarWeek,
                    scheduledTimes: ['08:00'], notes: 'Baby aspirin cardiac dosage.',
                    startDate: new Date(comparativeBaseTime.getTime() - 365 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: null, createdAt: new Date().toISOString()
                },
                {
                    name: 'Prilosec', genericName: 'Omeprazole', category: 'PPI',
                    dosage: '20mg', frequency: 'once_daily', activeDays: absoluteCalendarWeek,
                    scheduledTimes: ['07:30'], notes: 'Ingest 30 minutes pre-breakfast.',
                    startDate: new Date(comparativeBaseTime.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString(),
                    endDate: null, createdAt: new Date().toISOString()
                }
            ];

            const allocatedIdentityKeys = [];
            for (const baselineMedication of targetPayloadCatalog) {
                const autoGeneratedId = await this.db.medications.add(baselineMedication);
                allocatedIdentityKeys.push({ id: autoGeneratedId, ...baselineMedication });
            }

            const collectiveSyntheticDoseHistory = [];
            for (let operationalOffset = 14; operationalOffset >= 0; operationalOffset--) {
                const targetDayStep = new Date(comparativeBaseTime.getTime() - operationalOffset * 24 * 60 * 60 * 1000);

                for (const activeDrugData of allocatedIdentityKeys) {
                    for (const registeredScheduleString of activeDrugData.scheduledTimes) {
                        const [hourToken, minuteToken] = registeredScheduleString.split(':').map(Number);
                        const scheduleInstanceDate = new Date(targetDayStep);
                        scheduleInstanceDate.setHours(hourToken, minuteToken, 0, 0);

                        if (scheduleInstanceDate > comparativeBaseTime) continue;

                        const matchesComplianceFactor = Math.random() > 0.15; // Simulated 85% adherence pattern
                        const timelineJitterVariance = (Math.random() - 0.5) * 80 * 60 * 1000;
                        const empiricalActionDate = new Date(scheduleInstanceDate.getTime() + timelineJitterVariance);

                        collectiveSyntheticDoseHistory.push({
                            medicationId: activeDrugData.id,
                            scheduledAt: scheduleInstanceDate.toISOString(),
                            takenAt: empiricalActionDate.toISOString(),
                            status: matchesComplianceFactor ? 'taken' : 'missed',
                            notes: '',
                            createdAt: new Date().toISOString()
                        });
                    }
                }
            }

            await this.db.doseLogs.bulkAdd(collectiveSyntheticDoseHistory);
            await this.setProfileField('onboarded', true);

            console.log(`[DatabaseEngine:seed] Completed. Ingested ${collectiveSyntheticDoseHistory.length} ledger points.`);
            return collectiveSyntheticDoseHistory.length;
        } catch (error) {
            console.error('[DatabaseEngine:seed] Sequential seeding aborted due to execution error:', error);
            throw error;
        }
    }
}

// Export named instance architecture standard singleton token reference
export const dbEngine = new DatabaseEngine();