// Enhanced sync status display component
class SyncStatusDisplay {
    constructor(companyId) {
        this.companyId = companyId;
        this.container = null;
        this.pollInterval = null;
        this.startTime = null;
    }

    create() {
        this.container = document.createElement('div');
        this.container.className = 'sync-status-container card';
        this.container.innerHTML = `
            <h3><i class="fas fa-sync"></i> Sync Status</h3>
            <div class="sync-details">
                <div class="sync-metric">
                    <span class="metric-label">Status:</span>
                    <span class="metric-value" id="sync-status-text">Initializing...</span>
                </div>
                <div class="sync-metric">
                    <span class="metric-label">Progress:</span>
                    <span class="metric-value" id="sync-progress-text">0%</span>
                </div>
                <div class="sync-metric">
                    <span class="metric-label">Items:</span>
                    <span class="metric-value" id="sync-items-text">0 / 0</span>
                </div>
                <div class="sync-metric">
                    <span class="metric-label">Time Elapsed:</span>
                    <span class="metric-value" id="sync-time-text">00:00</span>
                </div>
            </div>
            <div class="progress-bar">
                <div class="progress-bar-fill" id="sync-progress-bar"></div>
            </div>
            <div class="sync-log" id="sync-log">
                <h4>Activity Log:</h4>
                <div class="log-entries" id="sync-log-entries"></div>
            </div>
            <div class="sync-error" id="sync-error" style="display: none;">
                <i class="fas fa-exclamation-triangle"></i>
                <span id="sync-error-text"></span>
            </div>
        `;
        return this.container;
    }

    start() {
        this.startTime = Date.now();
        this.addLogEntry('Sync started', 'info');
        this.pollInterval = setInterval(() => this.checkStatus(), 2000);
        this.updateTimer();
    }

    stop() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
            this.pollInterval = null;
        }
    }

    async checkStatus() {
        try {
            const response = await fetch(`/api/sync/status/${this.companyId}`);
            if (!response.ok) {
                if (response.status === 404) {
                    // No sync in progress
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
                    // Reload the page after successful sync
                    setTimeout(() => {
                        window.location.reload();
                    }, 2000);
                }
            }
        } catch (error) {
            console.error('Error checking sync status:', error);
            this.addLogEntry(`Error: ${error.message}`, 'error');
        }
    }

    updateDisplay(data) {
        const statusText = document.getElementById('sync-status-text');
        const progressText = document.getElementById('sync-progress-text');
        const itemsText = document.getElementById('sync-items-text');
        const progressBar = document.getElementById('sync-progress-bar');

        if (statusText) {
            statusText.textContent = data.status || 'Unknown';
            statusText.className = `status-${(data.status || '').toLowerCase()}`;
        }

        const processed = data.processed_items || 0;
        const total = data.total_items || 0;
        const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;

        if (progressText) progressText.textContent = `${percentage}%`;
        if (itemsText) itemsText.textContent = `${processed.toLocaleString()} / ${total.toLocaleString()}`;
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
            progressBar.className = `progress-bar-fill ${data.status === 'Failed' ? 'failed' : ''}`;
        }

        // Add log entry for significant events
        if (data.details && data.details !== this.lastDetails) {
            this.addLogEntry(data.details, 'info');
            this.lastDetails = data.details;
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

        // Keep only last 20 entries
        while (logEntries.children.length > 20) {
            logEntries.removeChild(logEntries.lastChild);
        }
    }

    showError(message) {
        const errorDiv = document.getElementById('sync-error');
        const errorText = document.getElementById('sync-error-text');
        
        if (errorDiv && errorText) {
            errorText.textContent = message;
            errorDiv.style.display = 'block';
            this.addLogEntry(`Error: ${message}`, 'error');
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