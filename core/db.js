/**
 * MedCare | Local Database (IndexedDB via Dexie)
 */
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.mjs';
import { appAlert } from './ui.js';

const db = new Dexie('MedCareDB');

// ─── ANTI-DEADLOCK SYSTEM ─────────────────────────────────────────────────────
db.on('blocked', async () => {
  await appAlert('Database upgrade blocked! Please close ALL other tabs running this app and click OK to refresh.', 'Database Blocked');
  window.location.reload();
});

// ─── Schema Version 2 (Legacy) ────────────────────────────────────────────────
db.version(2).stores({
  medications:  '++id, name, dosage, frequency, startDate, endDate, notes, active',
  doses:        '++id, medicationId, takenAt, skipped',
  interactions: '++id, drug1, drug2, severity, description, checkedAt',
  userProfile:  '++id, key',
  history:      '++id, type, date, title, provider',
  family:       '++id, relationship, name, bloodGroup',
  appointments: '++id, date, time, title, provider',
});

// ─── Schema Version 3 (Prescriptions & Reminders) ─────────────────────────────
db.version(3).stores({
  prescriptions: '++id, imageBlob, rawText, date, doctorName, userId',
  reminders:     '++id, medicationId, time, isActive, userId'
});

// ─── Schema Version 4 (Multi-User Indexing Patch) ─────────────────────────────
db.version(4).stores({
  medications:  '++id, name, dosage, frequency, startDate, endDate, notes, active, userId',
  doses:        '++id, medicationId, takenAt, skipped, userId',
  history:      '++id, type, date, title, provider, userId',
  family:       '++id, relationship, name, bloodGroup, userId',
  appointments: '++id, date, time, title, provider, userId'
});

// ─── Schema Version 5 (Clinical Context Expansion) ────────────────────────────
db.version(5).stores({
  medications:  '++id, name, dosage, frequency, startDate, endDate, notes, active, userId, category, patientFriendlyUse',
  doses:        '++id, medicationId, takenAt, skipped, userId',
  history:      '++id, type, date, title, provider, userId',
  family:       '++id, relationship, name, bloodGroup, userId',
  appointments: '++id, date, time, title, provider, userId',
  prescriptions: '++id, imageBlob, rawText, date, doctorName, userId',
  reminders:     '++id, medicationId, time, isActive, userId'
}).upgrade(tx => {
    // Automatically migrate old v4 records to have empty strings for new fields
    return tx.table('medications').toCollection().modify(med => {
        med.category = med.category || 'Uncategorized';
        med.patientFriendlyUse = med.patientFriendlyUse || 'No usage details available.';
    });
});

// ─── Schema Version 6 (CRDT & Sync Queue) ─────────────────────────────────────
db.version(6).stores({
  medications:  '++id, name, dosage, frequency, startDate, endDate, notes, active, userId, category, patientFriendlyUse, updatedAt, logicalClock, isDeleted',
  doses:        '++id, medicationId, takenAt, skipped, userId, updatedAt, logicalClock, isDeleted',
  history:      '++id, type, date, title, provider, userId, updatedAt, logicalClock, isDeleted',
  family:       '++id, relationship, name, bloodGroup, userId, updatedAt, logicalClock, isDeleted',
  appointments: '++id, date, time, title, provider, userId, updatedAt, logicalClock, isDeleted',
  prescriptions: '++id, imageBlob, rawText, date, doctorName, userId, updatedAt, logicalClock, isDeleted',
  reminders:     '++id, medicationId, time, isActive, userId, updatedAt, logicalClock, isDeleted',
  sync_queue:    '++id, action, table, recordId, payload, timestamp, status, retryCount'
}).upgrade(tx => {
    // Add logical clocks and tombstones to all existing records
    const tables = ['medications', 'doses', 'history', 'family', 'appointments', 'prescriptions', 'reminders'];
    const now = Date.now();
    tables.forEach(table => {
        tx.table(table).toCollection().modify(record => {
            record.updatedAt = record.updatedAt || new Date(now).toISOString();
            record.logicalClock = record.logicalClock || 1;
            record.isDeleted = record.isDeleted || false;
        });
    });
});
// ─── Schema Version 7 (Disease Ledger) ──────────────────────────────────────────
db.version(7).stores({
  medications:  '++id, name, dosage, frequency, startDate, endDate, notes, active, userId, category, patientFriendlyUse, updatedAt, logicalClock, isDeleted',
  doses:        '++id, medicationId, takenAt, skipped, userId, updatedAt, logicalClock, isDeleted',
  history:      '++id, type, date, title, provider, userId, updatedAt, logicalClock, isDeleted',
  family:       '++id, relationship, name, bloodGroup, userId, updatedAt, logicalClock, isDeleted',
  appointments: '++id, date, time, title, provider, userId, updatedAt, logicalClock, isDeleted',
  prescriptions: '++id, imageBlob, rawText, date, doctorName, userId, updatedAt, logicalClock, isDeleted',
  reminders:     '++id, medicationId, time, isActive, userId, updatedAt, logicalClock, isDeleted',
  sync_queue:    '++id, action, table, recordId, payload, timestamp, status, retryCount',
  disease_ledger: '++id, diseaseName, clinicalName, userId, updatedAt, logicalClock, isDeleted'
});
if (import.meta.env?.DEV) {
  db.open().then(() => {
    console.debug('[DB] MedCareDB open. Tables:', db.tables.map(t => t.name));
  }).catch(e => console.error('[DB] Failed to open MedCareDB:', e));
}

export default db;