const refreshBtn = document.getElementById('refresh-btn');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const filesBody = document.getElementById('files-body');
const filesTable = document.getElementById('files-table');

function normalizeFile(file) {
  // Accept both backend-normalized and raw MYOB fields
  return {
    id: file.myob_uid || file.Id, // Use myob_uid
    name: file.name || file.Name,
    last_sync_status: file.last_sync_status || 'Never',
    last_sync_timestamp: file.last_sync_timestamp
  };
}

async function loadCompanyFiles() {
  try {
    if (!errorMessage || !loader || !filesBody) return;
    errorMessage.textContent = "";
    loader.style.display = "block";
    filesBody.innerHTML = "<tr><td colspan='4'>Loading company files...</td></tr>";
    
    const response = await fetch('/api/company-files');
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch company files: ${errorText}`);
    }
    const data = await response.json();
    
    console.log("Data received:", data);
    loader.style.display = "none";
    filesBody.innerHTML = "";
    
    if (data && Array.isArray(data) && data.length > 0) {
      const thead = filesTable && filesTable.querySelector ? filesTable.querySelector('thead') : null;
      if (thead) {
        thead.innerHTML = `
          <tr>
            <th>Name</th>
            <th>Last Synced</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        `;
      }
      data.forEach(fileRaw => {
        const file = normalizeFile(fileRaw);
        const tr = document.createElement('tr');
        const lastSyncDate = file.last_sync_timestamp ? new Date(file.last_sync_timestamp).toLocaleString() : 'Never';
        tr.innerHTML = `
          <td>${file.name || 'N/A'}</td>
          <td>${lastSyncDate}</td>
          <td id="status-${file.id}">
            <div class="progress-container" style="display: none;">
              <div class="progress-status-text">Not Synced</div>
              <div class="progress-bar-wrapper">
                <div class="progress-bar-fill"></div>
                <div class="progress-bar-label">0 / 0 (0%)</div>
              </div>
            </div>
            <span class="status-text">${file.last_sync_status}</span>
          </td>
          <td>
            <a href="/public/company-file.html?id=${file.id}" target="_blank">View Dashboard</a>
            <button id="sync-btn-${file.id}" class="sync-btn">Sync Now</button>
          </td>
        `;
        filesBody.appendChild(tr);
        
        const syncBtn = document.getElementById(`sync-btn-${file.id}`);
        if (syncBtn) {
          syncBtn.addEventListener('click', () => startSync(file.id));
        }
      });
    } else {
      filesBody.innerHTML = `<tr><td colspan="4">No company files found. <a href="/login">Login to MYOB</a></td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching company files:', error);
    if (loader) loader.style.display = "none";
    if (errorMessage && filesBody) {
      errorMessage.textContent = `Error loading company files: ${error.message}`;
      filesBody.innerHTML = `<tr><td colspan="4">Error loading company files.</td></tr>`;
    }
  }
}

async function startSync(fileId) {
    const statusCell = document.getElementById(`status-${fileId}`);
    const syncBtn = document.getElementById(`sync-btn-${fileId}`);
    const progressContainer = statusCell.querySelector('.progress-container');
    const statusText = statusCell.querySelector('.status-text');

    if (syncBtn) syncBtn.disabled = true;
    if (statusText) statusText.style.display = 'none';
    if (progressContainer) progressContainer.style.display = 'block';

    updateProgressBar(fileId, 0, 0, 'Queued...');

    try {
        // Get historical years from sessionStorage (set during company selection)
        const historicalYears = sessionStorage.getItem('historicalYears') || '1';
        
        // Calculate date range based on years selection
        const endDate = new Date();
        const startDate = new Date();
        
        if (historicalYears === 'all') {
            // For 'all', we'll set a very old start date
            startDate.setFullYear(2000, 0, 1);
        } else {
            const years = parseFloat(historicalYears);
            if (years < 1) {
                // For fractional years (months)
                const months = Math.round(years * 12);
                startDate.setMonth(endDate.getMonth() - months);
            } else {
                startDate.setFullYear(endDate.getFullYear() - Math.floor(years));
            }
        }
        
        const formatDate = (date) => date.toISOString().split('T')[0];
        
        const response = await fetch(`/api/sync/${fileId}`, { 
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                historicalYears: historicalYears
            })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to start sync: ${errorText}`);
        }
        pollSyncStatus(fileId);
    } catch (error) {
        console.error('Error starting sync:', error);
        updateProgressBar(fileId, 0, 0, 'Failed');
        if (syncBtn) syncBtn.disabled = false;
    }
}

function updateProgressBar(fileId, processed, total, status) {
    const statusCell = document.getElementById(`status-${fileId}`);
    if (!statusCell) return;

    const container = statusCell.querySelector('.progress-container');
    const statusEl = container.querySelector('.progress-status-text');
    const fillEl = container.querySelector('.progress-bar-fill');
    const labelEl = container.querySelector('.progress-bar-label');

    if (!container.style.display || container.style.display === 'none') {
        container.style.display = 'block';
        const textStatus = statusCell.querySelector('.status-text');
        if (textStatus) textStatus.style.display = 'none';
    }
    
    const percentage = total > 0 ? Math.round((processed / total) * 100) : 0;
    
    fillEl.style.width = `${percentage}%`;
    labelEl.textContent = `${processed} / ${total} (${percentage}%)`;

    fillEl.classList.remove('failed', 'completed');

    switch (status) {
        case 'Completed':
            statusEl.textContent = '✅ Sync Complete';
            fillEl.classList.add('completed');
            break;
        case 'Completed with errors':
            statusEl.textContent = '⚠️ Sync Complete with errors';
            fillEl.classList.add('completed');
            break;
        case 'Failed':
            statusEl.textContent = '❌ Sync Failed';
            fillEl.classList.add('failed');
            break;
        case 'In Progress':
        case 'Syncing':
             statusEl.textContent = `Syncing (${processed}/${total})...`;
            break;
        default:
            statusEl.textContent = status;
            break;
    }
}

function pollSyncStatus(fileId) {
    const syncBtn = document.getElementById(`sync-btn-${fileId}`);
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`/api/sync/status/${fileId}`);
            if (!res.ok) {
                // Stop polling on server errors like 404, 500
                throw new Error(`Server returned ${res.status}`);
            }
            const data = await res.json();
            updateProgressBar(fileId, data.processed_items, data.total_items, data.status);

            if (data.status === 'Completed' || data.status === 'Completed with errors' || data.status === 'Failed') {
                clearInterval(interval);
                if(syncBtn) syncBtn.disabled = false;
            }
        } catch (err) {
            // This catches network errors or the thrown server error
            console.warn("Error polling sync status:", err.message);
            updateProgressBar(fileId, 0, 0, 'Connection Lost');
            clearInterval(interval); // Stop polling on error
            if(syncBtn) syncBtn.disabled = false;
        }
    }, 2000);
}

function initializeChat() { console.log("Chat placeholder"); }

if (refreshBtn) refreshBtn.addEventListener('click', loadCompanyFiles);
document.addEventListener('DOMContentLoaded', () => {
    loadCompanyFiles();
    initializeChat(); // Initialize chat for the general dashboard
});
