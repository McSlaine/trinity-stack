const refreshBtn = document.getElementById('refresh-btn');
const loader = document.getElementById('loader');
const errorMessage = document.getElementById('error-message');
const filesBody = document.getElementById('files-body');
const filesTable = document.getElementById('files-table');

function normalizeFile(file) {
  // Accept both backend-normalized and raw MYOB fields
  return {
    id: file.id || file.Id,
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
      const errText = await response.text();
      throw new Error(`Network response was not ok: ${response.statusText} - ${errText}`);
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
          <td id="status-${file.id}">${file.last_sync_status}</td>
          <td>
            <a href="/company-file.html?id=${file.id}" target="_blank">View Dashboard</a>
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
      filesBody.innerHTML = `<tr><td colspan="4">No company files found. <a href="/api/login">Login to MYOB</a></td></tr>`;
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
    if (statusCell) {
        statusCell.innerHTML = 'Syncing...';
    }

    try {
        const response = await fetch(`/api/sync/${fileId}`, { method: 'POST' });
        if (!response.ok) {
            throw new Error('Failed to start sync.');
        }
        pollSyncStatus(fileId);
    } catch (error) {
        console.error('Error starting sync:', error);
        if (statusCell) {
            statusCell.innerHTML = '<span class="error">Sync failed</span>';
        }
    }
}

function pollSyncStatus(fileId) {
    const statusCell = document.getElementById(`status-${fileId}`);
    const interval = setInterval(async () => {
        try {
            const response = await fetch(`/api/sync/status/${fileId}`);
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`Server returned ${response.status}: ${errorText}`);
            }
            const data = await response.json();
            if (statusCell) {
                let statusText = data.status || 'Unknown';
                if (data.details) {
                    statusText += ` <span class="tooltip" title="${data.details}">(i)</span>`;
                } else {
                    statusText += ` (${data.processed_items || 0}/${data.total_items || 0})`;
                }
                statusCell.innerHTML = statusText;
            }
            if (data.status === 'Completed' || data.status === 'Completed with errors' || data.status === 'Failed') {
                clearInterval(interval);
                if (data.status === 'Failed') {
                    statusCell.innerHTML = `<span class="error">Sync failed</span>`;
                    if (data.details) {
                         statusCell.innerHTML += ` <span class="tooltip" title="${data.details}">(i)</span>`;
                    }
                } else {
                    statusCell.textContent = 'Sync Complete';
                }
            }
        } catch (error) {
            clearInterval(interval);
            console.error('Error polling sync status:', error);
            if (statusCell) {
                statusCell.innerHTML = '<span class="error">Polling failed</span>';
            }
        }
    }, 2000);
}

if (refreshBtn) refreshBtn.addEventListener('click', loadCompanyFiles);
document.addEventListener('DOMContentLoaded', () => {
    loadCompanyFiles();
    initializeChat(); // Initialize chat for the general dashboard
});
