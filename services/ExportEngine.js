/**
 * @fileoverview Export Engine Service for MedCare PWA.
 * Architecture: Vanilla JS ES6 Module.
 * Paradigm: Client-Side Document Generation (PDF/CSV).
 * Requires: jsPDF (2.5.1) available on the global `window.jspdf` object.
 */

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const BRAND_ORANGE = '#FF6B35';
const BRAND_RED = '#E8003A';
const SUCCESS_GREEN = '#2D9E6B';
const TEXT_DARK = '#1A0A00';
const TEXT_MUTED = '#9E8070';
const ROW_ALT_BG = '#FFF8F3'; // Warm light alternate row

/**
 * Service responsible for generating downloadable PDF reports and CSV exports
 * directly from the client edge node.
 */
class ExportEngine {
    /**
     * Internal check to guarantee the jsPDF library is available in the global scope.
     * @private
     * @returns {any} The jsPDF constructor.
     * @throws {Error} If jsPDF is missing.
     */
    _getJsPDF() {
        if (typeof window === 'undefined' || !window.jspdf || !window.jspdf.jsPDF) {
            throw new Error('[ExportEngine Fatal] jsPDF library is not loaded on the window object.');
        }
        return window.jspdf.jsPDF;
    }

    /**
     * Formats an ISO date string into a highly readable standard format (e.g., "14 Jul 2025").
     * @private
     * @param {string|Date} isoString - The source date.
     * @returns {string} Formatted date string.
     */
    _formatDate(isoString) {
        if (!isoString) return 'N/A';
        const targetDate = new Date(isoString);
        if (isNaN(targetDate.getTime())) return 'Invalid Date';

        return new Intl.DateTimeFormat('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        }).format(targetDate);
    }

    /**
     * Appends the standard MedCare footer and pagination markers to a specific PDF page.
     * @private
     * @param {Object} doc - The active jsPDF instance.
     * @param {number} pageNum - Current page index.
     * @param {number} totalPages - Total page count.
     * @param {number} pageHeight - The height of the current document format in mm.
     */
    _addPageFooter(doc, pageNum, totalPages, pageHeight = 297) {
        doc.setFontSize(9);
        doc.setTextColor(TEXT_MUTED);
        doc.setFont('helvetica', 'normal');
        
        const footerY = pageHeight - 12;
        doc.text('MedCare PWA · Offline-First · Data stored locally on your device', 14, footerY);
        
        const pageString = `Page ${pageNum} of ${totalPages}`;
        const textWidth = doc.getTextWidth(pageString);
        doc.text(pageString, 210 - 14 - textWidth, footerY); // Right aligned for A4 (210mm wide)
    }

    /**
     * Escapes and wraps a string for secure CSV inclusion.
     * @private
     * @param {any} value - The raw value.
     * @returns {string} The CSV-safe string.
     */
    _escapeCSV(value) {
        if (value === null || value === undefined) return '""';
        const stringValue = String(value);
        if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n')) {
            return `"${stringValue.replace(/"/g, '""')}"`;
        }
        return stringValue;
    }

    /**
     * Triggers a secure browser download prompt using Blob URLs.
     * @private
     * @param {string} content - The file content (e.g., CSV string).
     * @param {string} filename - The target download filename.
     * @param {string} mimeType - The MIME type of the blob.
     */
    _triggerDownload(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const objectUrl = URL.createObjectURL(blob);
        
        const anchorElement = document.createElement('a');
        anchorElement.href = objectUrl;
        anchorElement.download = filename;
        anchorElement.style.display = 'none';
        
        document.body.appendChild(anchorElement);
        anchorElement.click();
        
        // Clean up DOM and memory
        setTimeout(() => {
            document.body.removeChild(anchorElement);
            URL.revokeObjectURL(objectUrl);
        }, 100);
    }

    /**
     * Generates a comprehensive, multi-page Adherence PDF report.
     * @param {Object} profile - User profile data.
     * @param {Array<Object>} medications - List of active medications.
     * @param {Array<Object>} doseLogs - Raw dose log telemetry.
     * @param {Object} analytics - Pre-computed adherence metrics from AnalyticsLocal.
     * @returns {Promise<void>}
     */
    async exportAdherencePDF(profile, medications, doseLogs, analytics) {
        try {
            const JsPDFCore = this._getJsPDF();
            const doc = new JsPDFCore({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            const overallRate = analytics?.overall ? Math.round(analytics.overall * 100) : 0;
            const patientName = profile?.name || 'Unknown Patient';
            const bloodType = profile?.bloodType || 'Unspecified';
            const reportDateStr = this._formatDate(new Date());

            // ==========================================
            // PAGE 1: COVER & SUMMARY
            // ==========================================
            
            // Header Band
            doc.setFillColor(BRAND_ORANGE);
            doc.rect(0, 0, 210, 60, 'F');

            // Header Typography
            doc.setTextColor('#FFFFFF');
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28);
            doc.text('MedCare', 14, 25);

            doc.setFontSize(14);
            doc.setFont('helvetica', 'normal');
            doc.text('Medication Adherence Report', 14, 35);

            doc.setFontSize(11);
            doc.text(`Patient: ${patientName} | Blood Type: ${bloodType}`, 14, 48);

            const generatedText = `Generated: ${reportDateStr}`;
            const generatedWidth = doc.getTextWidth(generatedText);
            doc.text(generatedText, 210 - 14 - generatedWidth, 48);

            // Summary Boxes
            doc.setTextColor(TEXT_DARK);
            const boxY = 80;
            const boxWidth = 55;
            const boxHeight = 35;
            const startX = 14;
            const gap = 8;

            const drawSummaryBox = (x, title, value) => {
                doc.setDrawColor(200, 200, 200);
                doc.setFillColor(255, 255, 255);
                doc.roundedRect(x, boxY, boxWidth, boxHeight, 3, 3, 'FD');
                
                doc.setFontSize(10);
                doc.setTextColor(TEXT_MUTED);
                const titleWidth = doc.getTextWidth(title);
                doc.text(title, x + (boxWidth / 2) - (titleWidth / 2), boxY + 12);

                doc.setFontSize(24);
                doc.setTextColor(BRAND_ORANGE);
                doc.setFont('helvetica', 'bold');
                const valWidth = doc.getTextWidth(value);
                doc.text(value, x + (boxWidth / 2) - (valWidth / 2), boxY + 26);
            };

            drawSummaryBox(startX, 'Overall Adherence', `${overallRate}%`);
            drawSummaryBox(startX + boxWidth + gap, 'Active Medications', `${medications.length}`);
            drawSummaryBox(startX + (boxWidth * 2) + (gap * 2), 'Doses Tracked', `${doseLogs.length}`);

            // ==========================================
            // PAGE 2: ACTIVE MEDICATIONS
            // ==========================================
            doc.addPage();
            
            doc.setFontSize(18);
            doc.setTextColor(TEXT_DARK);
            doc.setFont('helvetica', 'bold');
            doc.text('Active Medications', 14, 25);

            // Table Header
            let cursorY = 35;
            doc.setFillColor(BRAND_ORANGE);
            doc.rect(14, cursorY, 182, 10, 'F');
            doc.setTextColor('#FFFFFF');
            doc.setFontSize(10);
            doc.text('Name', 16, cursorY + 7);
            doc.text('Dosage', 80, cursorY + 7);
            doc.text('Frequency', 120, cursorY + 7);
            doc.text('Adherence', 170, cursorY + 7);

            cursorY += 10;
            doc.setTextColor(TEXT_DARK);
            doc.setFont('helvetica', 'normal');

            // Table Rows
            medications.forEach((med, index) => {
                if (cursorY > 270) {
                    doc.addPage();
                    cursorY = 20;
                }

                if (index % 2 === 0) {
                    doc.setFillColor(ROW_ALT_BG);
                    doc.rect(14, cursorY, 182, 10, 'F');
                }

                const medRate = analytics?.perMedication?.get(med.id);
                const rateText = medRate !== undefined ? `${Math.round(medRate * 100)}%` : 'N/A';

                doc.text(String(med.name).substring(0, 30), 16, cursorY + 7);
                doc.text(String(med.dosage), 80, cursorY + 7);
                doc.text(String(med.frequency).replace('_', ' '), 120, cursorY + 7);
                doc.text(rateText, 170, cursorY + 7);

                cursorY += 10;
            });

            // ==========================================
            // PAGE 3: RECENT DOSE LOGS
            // ==========================================
            doc.addPage();

            doc.setFontSize(18);
            doc.setTextColor(TEXT_DARK);
            doc.setFont('helvetica', 'bold');
            doc.text('Recent Dose Log', 14, 25);

            doc.setFontSize(10);
            doc.setTextColor(TEXT_MUTED);
            doc.setFont('helvetica', 'normal');
            doc.text('Showing most recent 60 entries.', 14, 32);

            cursorY = 40;
            doc.setFillColor(BRAND_ORANGE);
            doc.rect(14, cursorY, 182, 10, 'F');
            doc.setTextColor('#FFFFFF');
            doc.setFont('helvetica', 'bold');
            doc.text('Date', 16, cursorY + 7);
            doc.text('Medication', 60, cursorY + 7);
            doc.text('Time', 130, cursorY + 7);
            doc.text('Status', 170, cursorY + 7);

            cursorY += 10;
            doc.setFont('helvetica', 'normal');

            // Process Logs (Descending, max 60)
            const recentLogs = [...doseLogs]
                .sort((a, b) => new Date(b.scheduledAt || b.takenAt) - new Date(a.scheduledAt || a.takenAt))
                .slice(0, 60);
                
            const medMap = new Map(medications.map(m => [m.id, m]));

            recentLogs.forEach((log, index) => {
                if (cursorY > 270) {
                    doc.addPage();
                    cursorY = 20;
                }

                if (index % 2 === 0) {
                    doc.setFillColor(ROW_ALT_BG);
                    doc.rect(14, cursorY, 182, 10, 'F');
                }

                const targetDate = new Date(log.scheduledAt || log.takenAt);
                const dateStr = this._formatDate(targetDate);
                const timeStr = targetDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
                const medName = medMap.get(log.medicationId)?.name || `ID: ${log.medicationId}`;
                const statusStr = String(log.status).toUpperCase();

                doc.setTextColor(TEXT_DARK);
                doc.text(dateStr, 16, cursorY + 7);
                doc.text(medName.substring(0, 30), 60, cursorY + 7);
                doc.text(timeStr, 130, cursorY + 7);

                if (log.status === 'taken') {
                    doc.setTextColor(SUCCESS_GREEN);
                } else if (log.status === 'missed') {
                    doc.setTextColor(BRAND_RED);
                } else {
                    doc.setTextColor(TEXT_MUTED);
                }
                
                doc.setFont('helvetica', 'bold');
                doc.text(statusStr, 170, cursorY + 7);
                doc.setFont('helvetica', 'normal');

                cursorY += 10;
            });

            // ==========================================
            // FOOTER INJECTION
            // ==========================================
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                this._addPageFooter(doc, i, totalPages, 297);
            }

            // Save the document
            const filenameDate = new Date().toISOString().split('T')[0];
            doc.save(`MedCare-Report-${filenameDate}.pdf`);
            console.log(`[ExportEngine] Successfully generated ${totalPages}-page PDF report.`);

        } catch (error) {
            console.error('[ExportEngine] PDF Generation Failed:', error);
            throw error;
        }
    }

    /**
     * Serializes the medication matrix into a downloadable CSV file.
     * @param {Array<Object>} medications - Active medication inventory.
     * @returns {void}
     */
    exportMedicationsCSV(medications) {
        try {
            if (!Array.isArray(medications) || medications.length === 0) {
                throw new Error('No medications available to export.');
            }

            const headers = ['ID', 'Name', 'Generic Name', 'Category', 'Dosage', 'Frequency', 'Active Days', 'Start Date', 'End Date', 'Notes'];
            
            const rows = medications.map(med => [
                this._escapeCSV(med.id),
                this._escapeCSV(med.name),
                this._escapeCSV(med.genericName),
                this._escapeCSV(med.category),
                this._escapeCSV(med.dosage),
                this._escapeCSV(med.frequency),
                this._escapeCSV((med.activeDays || []).join('|')),
                this._escapeCSV(med.startDate),
                this._escapeCSV(med.endDate),
                this._escapeCSV(med.notes)
            ]);

            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            const filenameDate = new Date().toISOString().split('T')[0];
            
            this._triggerDownload(csvContent, `MedCare-Medications-${filenameDate}.csv`, 'text/csv;charset=utf-8;');
            console.log('[ExportEngine] Medications CSV export deployed.');

        } catch (error) {
            console.error('[ExportEngine] CSV Generation Failed:', error);
            throw error;
        }
    }

    /**
     * Serializes chronological dose telemetry into a downloadable CSV file.
     * @param {Array<Object>} doseLogs - Raw telemetry event list.
     * @param {Map<string|number, Object>} medicationsMap - Reference map to link medication names.
     * @returns {void}
     */
    exportDoseLogsCSV(doseLogs, medicationsMap) {
        try {
            if (!Array.isArray(doseLogs) || doseLogs.length === 0) {
                throw new Error('No dose logs available to export.');
            }

            const headers = ['Date', 'Time', 'Medication Name', 'Dosage', 'Status', 'Notes'];
            
            const rows = doseLogs.map(log => {
                const targetDate = new Date(log.scheduledAt || log.takenAt);
                const med = medicationsMap.get(log.medicationId);
                
                return [
                    this._escapeCSV(this._formatDate(targetDate)),
                    this._escapeCSV(targetDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })),
                    this._escapeCSV(med ? med.name : `Unknown (ID: ${log.medicationId})`),
                    this._escapeCSV(med ? med.dosage : ''),
                    this._escapeCSV(log.status),
                    this._escapeCSV(log.notes)
                ];
            });

            const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
            const filenameDate = new Date().toISOString().split('T')[0];
            
            this._triggerDownload(csvContent, `MedCare-DoseLogs-${filenameDate}.csv`, 'text/csv;charset=utf-8;');
            console.log('[ExportEngine] Dose Logs CSV export deployed.');

        } catch (error) {
            console.error('[ExportEngine] Dose Logs CSV Generation Failed:', error);
            throw error;
        }
    }

    /**
     * Generates a high-contrast A6 wallet card for emergency physical deployment.
     * @param {Object} profile - Secure user demographics layer.
     * @param {Array<Object>} medications - Current active medication array.
     * @returns {Promise<void>}
     */
    async exportEmergencyCardPDF(profile, medications) {
        try {
            const JsPDFCore = this._getJsPDF();
            const doc = new JsPDFCore({ orientation: 'portrait', unit: 'mm', format: 'a6' });
            
            // A6 dimensions: 105mm x 148mm
            
            // Header Band (Danger Red)
            doc.setFillColor(BRAND_RED);
            doc.rect(0, 0, 105, 20, 'F');

            doc.setTextColor('#FFFFFF');
            doc.setFontSize(11);
            doc.setFont('helvetica', 'bold');
            doc.text('MEDICAL INFORMATION', 52.5, 10, { align: 'center' });
            doc.setFontSize(9);
            doc.text('IN CASE OF EMERGENCY', 52.5, 15, { align: 'center' });

            // Personal Information Core
            doc.setTextColor(TEXT_DARK);
            doc.setFontSize(14);
            const patientName = profile?.name ? String(profile.name).toUpperCase() : 'UNKNOWN PATIENT';
            doc.text(patientName, 10, 30);

            doc.setFontSize(10);
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(TEXT_MUTED);
            doc.text('BLOOD TYPE:', 10, 40);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(BRAND_RED);
            doc.text(profile?.bloodType || 'UNKNOWN', 36, 40);

            doc.setFont('helvetica', 'normal');
            doc.setTextColor(TEXT_MUTED);
            doc.text('ALLERGIES:', 10, 48);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(TEXT_DARK);
            
            let allergiesStr = 'NONE KNOWN';
            if (profile?.allergies && Array.isArray(profile.allergies) && profile.allergies.length > 0) {
                allergiesStr = profile.allergies.join(', ');
            } else if (typeof profile?.allergies === 'string' && profile.allergies.trim() !== '') {
                allergiesStr = profile.allergies;
            }
            
            // Text wrap handling for long allergy lists
            const splitAllergies = doc.splitTextToSize(allergiesStr, 65);
            doc.text(splitAllergies, 36, 48);

            // Active Medications Strip
            let cursorY = 48 + (splitAllergies.length * 5) + 5;
            
            doc.setFillColor(BRAND_ORANGE);
            doc.rect(10, cursorY, 85, 6, 'F');
            doc.setTextColor('#FFFFFF');
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text('ACTIVE MEDICATIONS', 12, cursorY + 4);

            cursorY += 10;
            doc.setTextColor(TEXT_DARK);

            if (!Array.isArray(medications) || medications.length === 0) {
                doc.setFont('helvetica', 'normal');
                doc.text('No active medications recorded.', 12, cursorY);
            } else {
                medications.forEach((med) => {
                    if (cursorY > 130) {
                        doc.addPage();
                        cursorY = 20;
                    }
                    doc.setFont('helvetica', 'bold');
                    doc.text(String(med.name).substring(0, 20), 12, cursorY);
                    
                    doc.setFont('helvetica', 'normal');
                    doc.setTextColor(BRAND_ORANGE);
                    doc.text(String(med.dosage), 65, cursorY);
                    
                    doc.setTextColor(TEXT_DARK);
                    
                    doc.setDrawColor(220, 220, 220);
                    doc.line(12, cursorY + 2, 95, cursorY + 2);
                    
                    cursorY += 8;
                });
            }

            // A6 Footer
            doc.setFontSize(7);
            doc.setTextColor(TEXT_MUTED);
            doc.setFont('helvetica', 'italic');
            doc.text('Generated by MedCare PWA. Verify with physician.', 52.5, 142, { align: 'center' });

            const filenameDate = new Date().toISOString().split('T')[0];
            doc.save(`MedCare-Emergency-Card-${filenameDate}.pdf`);
            console.log('[ExportEngine] Emergency A6 PDF Card deployed.');

        } catch (error) {
            console.error('[ExportEngine] Emergency Card PDF Generation Failed:', error);
            throw error;
        }
    }
}

// Export singleton engine configuration mapping
export const exportEngine = new ExportEngine();