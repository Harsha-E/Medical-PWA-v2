/**
 * @fileoverview Unified Medicine History Manager
 * Consolidates RecognitionHistory, PackagingMemory, and HouseholdMedicineRegistry
 * into a single unified ledger with one storage backend.
 */

export class MedicineHistoryManager {
    constructor(options = {}) {
        this.storageKey = options.storageKey || 'medcare_unified_history';
        this.recencyWindow = 24 * 60 * 60 * 1000;
        this.commonThreshold = 5;
    }

    _load() {
        try {
            const raw = localStorage.getItem(this.storageKey);
            if (raw) {
                const parsed = JSON.parse(raw);
                return {
                    corrections: parsed.corrections || {},
                    statistics: parsed.statistics || {},
                    packaging: parsed.packaging || {},
                    household: parsed.household || {}
                };
            }
        } catch (e) {
            console.warn('[MedicineHistoryManager] Failed to load data:', e);
        }
        return { corrections: {}, statistics: {}, packaging: {}, household: {} };
    }

    _save(data) {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (e) {
            console.error('[MedicineHistoryManager] Failed to save data:', e);
        }
    }

    // --- RECOGNITION HISTORY ---

    recordCorrection(rawOcrText, correctedText) {
        if (!rawOcrText || !correctedText) return;
        const rawKey = rawOcrText.trim().toLowerCase();
        const corrVal = correctedText.trim();
        const data = this._load();

        if (rawKey !== corrVal.toLowerCase()) {
            data.corrections[rawKey] = corrVal;
        }

        if (!data.statistics[rawKey]) {
            data.statistics[rawKey] = { scans: 1, corrections: 1, uncertains: 0, lastScanned: Date.now() };
        } else {
            data.statistics[rawKey].corrections += 1;
            data.statistics[rawKey].scans += 1;
            data.statistics[rawKey].lastScanned = Date.now();
        }
        this._save(data);
    }

    recordMatch(medicineName, isUncertain = false) {
        if (!medicineName) return;
        const nameKey = medicineName.trim().toLowerCase();
        const data = this._load();
        const now = Date.now();

        if (!data.statistics[nameKey]) {
            data.statistics[nameKey] = { scans: 1, corrections: 0, uncertains: isUncertain ? 1 : 0, lastScanned: now };
        } else {
            data.statistics[nameKey].scans += 1;
            data.statistics[nameKey].lastScanned = now;
            if (isUncertain) data.statistics[nameKey].uncertains += 1;
        }
        this._save(data);
    }

    getLearnedCorrection(ocrText) {
        if (!ocrText) return '';
        const clean = ocrText.trim().toLowerCase();
        const data = this._load();
        return data.corrections[clean] || ocrText;
    }

    getRecognitionBoost(medicineName) {
        if (!medicineName) return 0;
        const nameKey = medicineName.trim().toLowerCase();
        const data = this._load();
        const stats = data.statistics[nameKey];
        if (!stats) return 0;

        let boost = 0;
        const now = Date.now();
        if (now - stats.lastScanned <= this.recencyWindow) boost += 15;
        boost += Math.min(15, stats.scans * 5);
        return Math.min(30, boost);
    }

    // --- PACKAGING MEMORY ---

    savePackagingSignature(medicineId, fingerprint) {
        if (!medicineId || !fingerprint) return;
        const data = this._load();
        if (!data.packaging[medicineId]) data.packaging[medicineId] = [];

        const newSignature = {
            timestamp: Date.now(),
            manufacturer: fingerprint.manufacturer || '',
            textLineCount: fingerprint.textLineCount || 0,
            normalizedBoxes: fingerprint.normalizedBoxes || []
        };

        data.packaging[medicineId].push(newSignature);
        if (data.packaging[medicineId].length > 3) data.packaging[medicineId].shift();
        this._save(data);
    }

    // --- HOUSEHOLD MEDICINE REGISTRY ---

    associateMemberMedicine(memberName, medicineName) {
        if (!memberName || !medicineName) return;
        const mKey = memberName.trim();
        const medKey = medicineName.trim();
        
        const data = this._load();
        if (!data.household[mKey]) data.household[mKey] = [];
        if (!data.household[mKey].includes(medKey)) data.household[mKey].push(medKey);

        const normMed = medKey.toLowerCase();
        if (!data.statistics[normMed]) {
            data.statistics[normMed] = { scans: 1, corrections: 0, uncertains: 0, lastScanned: Date.now() };
        } else {
            data.statistics[normMed].scans += 1;
        }

        this._save(data);
    }

    getHouseholdBoost(medicineName) {
        if (!medicineName) return 0;
        const nameKey = medicineName.trim().toLowerCase();
        const data = this._load();
        const count = data.statistics[nameKey]?.scans || 0;
        return count >= this.commonThreshold ? 8 : 0;
    }

    clear() {
        this._save({ corrections: {}, statistics: {}, packaging: {}, household: {} });
    }
}

export const medicineHistoryManager = new MedicineHistoryManager();
