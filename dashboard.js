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
  };
}

async function loadCompanyFiles() {
  try {
    if (!errorMessage || !loader || !filesBody) return;
    errorMessage.textContent = "";
    loader.style.display = "block";
    filesBody.innerHTML = "<tr><td colspan='3'>Loading company files...</td></tr>";
    
    const response = await fetch('/company-files');
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
            <th>ID</th>
            <th>Name</th>
            <th>Actions</th>
          </tr>
        `;
      }
      data.forEach(fileRaw => {
        const file = normalizeFile(fileRaw);
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td>${file.id || 'N/A'}</td>
          <td>${file.name || 'N/A'}</td>
          <td>${file.id ? `<a href="/company-file.html?id=${file.id}" target="_blank">View File</a>` : 'N/A'}</td>
        `;
        filesBody.appendChild(tr);
      });
    } else {
      filesBody.innerHTML = `<tr><td colspan="3">No company files found.</td></tr>`;
    }
  } catch (error) {
    console.error('Error fetching company files:', error);
    if (loader) loader.style.display = "none";
    if (errorMessage && filesBody) {
      errorMessage.textContent = `Error loading company files: ${error.message}`;
      filesBody.innerHTML = `<tr><td colspan="3">Error loading company files.</td></tr>`;
    }
  }
}

if (refreshBtn) refreshBtn.addEventListener('click', loadCompanyFiles);
document.addEventListener('DOMContentLoaded', loadCompanyFiles);
