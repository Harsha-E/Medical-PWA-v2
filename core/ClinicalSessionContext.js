/**
 * ClinicalSessionContext.js - MedCheck Clinical Session Context
 * Single source of truth runtime object unifying Patient Profile,
 * Active Medications, Incoming Medications, Conditions, Allergies, Vitals, Labs,
 * Metadata, and Analysis headers into a single context structure.
 */

export class ClinicalSessionContext {
  constructor(data = {}) {
    const p = data.patient || {};
    
    this.patient = {
      id: p.id || p.userId || 'verified_patient',
      name: p.name || p.fullName || 'Verified Patient',
      age: p.age || 68,
      sex: p.sex || 'M',
      height_cm: p.height_cm ? parseFloat(p.height_cm) : 172,
      weight_kg: p.weight_kg ? parseFloat(p.weight_kg) : 74,
      blood_group: p.blood_group || p.bloodType || 'B+',
      renal_clearance: p.renal_clearance || 'NORMAL',
      hepatic_impairment: p.hepatic_impairment || 'NONE',
      pregnancy_status: p.pregnancy_status || 'NONE'
    };

    this.active_medications = (data.active_medications || []).map(m => this._normalizeMed(m, 'CURRENT'));
    this.incoming_medications = (data.incoming_medications || []).map(m => this._normalizeMed(m, data.source_type || 'NEW_SCAN'));

    this.active_conditions = data.active_conditions || p.active_conditions || ['Hypertension', 'Atrial Fibrillation'];
    this.known_allergies = data.known_allergies || p.known_allergies || p.allergies || ['Penicillins', 'Sulfonamides'];

    this.lifestyle = {
      smoking: data.lifestyle?.smoking || p.lifestyle?.smoking || 'NONE',
      tobacco_chewing: data.lifestyle?.tobacco_chewing || p.lifestyle?.tobacco_chewing || 'NONE',
      alcohol: data.lifestyle?.alcohol || p.lifestyle?.alcohol || 'NONE'
    };

    // Reserved slots for future telemetry expansions
    this.vitals = data.vitals || [];
    this.lab_results = data.lab_results || [];
    this.devices = data.devices || [];

    // System and Platform Metadata
    this.metadata = {
      app_version: '3.0.0',
      device: typeof navigator !== 'undefined' && navigator.userAgent && navigator.userAgent.includes('Mobile') ? 'Mobile PWA' : 'Desktop Browser',
      platform: typeof navigator !== 'undefined' ? (navigator.platform || 'Web') : 'Web',
      installation_id: typeof localStorage !== 'undefined' ? (localStorage.getItem('medcheck_installation_id') || 'inst_local') : 'inst_local'
    };

    // Analysis Execution Envelope
    this.analysis = {
      analysis_id: data.analysis_id || ('exec_' + Date.now()),
      request_id: 'req_' + Math.random().toString(36).substr(2, 9),
      source: data.source || 'vision-scan',
      timestamp: new Date().toISOString(),
      profile_version: data.profile_version || 2,
      knowledge_version: '1.0',
      rule_version: '1.0'
    };
  }

  _normalizeMed(med, defaultSource) {
    if (typeof med === 'string') {
      return { id: med, name: med, source: defaultSource };
    }
    return {
      id: med.id || med.name || med.brandName || 'med_unknown',
      name: med.name || med.brandName || med.genericName || 'Unknown Medication',
      strength: med.strength || null,
      unit: med.unit || null,
      source: med.source || defaultSource
    };
  }

  /**
   * Export standardized payload for DIC /api/v1/analyze requests using dedicated DTO serializer.
   * Keeps internal runtime provenance (source: CURRENT/NEW_SCAN) on this.active_medications while
   * mapping a clean, flattened AnalyzeRequest schema for the FastAPI backend.
   */
  toDICPayload() {
    const extractVal = (field, fallback = 'UNKNOWN') => {
      if (!field) return fallback;
      if (typeof field === 'object' && field.value) return field.value;
      if (typeof field === 'string') return field;
      return fallback;
    };

    const normalizeMedForDTO = (m) => {
      if (typeof m === 'string') {
        return { id: m, name: m, strength: null, unit: null, route: null, frequency: null };
      }
      return {
        id: String(m.id || m.name || m.brandName || 'med_unknown'),
        name: String(m.name || m.brandName || m.genericName || 'Unknown Medication'),
        strength: typeof m.strength === 'number' ? m.strength : (parseFloat(m.strength) || null),
        unit: m.unit ? String(m.unit) : null,
        route: m.route ? String(m.route) : null,
        frequency: m.frequency ? String(m.frequency) : null
      };
    };

    const allMeds = [...this.active_medications, ...this.incoming_medications];
    const dtoList = allMeds.map(normalizeMedForDTO);
    const finalMeds = dtoList.length > 0 ? dtoList : [
      { id: 'Metformin', name: 'Metformin', strength: 500, unit: 'mg', route: 'Oral', frequency: 'Daily' }
    ];

    const p = this.patient || {};
    const patientDTO = {
      id: String(p.id || 'verified_patient'),
      patient_id: String(p.id || 'verified_patient'),
      name: String(p.name || 'Verified Patient'),
      age: typeof p.age === 'number' ? p.age : (parseInt(p.age) || 68),
      weight_kg: typeof p.weight_kg === 'number' ? p.weight_kg : (parseFloat(p.weight_kg) || 74.0),
      height_cm: typeof p.height_cm === 'number' ? p.height_cm : (parseFloat(p.height_cm) || 172.0),
      blood_group: String(p.blood_group || 'B+'),
      sex: String(p.sex || 'M'),
      is_pregnant: extractVal(p.pregnancy_status) === 'PREGNANT',
      renal_clearance: extractVal(p.renal_clearance, 'NORMAL'),
      hepatic_impairment: extractVal(p.hepatic_impairment, 'NONE'),
      pregnancy_status: extractVal(p.pregnancy_status, 'NONE'),
      active_conditions: (this.active_conditions || []).map(c => typeof c === 'string' ? c : (c.code || c.name || String(c))),
      allergies: (this.known_allergies || []).map(a => typeof a === 'string' ? a : (a.name || String(a))),
      diagnoses: [],
      laboratory_values: {}
    };

    const payload = {
      analysis_id: this.analysis.analysis_id,
      execution_id: this.analysis.analysis_id,
      patient_id: String(p.id || 'verified_patient'),
      source: this.analysis.source,
      timestamp: this.analysis.timestamp,
      patient: patientDTO,
      medications: finalMeds,
      // Metadata fields preserved for telemetry / UI consumption
      patient_snapshot: {
        ...p,
        renal_clearance: extractVal(p.renal_clearance, 'NORMAL'),
        hepatic_impairment: extractVal(p.hepatic_impairment, 'NONE'),
        pregnancy_status: extractVal(p.pregnancy_status, 'NONE'),
        active_conditions: this.active_conditions,
        known_allergies: this.known_allergies,
        lifestyle: this.lifestyle
      },
      active_medications: this.active_medications,
      incoming_medications: this.incoming_medications,
      vitals: this.vitals,
      lab_results: this.lab_results,
      devices: this.devices,
      metadata: this.metadata
    };

    console.log('[DICPayloadSerializer] Generated DIC Analyze Payload:', JSON.stringify(payload, null, 2));
    return payload;
  }
}

export default ClinicalSessionContext;
