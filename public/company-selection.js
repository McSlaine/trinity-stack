document.addEventListener('DOMContentLoaded', async () => {
    const companyList = document.getElementById('company-list');
    const errorMessage = document.getElementById('error-message');

    // Check if we're in OAuth bypass mode
    const urlParams = new URLSearchParams(window.location.search);
    const isOAuthBypass = urlParams.get('oauth_bypass') === 'true';

    // Create year selection modal HTML
    const yearSelectionModal = `
        <div id="year-selection-modal" style="display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background-color: rgba(0,0,0,0.5); z-index: 1000;">
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: white; padding: 30px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h3 style="margin-bottom: 20px;">Select Historical Data Range</h3>
                <p style="margin-bottom: 15px;">How many years of historical data would you like to sync?</p>
                <select id="historical-years" style="width: 100%; padding: 10px; margin-bottom: 20px; border: 1px solid #ddd; border-radius: 4px;">
                    <option value="0.25">3 Months</option>
                    <option value="0.5">6 Months</option>
                    <option value="1" selected>1 Year (Recommended)</option>
                    <option value="2">2 Years</option>
                    <option value="3">3 Years</option>
                </select>
                <div style="display: flex; gap: 10px; justify-content: flex-end;">
                    <button id="cancel-year-selection" style="padding: 10px 20px; border: 1px solid #ddd; background: white; border-radius: 4px; cursor: pointer;">Cancel</button>
                    <button id="confirm-year-selection" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 4px; cursor: pointer;">Continue</button>
                </div>
            </div>
        </div>
    `;

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', yearSelectionModal);

    async function fetchCompanyFiles() {
        try {
            console.log('🔍 Attempting to fetch company files...');
            
            // Try authenticated endpoint first
            let response;
            try {
                response = await fetch('/api/company/files');
                console.log('📡 Response status:', response.status);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (authError) {
                console.log('❌ Authenticated endpoint failed:', authError.message);
                
                // If OAuth bypass mode, try mock endpoint
                if (isOAuthBypass) {
                    console.log('🎯 OAuth bypass mode detected, trying mock endpoint...');
                    response = await fetch('/api/company/files-mock');
                    
                    if (!response.ok) {
                        throw new Error(`Mock endpoint failed: HTTP ${response.status}`);
                    }
                    
                    // Add bypass notice to the page
                    const notice = document.createElement('div');
                    notice.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; color: #856404; padding: 10px; border-radius: 5px; margin-bottom: 15px;';
                    notice.innerHTML = '⚠️ <strong>OAuth Bypass Mode:</strong> Using demo data due to OAuth interception. Core functionality is working!';
                    companyList.parentNode.insertBefore(notice, companyList);
                } else {
                    throw authError;
                }
            }

            const data = await response.json();
            console.log('✅ Company files received:', data);

            if (!data || data.length === 0) {
                throw new Error('No company files available');
            }

            // Clear any existing content
            companyList.innerHTML = '';
            errorMessage.textContent = '';

            // Display company files
            data.forEach(file => {
                const fileElement = document.createElement('div');
                fileElement.style.cssText = 'border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px; cursor: pointer; transition: background-color 0.2s;';
                fileElement.innerHTML = `
                    <h3 style="margin: 0 0 5px 0; color: #333;">${file.name}</h3>
                    <p style="margin: 0; color: #666; font-size: 0.9em;">
                        Country: ${file.country || 'N/A'} | 
                        Status: ${file.last_sync_status || 'Ready'} |
                        ID: ${file.myob_uid}
                    </p>
                `;

                fileElement.addEventListener('mouseenter', () => {
                    fileElement.style.backgroundColor = '#f8f9fa';
                });

                fileElement.addEventListener('mouseleave', () => {
                    fileElement.style.backgroundColor = 'white';
                });

                fileElement.addEventListener('click', () => {
                    showYearSelection(file);
                });

                companyList.appendChild(fileElement);
            });

        } catch (error) {
            console.error('❌ Error fetching company files:', error);
            errorMessage.textContent = `Failed to fetch company files: ${error.message}`;
            
            // Show additional debug info in bypass mode
            if (isOAuthBypass) {
                errorMessage.innerHTML += '<br><small>Debug: OAuth bypass mode active, but both endpoints failed. Check server logs.</small>';
            }
        }
    }

    function renderCompanyFiles(companies) {
        if (!companies || companies.length === 0) {
            companyList.innerHTML = '<p>No company files found.</p>';
            return;
        }

        const ul = document.createElement('ul');
        companies.forEach(company => {
            const li = document.createElement('li');
            const button = document.createElement('button');
            button.textContent = company.name;
            button.addEventListener('click', () => showYearSelection(company));
            li.appendChild(button);
            ul.appendChild(li);
        });
        companyList.appendChild(ul);
    }

    function showYearSelection(company) {
        const modal = document.getElementById('year-selection-modal');
        const confirmBtn = document.getElementById('confirm-year-selection');
        const cancelBtn = document.getElementById('cancel-year-selection');
        
        modal.style.display = 'block';
        
        // Remove previous listeners to avoid duplicates
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        const newCancelBtn = cancelBtn.cloneNode(true);
        cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
        
        newConfirmBtn.addEventListener('click', () => {
            const years = document.getElementById('historical-years').value;
            modal.style.display = 'none';
            selectCompany(company.myob_uid, years);
        });
        
        newCancelBtn.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }

    async function selectCompany(companyId, years) {
        try {
            const res = await fetch('/auth/select-company', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ companyId, historicalYears: years }),
            });

            if (!res.ok) {
                throw new Error('Failed to select company file.');
            }

            // Store the years selection in sessionStorage for use on the next page
            sessionStorage.setItem('historicalYears', years);
            
            window.location.href = `/company-file.html?id=${companyId}`;
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }

    fetchCompanyFiles();
});
