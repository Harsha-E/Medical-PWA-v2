/**
 * @fileoverview Local Data Export Engine.
 * Architecture: ES6 Module.
 * Paradigm: Client-side generation of PDF and CSV files (Zero Cloud).
 * Requires: jsPDF (global `jspdf` object) loaded via CDN in index.html.
 */

class ExportEngine {
  constructor() {
    this._isSupported = typeof window !== 'undefined' && 'jspdf' in window;
  }

  /**
   * Generates and downloads a comprehensive 30-day adherence PDF report.
   * @param {Object} profile - User profile data (name, blood type).
   * @param {Object[]} medications - Array of active medications.
   * @param {Object[]} doseLogs - Array of recent dose logs.
   * @param {Object} analytics - Output from analyticsLocal.computeAdherenceRate.
   */
  async exportAdherencePDF(profile, medications = [], doseLogs = [], analytics = null) {
    if (!this._isSupported) {
      throw new Error('[ExportEngine] jsPDF library is not loaded. Cannot generate PDF.');
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;

    // --- PAGE 1: COVER & SUMMARY ---
    
    // Header Band
    doc.setFillColor(15, 23, 42); // #0f172a (Deep Navy)
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    // Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(28);
    doc.text('MedCare', margin, 25);
    
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14);
    doc.text('Medication Adherence Report', margin, 35);
    
    doc.setFontSize(11);
    doc.text(`Patient: ${profile.name || 'Primary User'} | Blood Type: ${profile.bloodType || 'Unknown'}`, margin, 45);
    doc.text(`Generated: ${this._formatDate(new Date().toISOString())}`, pageWidth - margin, 45, { align: 'right' });

    // Summary Boxes (3 across)
    let y = 80;
    const boxWidth = (pageWidth - (margin * 2) - 10) / 3;
    
    doc.setTextColor(0, 0, 0);
    const overallRate = analytics ? Math.round(analytics.overall * 100) : 0;
    
    this._drawSummaryBox(doc, margin, y, boxWidth, 'Overall Adherence', `${overallRate}%`);
    this._drawSummaryBox(doc, margin + boxWidth + 5, y, boxWidth, 'Active Medications', `${medications.length}`);
    this._drawSummaryBox(doc, margin + (boxWidth * 2) + 10, y, boxWidth, 'Total Logs', `${doseLogs.length}`);

    // --- PAGE 2: MEDICATION LIST ---
    doc.addPage();
    this._addPageFooter(doc, 2, 3);
    y = margin;
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Active Medications', margin, y);
    y += 15;

    // Table Header
    doc.setFontSize(10);
    doc.setFillColor(241, 245, 249); // #f1f5f9
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
    doc.text('Medication Name', margin + 2, y + 1);
    doc.text('Dosage', margin + 80, y + 1);
    doc.text('Frequency', margin + 120, y + 1);
    doc.text('Adherence', margin + 160, y + 1);
    y += 15;

    // Table Rows
    doc.setFont('helvetica', 'normal');
    medications.forEach((med, index) => {
      if (y > pageHeight - 30) {
        doc.addPage();
        this._addPageFooter(doc, doc.internal.getNumberOfPages(), 3);
        y = margin + 10;
      }
      
      const medRate = analytics?.perMedication.has(med.id) 
        ? `${Math.round(analytics.perMedication.get(med.id) * 100)}%` 
        : 'N/A';

      doc.text(med.name || med.genericName, margin + 2, y);
      doc.text(med.dosage || '-', margin + 80, y);
      doc.text(med.frequency || '-', margin + 120, y);
      doc.text(medRate, margin + 160, y);
      
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 10;
    });

    // --- PAGE 3: DOSE LOG TABLE (Last 60 max) ---
    doc.addPage();
    this._addPageFooter(doc, 3, 3);
    y = margin;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.text('Recent Dose Log (Last 30 Days)', margin, y);
    y += 15;

    // Log Table Header
    doc.setFontSize(10);
    doc.setFillColor(241, 245, 249);
    doc.rect(margin, y - 5, pageWidth - (margin * 2), 10, 'F');
    doc.text('Date', margin + 2, y + 1);
    doc.text('Medication', margin + 40, y + 1);
    doc.text('Status', margin + 140, y + 1);
    y += 15;

    doc.setFont('helvetica', 'normal');
    const recentLogs = doseLogs.slice(0, 60); // Cap at 60 for PDF
    
    // Fast lookup map for medication names
    const medMap = new Map(medications.map(m => [m.id, m.name || m.genericName]));

    recentLogs.forEach(log => {
      if (y > pageHeight - 30) {
        doc.addPage();
        this._addPageFooter(doc, doc.internal.getNumberOfPages(), 3);
        y = margin + 10;
      }

      const dateObj = new Date(log.takenAt);
      const dateStr = `${dateObj.getMonth()+1}/${dateObj.getDate()} ${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
      const medName = medMap.get(log.medicationId) || 'Unknown Medication';
      const status = log.status || (log.skipped ? 'missed' : 'taken');

      doc.setTextColor(0, 0, 0);
      doc.text(dateStr, margin + 2, y);
      doc.text(medName, margin + 40, y);
      
      // Color code status
      if (status === 'taken') doc.setTextColor(16, 185, 129); // Green
      else if (status === 'missed') doc.setTextColor(239, 68, 68); // Red
      doc.text(status.toUpperCase(), margin + 140, y);
      doc.setTextColor(0, 0, 0);

      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y + 3, pageWidth - margin, y + 3);
      y += 10;
    });

    if (doseLogs.length > 60) {
      doc.setFont('helvetica', 'italic');
      doc.text('* Showing most recent 60 entries. Export CSV for full history.', margin, y + 5);
    }

    doc.save(`MedCare-Report-${new Date().toISOString().split('T')[0]}.pdf`);
  }

  /**
   * Generates a printable, wallet-sized emergency medical card.
   * @param {Object} profile 
   * @param {Object[]} medications 
   */
  async exportEmergencyCardPDF(profile, medications = []) {
    if (!this._isSupported) throw new Error('jsPDF not loaded.');
    const { jsPDF } = window.jspdf;
    
    // A6 size (Postcard) for wallet printing
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a6' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 10;
    let y = margin;

    // Danger Red Header
    doc.setFillColor(153, 27, 27);
    doc.rect(0, 0, pageWidth, 25, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('MEDICAL INFORMATION', pageWidth / 2, 12, { align: 'center' });
    doc.text('IN CASE OF EMERGENCY', pageWidth / 2, 18, { align: 'center' });

    y = 35;
    doc.setTextColor(0, 0, 0);
    
    // Patient Details
    doc.setFontSize(14);
    doc.text(profile.name || 'Unknown Patient', margin, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Blood Type: ${profile.bloodType || 'Unknown'}`, margin, y);
    y += 6;
    
    const allergiesStr = (profile.allergies || []).join(', ') || 'None known';
    doc.text(`Allergies: ${allergiesStr}`, margin, y, { maxWidth: pageWidth - (margin*2) });
    y += 12;

    doc.setFont('helvetica', 'bold');
    doc.text('Active Medications:', margin, y);
    y += 6;

    // Medication List (Name + Dose only)
    doc.setFont('helvetica', 'normal');
    medications.forEach(med => {
      const line = `• ${med.name || med.genericName} (${med.dosage || 'dose unknown'})`;
      doc.text(line, margin, y);
      y += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(100, 116, 139);
    doc.text('Generated by MedCare PWA. Verify with prescribing physician.', pageWidth / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`Emergency-Card-${profile.name ? profile.name.replace(/\s+/g, '-') : 'Patient'}.pdf`);
  }

  /**
   * Generates and downloads a CSV of all medications.
   * @param {Object[]} medications 
   */
  exportMedicationsCSV(medications = []) {
    const headers = ['ID', 'Name', 'Generic Name', 'Category', 'Dosage', 'Frequency', 'Start Date', 'Notes'];
    
    const rows = medications.map(med => [
      med.id,
      this._escapeCSV(med.name),
      this._escapeCSV(med.genericName),
      this._escapeCSV(med.category),
      this._escapeCSV(med.dosage),
      this._escapeCSV(med.frequency),
      this._escapeCSV(med.startDate),
      this._escapeCSV(med.notes)
    ]);

    this._downloadCSV(headers, rows, `MedCare-Medications-${new Date().toISOString().split('T')[0]}.csv`);
  }

  /**
   * Generates and downloads a CSV of all dose logs.
   * @param {Object[]} doseLogs 
   * @param {Map<number, Object>} medicationsMap - Used to lookup names
   */
  exportDoseLogsCSV(doseLogs = [], medicationsMap = new Map()) {
    const headers = ['Date', 'Time', 'Medication Name', 'Status', 'Notes'];

    const rows = doseLogs.map(log => {
      const dateObj = new Date(log.takenAt);
      const date = dateObj.toISOString().split('T')[0];
      const time = `${dateObj.getHours()}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
      const medName = medicationsMap.has(log.medicationId) ? medicationsMap.get(log.medicationId).name : `ID: ${log.medicationId}`;
      const status = log.status || (log.skipped ? 'missed' : 'taken');

      return [
        date,
        time,
        this._escapeCSV(medName),
        status,
        this._escapeCSV(log.notes)
      ];
    });

    this._downloadCSV(headers, rows, `MedCare-DoseLogs-${new Date().toISOString().split('T')[0]}.csv`);
  }

  // --- PRIVATE HELPERS ---

  _drawSummaryBox(doc, x, y, width, label, value) {
    doc.setDrawColor(203, 213, 225);
    doc.rect(x, y, width, 25);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text(label, x + (width / 2), y + 7, { align: 'center' });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(value, x + (width / 2), y + 18, { align: 'center' });
  }

  _addPageFooter(doc, pageNum, _totalPages) {
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('MedCare PWA · Offline-First · Data stored locally on your device', 20, pageHeight - 15);
    doc.text(`Page ${pageNum}`, pageWidth - 20, pageHeight - 15, { align: 'right' });
  }

  _formatDate(isoString) {
    if (!isoString) return '';
    const d = new Date(isoString);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
  }

  _escapeCSV(value) {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  _downloadCSV(headers, rows, filename) {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    
    setTimeout(() => {
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 100);
  }
}

export const exportEngine = new ExportEngine();