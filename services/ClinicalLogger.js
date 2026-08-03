import db from '../core/db.js';
import state from '../core/state.js';
import ClinicalAnalysisService from './ClinicalAnalysisService.js';

/**
 * @fileoverview ClinicalLogger
 * A centralized data access and mutation layer for the Clinical Ledger.
 * Enforces strict CRDT patterns (logicalClock, updatedAt) and canonical ownership.
 * All modules must write through this service instead of modifying Dexie directly.
 */
class ClinicalLogger {
  constructor() {
    this._clock = Date.now();
  }

  /**
   * Helper to resolve the correct target userId and the actor creating the record.
   */
  _getContext() {
    if (!state.user) throw new Error('[ClinicalLogger] User must be authenticated');
    
    // createdBy is the auth user (the device typing)
    const createdBy = state.user.uid;
    
    // userId is the patient (could be self or a family profile)
    let userId = createdBy;
    if (state.activeProfileContext) {
       userId = state.activeProfileContext.id || state.activeProfileContext;
    }

    return { userId, createdBy };
  }

  /**
   * Bumps the logical clock ensuring monotonic increase
   */
  _tick() {
    const now = Date.now();
    if (now <= this._clock) {
      this._clock++;
    } else {
      this._clock = now;
    }
    return this._clock;
  }

  /**
   * Base wrapper to inject CRDT tracking fields
   */
  _prepareRecord(data) {
    const { userId, createdBy } = this._getContext();
    const timestamp = Date.now();
    
    // Generate a highly-unique 15-digit integer to prevent CRDT collisions across devices
    // while remaining compatible with Dexie's auto-increment (++id) schema
    const safeId = parseInt(timestamp.toString() + String(Math.floor(Math.random() * 100)).padStart(2, '0'), 10);
    
    return {
      id: safeId,
      ...data,
      userId,
      createdBy, // useful for auditing caregiver edits
      updatedAt: timestamp,
      logicalClock: this._tick(),
      isDeleted: data.isDeleted || false
    };
  }

  async _queueSync(action, table, recordId, payload) {
    await db.sync_queue.add({
      action,
      table,
      recordId,
      payload,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    });
    window.dispatchEvent(new CustomEvent('medcare:sync-queued'));
  }

  /**
   * Non-blocking trigger to run a DIC analysis.
   */
  _triggerAnalysis() {
    // Fire and forget
    (async () => {
      try {
        const { userId } = this._getContext();
        const activeMeds = await db.medications
          .filter(m => m.userId === userId && !m.isDeleted && m.active)
          .toArray();
        const allergies = await db.allergies
          .filter(a => a.userId === userId && !a.isDeleted)
          .toArray();

        const profile = {
          userId,
          activeMeds: activeMeds.map(m => m.name), // assuming DIC takes names or canon objects
          allergies
        };
        await ClinicalAnalysisService.queueAnalysis(profile);
      } catch (err) {
        console.error('[ClinicalLogger] Error triggering analysis', err);
      }
    })();
  }

  // ─── Diseases ─────────────────────────────────────────────────────────────

  async addDisease(diseaseData) {
    const record = this._prepareRecord({
      status: 'Active',
      stage: 'Unknown',
      ...diseaseData
    });
    const id = await db.disease_ledger.add(record);
    await this._queueSync('ADD', 'disease_ledger', id, { ...record, id });
    return id;
  }

  async updateDisease(id, updateData) {
    const record = this._prepareRecord(updateData);
    await db.disease_ledger.update(id, record);
    await this._queueSync('UPDATE', 'disease_ledger', id, { ...record, id });
  }

  async closeDisease(diseaseId, closureDate = null) {
    const record = this._prepareRecord({
      status: 'Resolved',
      endDate: closureDate || new Date().toISOString().split('T')[0]
    });
    await db.disease_ledger.update(diseaseId, record);
    await this._queueSync('UPDATE', 'disease_ledger', diseaseId, { ...record, id: diseaseId });
  }

  // ─── Surgeries ────────────────────────────────────────────────────────────

  async addSurgery(surgeryData) {
    const record = this._prepareRecord({
      ...surgeryData
    });
    const id = await db.surgeries.add(record);
    await this._queueSync('ADD', 'surgeries', id, { ...record, id });
    return id;
  }

  async updateSurgery(id, updateData) {
    const record = this._prepareRecord(updateData);
    await db.surgeries.update(id, record);
    await this._queueSync('UPDATE', 'surgeries', id, { ...record, id });
  }

  // ─── Allergies ────────────────────────────────────────────────────────────

  async addAllergy(allergyData) {
    const record = this._prepareRecord({
      ...allergyData
    });
    const id = await db.allergies.add(record);
    await this._queueSync('ADD', 'allergies', id, { ...record, id });
    return id;
  }

  async updateAllergy(id, updateData) {
    const record = this._prepareRecord(updateData);
    await db.allergies.update(id, record);
    await this._queueSync('UPDATE', 'allergies', id, { ...record, id });
  }

  // ─── Medications ──────────────────────────────────────────────────────────

  async addMedication(medData) {
    const record = this._prepareRecord({
      active: true,
      ...medData
    });
    const id = await db.medications.add(record);
    await this._queueSync('ADD', 'medications', id, { ...record, id });
    
    this._triggerAnalysis();
    
    return id;
  }

  async updateMedication(id, updateData) {
    const record = this._prepareRecord(updateData);
    await db.medications.update(id, record);
    await this._queueSync('UPDATE', 'medications', id, { ...record, id });
    
    if (updateData.active !== undefined || updateData.isDeleted) {
      this._triggerAnalysis();
    }
  }

  // ─── Documents & Assets ───────────────────────────────────────────────────

  /**
   * Uploads to Supabase and links to the history table.
   */
  async attachDocument(file, metadata = {}) {
    const { userId } = this._getContext();
    let url = null;
    let subresourceIntegrity = null;

    try {
      // 1. Calculate SHA-256
      const arrayBuffer = await file.arrayBuffer();
      const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      subresourceIntegrity = `sha256-${hashHex}`;

      // 2. Upload to Supabase Storage
      const SUPABASE_URL = 'https://ujiviocutexqbigsorol.supabase.co';
      const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXZpb2N1dGV4cWJpZ3Nvcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzU4NzgsImV4cCI6MjA5NzQ1MTg3OH0.AR7N-h-FJ5iE12EUqp3j8HyuskOoU1od8XekcbqtX-4';
      
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
      // Use Firebase UID in the path as per architecture specs
      const path = `${userId}/${new Date().getFullYear()}/${fileName}`;

      const response = await fetch(`${SUPABASE_URL}/storage/v1/object/medical-records/${path}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'apikey': SUPABASE_KEY,
          'Content-Type': file.type || 'application/octet-stream'
        },
        body: file
      });

      if (response.ok) {
        url = `${SUPABASE_URL}/storage/v1/object/public/medical-records/${path}`;
      } else {
        throw new Error('Supabase upload failed');
      }
    } catch (err) {
      console.warn('[ClinicalLogger] Supabase upload failed, falling back to blob', err);
      url = URL.createObjectURL(file);
    }

    const record = this._prepareRecord({
      type: metadata.type || 'document',
      date: new Date().toISOString().split('T')[0],
      title: file.name,
      documentUrl: url,
      subresourceIntegrity,
      ...metadata
    });

    const id = await db.history.add(record);
    await this._queueSync('ADD', 'history', id, { ...record, id });
    return { id, url };
  }

  /**
   * Adds a generic history record without uploading a document
   */
  async addHistory(historyData) {
    const record = this._prepareRecord({
      ...historyData
    });
    const id = await db.history.add(record);
    await this._queueSync('ADD', 'history', id, { ...record, id });
    return id;
  }

  // ─── Relationships (Clinical Links) ───────────────────────────────────────

  /**
   * Create a directed relationship between two entities.
   * e.g., sourceEntity: 'history', sourceId: 5, targetEntity: 'disease_ledger', targetId: 2, relationType: 'DIAGNOSTIC_EVIDENCE'
   */
  async linkEntities(sourceEntity, sourceId, targetEntity, targetId, relationType) {
    const record = this._prepareRecord({
      sourceEntity,
      sourceId,
      targetEntity,
      targetId,
      relationType
    });
    
    // Check if it already exists by querying manually
    const allLinks = await db.clinical_links.toArray();
    const exists = allLinks.some(l => 
      l.sourceEntity === sourceEntity &&
      l.sourceId === sourceId &&
      l.targetEntity === targetEntity &&
      l.targetId === targetId &&
      l.relationType === relationType
    );

    if (!exists) {
      const id = await db.clinical_links.add(record);
      await this._queueSync('ADD', 'clinical_links', id, { ...record, id });
    }
  }

  /**
   * Fetches linked records.
   */
  async getLinksForEntity(entityName, entityId) {
    const allLinks = await db.clinical_links.filter(l => !l.isDeleted).toArray();
    
    const outgoing = allLinks.filter(l => l.sourceEntity === entityName && l.sourceId === entityId);
    const incoming = allLinks.filter(l => l.targetEntity === entityName && l.targetId === entityId);

    return { outgoing, incoming };
  }

  // ─── Deletion ─────────────────────────────────────────────────────────────

  /**
   * Soft deletes a record and queues the deletion for PeerMesh sync.
   * @param {string} table - The Dexie table name
   * @param {number} id - The record ID
   */
  async deleteRecord(table, id) {
    if (!db[table]) throw new Error(`Table ${table} not found in ClinicalLogger.deleteRecord`);
    
    const record = await db[table].get(id);
    if (!record) return;

    const updatedRecord = this._prepareRecord({
      ...record,
      isDeleted: true
    });

    await db[table].update(id, updatedRecord);
    await this._queueSync('UPDATE', table, id, { ...updatedRecord, id });
  }

  // ─── OCR Pipeline ─────────────────────────────────────────────────────────
  
  /**
   * Imports structured JSON from an OCR process, creating medications, diseases, 
   * and linking them to the source document.
   * @param {Object} json - Parsed JSON from OCR
   * @param {number} documentId - The history table ID of the scanned document
   */
  async importOCR(json, documentId) {
    // 1. Process Medications
    if (json.medications && Array.isArray(json.medications)) {
      for (const med of json.medications) {
        const medId = await this.addMedication({
          name: med.name || 'Unknown',
          dosage: med.dosage || '',
          frequency: med.frequency || '',
          notes: 'Imported via OCR'
        });
        await this.linkEntities('history', documentId, 'medications', medId, 'EXTRACTED_FROM');
      }
    }

    // 2. Process Diseases / Conditions
    if (json.diseases && Array.isArray(json.diseases)) {
      for (const disease of json.diseases) {
        const diseaseId = await this.addDisease({
          diseaseName: disease.name || disease,
          clinicalName: disease.clinicalName || '',
          notes: 'Imported via OCR'
        });
        await this.linkEntities('history', documentId, 'disease_ledger', diseaseId, 'EXTRACTED_FROM');
      }
    }
  }
}

export default new ClinicalLogger();
