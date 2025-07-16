document.addEventListener('DOMContentLoaded', async () => {
    const companyList = document.getElementById('company-list');
    const errorMessage = document.getElementById('error-message');

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
            const res = await fetch('/api/company/files');
            if (!res.ok) {
                throw new Error('Failed to fetch company files.');
            }
            const companies = await res.json();
            renderCompanyFiles(companies);
        } catch (error) {
            errorMessage.textContent = error.message;
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
            
            window.location.href = `/public/company-file.html?id=${companyId}`;
        } catch (error) {
            errorMessage.textContent = error.message;
        }
    }

    fetchCompanyFiles();
});
