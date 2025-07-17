// Enhanced professional sync status display component
class SyncStatusDisplay {
    constructor(companyId) {
        this.companyId = companyId;
        this.container = null;
        this.pollInterval = null;
        this.startTime = null;
        this.lastStatus = null;
        this.lastDetails = null;
        this.progressHistory = [];
        this.estimatedEndTime = null;
    }

    create() {
        this.container = document.createElement('div');
        this.container.className = 'sync-status-container';
        this.container.innerHTML = `
            <div class="sync-card">
                <div class="sync-header">
                    <div class="sync-icon">
                        <i class="fas fa-sync fa-spin" id="sync-icon"></i>
                    </div>
                    <div class="sync-title">
                        <h3>Data Synchronization</h3>
                        <p class="sync-subtitle">Importing your financial data from MYOB</p>
                    </div>
                </div>

                <div class="sync-progress-section">
                    <div class="progress-main">
                        <div class="progress-bar-container">
                            <div class="progress-bar-track">
                                <div class="progress-bar-fill" id="sync-progress-bar"></div>
                                <div class="progress-percentage" id="sync-percentage">0%</div>
                            </div>
                        </div>
                        <div class="progress-details">
                            <span id="sync-status-text">Initializing synchronization...</span>
                        </div>
                    </div>
                </div>

                <div class="sync-metrics">
                    <div class="metric-grid">
                        <div class="metric-item">
                            <div class="metric-icon">
                                <i class="fas fa-database"></i>
                            </div>
                            <div class="metric-content">
                                <div class="metric-value" id="sync-items-text">0 / 0</div>
                                <div class="metric-label">Records Processed</div>
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">
                                <i class="fas fa-clock"></i>
                            </div>
                            <div class="metric-content">
                                <div class="metric-value" id="sync-time-text">00:00</div>
                                <div class="metric-label">Time Elapsed</div>
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">
                                <i class="fas fa-hourglass-half"></i>
                            </div>
                            <div class="metric-content">
                                <div class="metric-value" id="sync-eta-text">Calculating...</div>
                                <div class="metric-label">Estimated Time</div>
                            </div>
                        </div>
                        <div class="metric-item">
                            <div class="metric-icon">
                                <i class="fas fa-tachometer-alt"></i>
                            </div>
                            <div class="metric-content">
                                <div class="metric-value" id="sync-speed-text">0/min</div>
                                <div class="metric-label">Processing Rate</div>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="sync-activity">
                    <div class="activity-header">
                        <h4><i class="fas fa-list"></i> Activity Log</h4>
                        <div class="activity-controls">
                            <button class="clear-log-btn" onclick="this.closest('.sync-status-container').querySelector('.log-entries').innerHTML = ''">
                                <i class="fas fa-trash"></i> Clear
                            </button>
                        </div>
                    </div>
                    <div class="log-entries" id="sync-log-entries"></div>
                </div>

                <div class="sync-error" id="sync-error">
                    <div class="error-content">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div class="error-details">
                            <div class="error-title">Synchronization Error</div>
                            <div class="error-message" id="sync-error-text"></div>
                        </div>
                    </div>
                    <div class="error-actions">
                        <button class="retry-btn" onclick="location.reload()">
                            <i class="fas fa-redo"></i> Retry Sync
                        </button>
                        <button class="skip-btn" onclick="window.history.back()">
                            <i class="fas fa-arrow-left"></i> Go Back
                        </button>
                    </div>
                </div>
            </div>

            <style>
                .sync-status-container {
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                }

                .sync-card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
                    overflow: hidden;
                    border: 1px solid #e2e8f0;
                }

                .sync-header {
                    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                    color: white;
                    padding: 24px;
                    display: flex;
                    align-items: center;
                    gap: 16px;
                }

                .sync-icon {
                    width: 48px;
                    height: 48px;
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 12px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 20px;
                }

                .sync-title h3 {
                    margin: 0 0 4px 0;
                    font-size: 1.5rem;
                    font-weight: 600;
                }

                .sync-subtitle {
                    margin: 0;
                    opacity: 0.9;
                    font-size: 0.9rem;
                }

                .sync-progress-section {
                    padding: 32px 24px;
                    background: #f8fafc;
                    border-bottom: 1px solid #e2e8f0;
                }

                .progress-bar-container {
                    position: relative;
                    margin-bottom: 16px;
                }

                .progress-bar-track {
                    height: 12px;
                    background: #e2e8f0;
                    border-radius: 6px;
                    overflow: hidden;
                    position: relative;
                }

                .progress-bar-fill {
                    height: 100%;
                    background: linear-gradient(90deg, #059669 0%, #10b981 100%);
                    border-radius: 6px;
                    transition: width 0.5s ease-out;
                    position: relative;
                    overflow: hidden;
                }

                .progress-bar-fill.failed {
                    background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
                }

                .progress-bar-fill::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
                    animation: shimmer 2s infinite;
                }

                @keyframes shimmer {
                    0% { left: -100%; }
                    100% { left: 100%; }
                }

                .progress-percentage {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    font-weight: 600;
                    font-size: 0.75rem;
                    color: #1e293b;
                    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
                }

                .progress-details {
                    text-align: center;
                    color: #64748b;
                    font-weight: 500;
                }

                .sync-metrics {
                    padding: 24px;
                }

                .metric-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                    gap: 16px;
                }

                .metric-item {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    padding: 16px;
                    background: #f8fafc;
                    border-radius: 12px;
                    border: 1px solid #e2e8f0;
                    transition: all 0.2s ease;
                }

                .metric-item:hover {
                    background: #f1f5f9;
                    transform: translateY(-2px);
                }

                .metric-icon {
                    width: 36px;
                    height: 36px;
                    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
                    color: white;
                    border-radius: 8px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-size: 14px;
                }

                .metric-content {
                    flex: 1;
                }

                .metric-value {
                    font-weight: 600;
                    font-size: 1.1rem;
                    color: #1e293b;
                    margin-bottom: 2px;
                }

                .metric-label {
                    font-size: 0.75rem;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.025em;
                }

                .sync-activity {
                    padding: 24px;
                    background: white;
                }

                .activity-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 16px;
                }

                .activity-header h4 {
                    margin: 0;
                    font-size: 1.1rem;
                    color: #1e293b;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                }

                .clear-log-btn {
                    background: none;
                    border: 1px solid #e2e8f0;
                    color: #64748b;
                    padding: 6px 12px;
                    border-radius: 6px;
                    font-size: 0.75rem;
                    cursor: pointer;
                    transition: all 0.2s ease;
                }

                .clear-log-btn:hover {
                    background: #f8fafc;
                    color: #1e293b;
                }

                .log-entries {
                    max-height: 200px;
                    overflow-y: auto;
                    border: 1px solid #e2e8f0;
                    border-radius: 8px;
                    background: #f8fafc;
                }

                .log-entry {
                    display: flex;
                    align-items: flex-start;
                    gap: 12px;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e2e8f0;
                    font-size: 0.875rem;
                    animation: slideIn 0.3s ease-out;
                }

                .log-entry:last-child {
                    border-bottom: none;
                }

                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }

                .log-entry.log-info {
                    color: #64748b;
                }

                .log-entry.log-success {
                    color: #059669;
                    background: rgba(5, 150, 105, 0.05);
                }

                .log-entry.log-error {
                    color: #dc2626;
                    background: rgba(220, 38, 38, 0.05);
                }

                .log-time {
                    font-weight: 600;
                    min-width: 60px;
                    color: #64748b;
                    font-size: 0.75rem;
                }

                .log-message {
                    flex: 1;
                }

                .sync-error {
                    background: #fee2e2;
                    border-top: 1px solid #fecaca;
                    padding: 24px;
                    display: none;
                }

                .sync-error.show {
                    display: block;
                }

                .error-content {
                    display: flex;
                    align-items: flex-start;
                    gap: 16px;
                    margin-bottom: 20px;
                }

                .error-content i {
                    color: #dc2626;
                    font-size: 1.5rem;
                    margin-top: 2px;
                }

                .error-title {
                    font-weight: 600;
                    color: #991b1b;
                    margin-bottom: 4px;
                }

                .error-message {
                    color: #dc2626;
                    line-height: 1.5;
                }

                .error-actions {
                    display: flex;
                    gap: 12px;
                }

                .retry-btn, .skip-btn {
                    padding: 10px 16px;
                    border-radius: 8px;
                    font-weight: 600;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    font-size: 0.875rem;
                }

                .retry-btn {
                    background: #dc2626;
                    color: white;
                    border: none;
                }

                .retry-btn:hover {
                    background: #b91c1c;
                }

                .skip-btn {
                    background: white;
                    color: #64748b;
                    border: 1px solid #d1d5db;
                }

                .skip-btn:hover {
                    background: #f9fafb;
                    color: #374151;
                }

                @media (max-width: 768px) {
                    .sync-status-container {
                        padding: 16px;
                    }

                    .sync-header {
                        padding: 20px;
                        flex-direction: column;
                        text-align: center;
                        gap: 12px;
                    }

                    .metric-grid {
                        grid-template-columns: repeat(2, 1fr);
                        gap: 12px;
                    }

                    .metric-item {
                        padding: 12px;
                    }

                    .error-actions {
                        flex-direction: column;
                    }
                }
            </style>
        `;
        return this.container;
    }

    start() {
        this.startTime = Date.now();
        this.addLogEntry('Synchronization started', 'info');
        this.pollInterval = setInterval(() => this.checkStatus(), 1500);
        this.updateTimer();
        this.animateIcon();
    }

    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
        this.stopIconAnimation();
    }

    animateIcon() {
        const icon = document.getElementById('sync-icon');
        if (icon) {
            icon.className = 'fas fa-sync fa-spin';
        }
    }

    stopIconAnimation() {
        const icon = document.getElementById('sync-icon');
        if (icon) {
            icon.className = 'fas fa-check';
        }
    }

    async checkStatus() {
        try {
            const response = await fetch(`/api/sync/status/${this.companyId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    this.updateDisplay({
                        status: 'idle',
                        processed_items: 0,
                        total_items: 0,
                        details: 'No sync in progress'
                    });
                    return;
                }
                throw new Error(`Status check failed: ${response.status}`);
            }

            const data = await response.json();
            this.updateDisplay(data);

            // Check if sync is complete
            if (data.status === 'Completed' || data.status === 'Failed') {
                this.stop();
                this.addLogEntry(`Sync ${data.status.toLowerCase()}`, data.status === 'Failed' ? 'error' : 'success');
                
                if (data.status === 'Completed') {
                    this.showSuccess();
                    setTimeout(() => {
                        window.location.reload();
                    }, 3000);
                } else {
                    this.showError(data.error || 'Sync failed with unknown error');
                }
            }
        } catch (error) {
            console.error('Error checking sync status:', error);
            this.addLogEntry(`Error: ${error.message}`, 'error');
        }
    }

    updateDisplay(data) {
        const statusText = document.getElementById('sync-status-text');
        const progressBar = document.getElementById('sync-progress-bar');
        const percentage = document.getElementById('sync-percentage');
        const itemsText = document.getElementById('sync-items-text');
        const speedText = document.getElementById('sync-speed-text');

        const processed = data.processed_items || 0;
        const total = data.total_items || 0;
        const progress = total > 0 ? Math.round((processed / total) * 100) : 0;

        if (statusText) {
            statusText.textContent = data.details || data.status || 'Processing...';
        }

        if (progressBar && percentage) {
            progressBar.style.width = `${progress}%`;
            percentage.textContent = `${progress}%`;
            
            if (data.status === 'Failed') {
                progressBar.classList.add('failed');
            }
        }

        if (itemsText) {
            itemsText.textContent = `${processed.toLocaleString()} / ${total.toLocaleString()}`;
        }

        // Calculate processing speed and ETA
        this.updateProgressMetrics(processed, total);

        // Add log entry for significant events
        if (data.details && data.details !== this.lastDetails) {
            this.addLogEntry(data.details, 'info');
            this.lastDetails = data.details;
        }

        this.lastStatus = data;
    }

    updateProgressMetrics(processed, total) {
        if (!this.startTime) return;

        const elapsed = (Date.now() - this.startTime) / 1000;
        const rate = processed > 0 ? processed / (elapsed / 60) : 0; // items per minute
        
        // Store progress history for ETA calculation
        this.progressHistory.push({ time: Date.now(), processed });
        if (this.progressHistory.length > 10) {
            this.progressHistory.shift();
        }

        // Calculate ETA based on recent progress
        let eta = 'Calculating...';
        if (this.progressHistory.length >= 2 && total > 0) {
            const recent = this.progressHistory.slice(-3);
            const timeSpan = (recent[recent.length - 1].time - recent[0].time) / 1000;
            const progressSpan = recent[recent.length - 1].processed - recent[0].processed;
            
            if (progressSpan > 0 && timeSpan > 0) {
                const recentRate = progressSpan / timeSpan;
                const remaining = total - processed;
                const etaSeconds = remaining / recentRate;
                
                if (etaSeconds < 60) {
                    eta = `${Math.round(etaSeconds)}s`;
                } else if (etaSeconds < 3600) {
                    eta = `${Math.round(etaSeconds / 60)}m`;
                } else {
                    eta = `${Math.round(etaSeconds / 3600)}h`;
                }
            }
        }

        const speedText = document.getElementById('sync-speed-text');
        const etaText = document.getElementById('sync-eta-text');

        if (speedText) {
            speedText.textContent = `${Math.round(rate)}/min`;
        }

        if (etaText) {
            etaText.textContent = eta;
        }
    }

    updateTimer() {
        if (!this.startTime) return;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;
        
        const timeText = document.getElementById('sync-time-text');
        if (timeText) {
            timeText.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        if (this.pollInterval) {
            setTimeout(() => this.updateTimer(), 1000);
        }
    }

    addLogEntry(message, type = 'info') {
        const logEntries = document.getElementById('sync-log-entries');
        if (!logEntries) return;

        const entry = document.createElement('div');
        entry.className = `log-entry log-${type}`;
        
        const timestamp = new Date().toLocaleTimeString();
        entry.innerHTML = `
            <span class="log-time">${timestamp}</span>
            <span class="log-message">${this.escapeHtml(message)}</span>
        `;

        logEntries.insertBefore(entry, logEntries.firstChild);

        // Keep only last 50 entries
        while (logEntries.children.length > 50) {
            logEntries.removeChild(logEntries.lastChild);
        }
    }

    showSuccess() {
        const statusText = document.getElementById('sync-status-text');
        const icon = document.getElementById('sync-icon');
        
        if (statusText) {
            statusText.textContent = 'Synchronization completed successfully!';
        }
        
        if (icon) {
            icon.className = 'fas fa-check';
            icon.style.color = '#059669';
        }

        this.addLogEntry('All data synchronized successfully', 'success');
        this.addLogEntry('Redirecting to dashboard in 3 seconds...', 'info');
    }

    showError(message) {
        const errorDiv = document.getElementById('sync-error');
        const errorText = document.getElementById('sync-error-text');
        const icon = document.getElementById('sync-icon');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.classList.add('show');
            this.addLogEntry(`Error: ${message}`, 'error');
        }

        if (icon) {
            icon.className = 'fas fa-exclamation-triangle';
            icon.style.color = '#dc2626';
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for use in other files
window.SyncStatusDisplay = SyncStatusDisplay; 