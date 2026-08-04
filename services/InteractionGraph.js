/**
 * @fileoverview Clinical Interaction Graph Service.
 * Architecture: Proxies the Drug Intelligence Cloud (DIC) API.
 */

class InteractionGraph {
  constructor() {
    this._isReady = false;
  }

  async initialize() {
    this._isReady = true;
    return true;
  }

  async findInteractions(drugList = []) {
    if (!this._isReady || drugList.length < 2) return [];

    const meds = drugList.map((drug) => {
      return typeof drug === 'string'
        ? drug
        : (drug.genericName || drug.name || drug.title || drug.brandName);
    });
    
    try {
      const { ApiClient } = await import('../core/api.js');
      const { default: state } = await import('../core/state.js');
      const { default: CanonicalContextBuilder } = await import('../core/CanonicalContextBuilder.js');
      
      const payload = CanonicalContextBuilder.buildAnalysisPayload({
        userProfile: state.userProfile,
        currentMedications: meds,
        newMedications: [],
        source: 'interaction-graph'
      });

      const data = await ApiClient.post('/api/v1/analyze', payload, { timeout: 3500 });

      if (!data || !data.alerts) return [];

      return data.alerts.map(alert => ({
        drug1: alert.drugs_involved?.[0] || 'Unknown',
        drug2: alert.drugs_involved?.[1] || 'Unknown',
        severity: alert.severity === 'CRITICAL' ? 'severe' : 'moderate',
        description: alert.message,
        recommendation: alert.claims?.[0]?.statement || 'Review clinical logic.',
        evidence: alert.claims?.[0]?.evidence?.[0]?.title || 'System registry',
        rule_id: alert.rule_id,
        raw: alert
      }));
    } catch (e) {
      console.warn("[InteractionGraph] DIC backend offline or connection error:", e.message);
      return [];
    }
  }

  async getInteractionSummary(drugList = []) {
    const interactions = await this.findInteractions(drugList);
    
    const summary = {
      severe: interactions.filter((item) => item.severity === 'severe'),
      moderate: interactions.filter((item) => item.severity === 'moderate'),
      mild: interactions.filter((item) => item.severity === 'mild'),
      safe: []
    };

    summary.safe = drugList
      .map((drug) => (typeof drug === 'string' ? drug : drug.name || drug.genericName))
      .filter((drugName) => {
        if (!drugName) return false;
        return !interactions.some((item) => 
          item.drug1.toLowerCase() === drugName.toLowerCase() || 
          item.drug2.toLowerCase() === drugName.toLowerCase()
        );
      });

    return summary;
  }
}

export const interactionGraph = new InteractionGraph();