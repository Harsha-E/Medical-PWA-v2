/**
 * MedCare | Local Database (IndexedDB via Dexie)
 */
import Dexie from 'https://cdn.jsdelivr.net/npm/dexie@4.0.8/dist/dexie.mjs';

const db = new Dexie('MedCareDB');

// ─── ANTI-DEADLOCK SYSTEM ─────────────────────────────────────────────────────
db.on('blocked', () => {
  alert('Database upgrade blocked! Please close ALL other tabs running this app and click OK to refresh.');
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

if (import.meta.env?.DEV) {
  db.open().then(() => {
    console.debug('[DB] MedCareDB open. Tables:', db.tables.map(t => t.name));
  }).catch(e => console.error('[DB] Failed to open MedCareDB:', e));
}

export default db;