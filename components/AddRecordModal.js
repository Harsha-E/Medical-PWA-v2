import db from '../core/db.js';
import state from '../core/state.js';

export default class AddRecordModal {
    constructor() {
        this.modalId = 'add-record-modal';
        this.container = null;
        this.render();
        this.attachListeners();
    }

    render() {
        // Remove existing if present
        const existing = document.getElementById(this.modalId);
        if (existing) existing.remove();

        this.container = document.createElement('div');
        this.container.id = this.modalId;
        this.container.className = 'add-record-overlay';
        this.container.innerHTML = `
            <div class="smart-form-modal">
                <div class="modal-header">
                    <h2>Add Clinical Record</h2>
                    <button id="close-modal-btn">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    </button>
                </div>
                
                <form id="add-record-form">
                    <div class="input-group">
                        <label>Title</label>
                        <input type="text" id="record-title" required placeholder="e.g. Annual Blood Work">
                    </div>

                    <div class="grid-2">
                        <div class="input-group">
                            <label>Date</label>
                            <input type="date" id="record-date" required>
                        </div>
                        <div class="input-group">
                            <label>Category</label>
                            <select id="record-category" required>
                                <option value="General">General</option>
                                <option value="Medication">Medication</option>
                                <option value="Lab Test">Lab Test</option>
                                <option value="Surgery">Surgery</option>
                                <option value="Diagnosis/Disease">Diagnosis/Disease</option>
                            </select>
                        </div>
                    </div>

                    <!-- Conditional Status Toggle for Diagnosis/Disease -->
                    <div class="input-group hidden" id="status-toggle-group">
                        <label>Status</label>
                        <div class="status-toggle">
                            <button type="button" class="status-btn active-state" data-status="Active">Active</button>
                            <button type="button" class="status-btn resolved-state" data-status="Resolved/Past">Resolved / Past</button>
                        </div>
                        <input type="hidden" id="record-status" value="Active">
                    </div>

                    <div class="input-group">
                        <label>Notes</label>
                        <textarea id="record-notes" rows="3" placeholder="Clinical notes, findings, or instructions..."></textarea>
                    </div>

                    <div class="input-group">
                        <label>Attachment (Optional)</label>
                        <div class="file-upload-wrapper">
                            <input type="file" id="record-file" accept="image/*,.pdf">
                            <div class="file-upload-ui">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
                                <span id="file-name-display">Select a file...</span>
                            </div>
                        </div>
                    </div>

                    <button type="submit" class="submit-btn" id="save-record-btn">
                        <span>Save Record</span>
                        <div class="loader hidden"></div>
                    </button>
                </form>
            </div>
            <style>
                .add-record-overlay {
                    position: fixed;
                    inset: 0;
                    z-index: 10000;
                    background: rgba(10, 4, 7, 0.8);
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    display: flex;
                    justify-content: center;
                    align-items: flex-end;
                    opacity: 0;
                    pointer-events: none;
                    transition: opacity 0.3s ease;
                }
                .add-record-overlay.visible {
                    opacity: 1;
                    pointer-events: all;
                }
                .smart-form-modal {
                    width: 100%;
                    max-width: 600px;
                    background: #0a0407;
                    border-radius: 32px 32px 0 0;
                    padding: 32px 24px;
                    box-shadow: 0 -10px 40px rgba(0,0,0,0.5);
                    transform: translateY(100%);
                    transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1);
                    max-height: 90vh;
                    overflow-y: auto;
                    border-top: 1px solid rgba(255,255,255,0.05);
                }
                .add-record-overlay.visible .smart-form-modal {
                    transform: translateY(0);
                }
                @media (min-width: 768px) {
                    .add-record-overlay {
                        align-items: center;
                    }
                    .smart-form-modal {
                        border-radius: 24px;
                        border: 1px solid rgba(255,255,255,0.05);
                        box-shadow: 
                            10px 10px 30px rgba(0,0,0,0.8),
                            -5px -5px 15px rgba(255,255,255,0.02);
                        transform: scale(0.95);
                    }
                    .add-record-overlay.visible .smart-form-modal {
                        transform: scale(1);
                    }
                }
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 24px;
                }
                .modal-header h2 {
                    font-size: 20px;
                    font-weight: 800;
                    color: #ffb88c; /* Primary Rose-Gold */
                    margin: 0;
                    letter-spacing: 0.05em;
                }
                #close-modal-btn {
                    background: transparent;
                    border: none;
                    color: rgba(255,255,255,0.5);
                    cursor: pointer;
                    padding: 8px;
                    border-radius: 50%;
                    display: flex;
                    transition: all 0.2s;
                }
                #close-modal-btn:hover {
                    background: rgba(255,255,255,0.1);
                    color: #fff;
                }
                .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                }
                .input-group {
                    margin-bottom: 20px;
                    display: flex;
                    flex-direction: column;
                    gap: 8px;
                }
                .input-group.hidden {
                    display: none;
                }
                .input-group label {
                    font-size: 11px;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    font-weight: 700;
                    color: rgba(255,255,255,0.4);
                }
                .input-group input[type="text"],
                .input-group input[type="date"],
                .input-group select,
                .input-group textarea {
                    background: #0a0407;
                    border: none;
                    color: #fff;
                    font-family: inherit;
                    font-size: 15px;
                    padding: 14px 16px;
                    border-radius: 16px;
                    outline: none;
                    box-shadow: 
                        inset 4px 4px 8px rgba(0,0,0,0.8),
                        inset -2px -2px 6px rgba(255,255,255,0.03);
                    transition: box-shadow 0.3s;
                }
                .input-group input:focus,
                .input-group select:focus,
                .input-group textarea:focus {
                    box-shadow: 
                        inset 4px 4px 8px rgba(0,0,0,0.9),
                        inset -2px -2px 6px rgba(255,184,140,0.1);
                }
                
                /* File Upload UI */
                .file-upload-wrapper {
                    position: relative;
                }
                .file-upload-wrapper input[type="file"] {
                    position: absolute;
                    inset: 0;
                    opacity: 0;
                    cursor: pointer;
                    z-index: 2;
                    width: 100%;
                }
                .file-upload-ui {
                    background: #0a0407;
                    border-radius: 16px;
                    padding: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    color: rgba(255,255,255,0.5);
                    box-shadow: 
                        inset 4px 4px 8px rgba(0,0,0,0.8),
                        inset -2px -2px 6px rgba(255,255,255,0.03);
                }
                .file-upload-wrapper:hover .file-upload-ui {
                    color: #ffb88c;
                }

                /* Status Toggle */
                .status-toggle {
                    display: flex;
                    background: rgba(0,0,0,0.5);
                    border-radius: 999px;
                    padding: 4px;
                    box-shadow: inset 4px 4px 8px rgba(0,0,0,0.8);
                }
                .status-btn {
                    flex: 1;
                    background: transparent;
                    border: none;
                    padding: 10px;
                    border-radius: 999px;
                    color: rgba(255,255,255,0.4);
                    font-size: 12px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.1em;
                    cursor: pointer;
                    transition: all 0.3s;
                }
                .status-btn.selected.active-state {
                    background: #7f2f5d; /* Burgundy Accent */
                    color: #fff;
                    box-shadow: 0 4px 12px rgba(127, 47, 93, 0.4);
                }
                .status-btn.selected.resolved-state {
                    background: rgba(255,255,255,0.05); /* Muted clay */
                    color: rgba(255,255,255,0.8);
                    box-shadow: 
                        4px 4px 8px rgba(0,0,0,0.4),
                        -2px -2px 4px rgba(255,255,255,0.02);
                }

                /* Submit Button */
                .submit-btn {
                    width: 100%;
                    margin-top: 12px;
                    padding: 16px;
                    border: none;
                    border-radius: 16px;
                    background: #0a0407;
                    color: #ffb88c;
                    font-size: 14px;
                    font-weight: 800;
                    text-transform: uppercase;
                    letter-spacing: 0.15em;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    position: relative;
                    box-shadow: 
                        6px 6px 12px rgba(0,0,0,0.8),
                        -4px -4px 10px rgba(255,255,255,0.04);
                    transition: all 0.2s;
                }
                .submit-btn:active {
                    box-shadow: 
                        inset 4px 4px 8px rgba(0,0,0,0.8),
                        inset -2px -2px 6px rgba(255,255,255,0.03);
                    color: rgba(255, 184, 140, 0.6);
                }
                .submit-btn.loading span {
                    opacity: 0;
                }
                .submit-btn .loader {
                    position: absolute;
                    width: 20px;
                    height: 20px;
                    border: 3px solid rgba(255,184,140,0.3);
                    border-top-color: #ffb88c;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                }
                @keyframes spin { 100% { transform: rotate(360deg); } }
            </style>
        `;
        document.body.appendChild(this.container);

        // Set default date to today
        document.getElementById('record-date').value = new Date().toISOString().split('T')[0];
    }

    attachListeners() {
        // Toggle active class manually for delay
        setTimeout(() => this.container.classList.add('visible'), 10);

        // Close logic
        const close = () => {
            this.container.classList.remove('visible');
            setTimeout(() => this.container.remove(), 400);
        };
        document.getElementById('close-modal-btn').addEventListener('click', close);
        this.container.addEventListener('click', (e) => {
            if (e.target === this.container) close();
        });

        // Category dropdown conditional rendering
        const categorySelect = document.getElementById('record-category');
        const statusGroup = document.getElementById('status-toggle-group');
        categorySelect.addEventListener('change', (e) => {
            if (e.target.value === 'Diagnosis/Disease') {
                statusGroup.classList.remove('hidden');
            } else {
                statusGroup.classList.add('hidden');
            }
        });

        // Status Toggle buttons
        const statusInput = document.getElementById('record-status');
        const statusBtns = this.container.querySelectorAll('.status-btn');
        // Initial setup
        this.container.querySelector('[data-status="Active"]').classList.add('selected');
        
        statusBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                statusBtns.forEach(b => b.classList.remove('selected'));
                btn.classList.add('selected');
                statusInput.value = btn.dataset.status;
            });
        });

        // File Input Display
        const fileInput = document.getElementById('record-file');
        const fileNameDisplay = document.getElementById('file-name-display');
        fileInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                fileNameDisplay.textContent = e.target.files[0].name;
            } else {
                fileNameDisplay.textContent = 'Select a file...';
            }
        });

        // Submit Form
        document.getElementById('add-record-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('save-record-btn');
            const loader = submitBtn.querySelector('.loader');
            submitBtn.classList.add('loading');
            loader.classList.remove('hidden');

            try {
                const title = document.getElementById('record-title').value;
                const date = document.getElementById('record-date').value;
                const category = document.getElementById('record-category').value;
                const notes = document.getElementById('record-notes').value;
                const status = statusInput.value;
                const file = fileInput.files[0];

                let publicURL = null;

                // Handle File Upload to Supabase REST API
                if (file) {
                    // Fallbacks to standard config or ENV if state is missing them
                    const supabaseUrl = state.supabaseUrl || window.SUPABASE_URL || 'https://ujiviocutexqbigsorol.supabase.co';
                    const supabaseKey = state.supabaseAnonKey || window.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVqaXZpb2N1dGV4cWJpZ3Nvcm9sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE4NzU4NzgsImV4cCI6MjA5NzQ1MTg3OH0.AR7N-h-FJ5iE12EUqp3j8HyuskOoU1od8XekcbqtX-4';
                    
                    const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
                    
                    const response = await fetch(`${supabaseUrl}/storage/v1/object/medical-records/${fileName}`, {
                        method: 'POST',
                        headers: {
                            'apikey': supabaseKey,
                            'Authorization': `Bearer ${supabaseKey}`,
                            'Content-Type': file.type || 'application/octet-stream'
                        },
                        body: file
                    });

                    if (!response.ok) {
                        throw new Error('Failed to upload file to Supabase');
                    }

                    publicURL = `${supabaseUrl}/storage/v1/object/public/medical-records/${fileName}`;
                }

                // Construct Unified JSON Payload
                const payload = {
                    title,
                    date,
                    type: category,
                    notes,
                    documentUrl: publicURL,
                    updatedAt: new Date().toISOString(),
                    isDeleted: false
                };

                // Add conditional status for Disease
                if (category === 'Diagnosis/Disease') {
                    payload.status = status;
                }

                // Save using ClinicalLogger to ensure user context, sync queues, and schema defaults
                const { default: ClinicalLogger } = await import('../services/ClinicalLogger.js');

                if (category === 'Diagnosis/Disease') {
                    await ClinicalLogger.addDisease({
                        diseaseName: title,
                        clinicalName: title,
                        stage: 'N/A',
                        status: status === 'Active' ? 'Active' : 'Resolved',
                        doctor: 'Unknown',
                        notes: notes,
                        documentUrl: publicURL
                    });
                } else {
                    // Standard historical record
                    await ClinicalLogger.addHistory({
                        type: category,
                        date: date,
                        title: title,
                        provider: 'Self-Reported',
                        notes: notes,
                        documentUrl: publicURL
                    });
                }

                // Event Broadcasting
                document.dispatchEvent(new CustomEvent('ledgerUpdated', { detail: payload }));
                
                close();
            } catch (err) {
                console.error('[AddRecordModal] Error saving record:', err);
                alert('Error saving record. Check console for details.');
            } finally {
                submitBtn.classList.remove('loading');
                loader.classList.add('hidden');
            }
        });
    }
}
