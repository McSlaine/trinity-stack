document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('id');

    const companyNameEl = document.getElementById('company-name');
    const errorMessage = document.getElementById('error-message');
    const mainContent = document.getElementById('main-content');
    const chatInterface = document.getElementById('chat-interface');
    const progressContainer = document.getElementById('progress-container');
    const syncStatusEl = document.getElementById('sync-status');

    if (!companyId) {
        errorMessage.textContent = 'No company file ID provided.';
        return;
    }

    const formatCurrency = (amount) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount || 0);
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    function renderDashboard(data) {
        if (!data) {
            throw new Error('Dashboard data is missing.');
        }
        console.log('Rendering dashboard with data:', data);

        setText('overdue-invoices-count', data.overdue_invoices?.count || 0);
        setText('overdue-bills-count', data.overdue_bills?.count || 0);
        setText('income-total', formatCurrency(data.income_3m?.total));
        setText('expenses-total', formatCurrency(data.expenses_3m?.total));
        setText('net-profit-fy', formatCurrency(data.financial_position?.net_profit));
        setText('income-fy', formatCurrency(data.financial_position?.income));
        setText('expenses-fy', formatCurrency(data.financial_position?.expenses));
        setText('gst-to-pay', formatCurrency(data.gst?.to_pay));
        setText('gst-collected', formatCurrency(data.gst?.collected));
        setText('gst-paid', formatCurrency(data.gst?.paid));
        setText('overdue-invoices-total', formatCurrency(data.overdue_invoices?.total));

        const bankAccountsList = document.getElementById('bank-accounts-list');
        if (bankAccountsList) {
            bankAccountsList.innerHTML = data.bank_accounts?.map(acc => `
                <div class="list-item">
                    <span>${acc.name}</span>
                    <span>${formatCurrency(acc.current_balance)}</span>
                </div>
            `).join('') || '<p>No bank accounts found.</p>';
        }
    }

    function renderPnl(pnlData) {
        if (!pnlData || pnlData.length === 0) {
            console.log('No P&L data to render.');
            return;
        }
        console.log('Rendering P&L with data:', pnlData);

        const findValue = (name) => {
            const section = pnlData.find(s => s.Title === name);
            return section ? section.Amount : 0;
        };

        setText('pnl-income', formatCurrency(findValue('Total Income')));
        setText('pnl-cost-of-sales', formatCurrency(findValue('Total Cost of Sales')));
        setText('pnl-gross-profit', formatCurrency(findValue('Gross Profit')));
        setText('pnl-net-profit', formatCurrency(findValue('Net Profit/(Loss)')));
    }

    // --- Main Logic ---
    async function loadDashboard() {
        try {
            console.log('--- Starting Dashboard Load ---');
            
            const statusRes = await fetch(`/api/company-file/${companyId}/sync-status`);
            let statusData = await statusRes.json();
            console.log('Initial sync status:', statusData);

            if (statusData.status === 'Syncing' || statusData.status === 'Starting') {
                console.log('Sync in progress, starting to poll...');
                await pollForSyncCompletion();
                console.log('Polling complete.');
            } else {
                console.log('No sync in progress, attempting to trigger a new one.');
                const syncResponse = await fetch(`/api/company-file/${companyId}/sync`, { method: 'POST' });
                if (syncResponse.status === 202) {
                    console.log('New sync triggered, starting to poll...');
                    await pollForSyncCompletion();
                    console.log('Polling complete.');
                }
            }
            
            console.log('--- Fetching data for dashboard ---');
            const [companyDetailsRes, dashboardDataRes] = await Promise.all([
                fetch(`/api/company-file/${companyId}`),
                fetch(`/api/company-file/${companyId}/dashboard-summary`)
            ]);

            if (!companyDetailsRes.ok || !dashboardDataRes.ok) {
                throw new Error(`Failed to fetch data: CompanyDetails: ${companyDetailsRes.status}, Dashboard: ${dashboardDataRes.status}`);
            }

            const companyDetails = await companyDetailsRes.json();
            const dashboardData = await dashboardDataRes.json();
            
            console.log('--- Data fetched successfully ---');
            console.log('Company Details:', companyDetails);
            console.log('Dashboard Summary:', dashboardData);

            companyNameEl.textContent = companyDetails.name || 'Company Dashboard';
            
            console.log('--- Rendering dashboard ---');
            renderDashboard(dashboardData);
            renderPnl(dashboardData.pnl);
            console.log('--- Dashboard rendered ---');

            mainContent.style.display = 'block';
            chatInterface.style.display = 'block';

        } catch (error) {
            console.error('Dashboard Error:', error);
            errorMessage.textContent = `Error loading dashboard: ${error.message}`;
        } finally {
            progressContainer.style.display = 'none';
        }
    }
    
    async function pollForSyncCompletion() {
        return new Promise((resolve, reject) => {
            let pollCount = 0;
            const maxPolls = 30; // 1 minute timeout
            const pollInterval = setInterval(async () => {
                pollCount++;
                if (pollCount > maxPolls) {
                    clearInterval(pollInterval);
                    return reject(new Error('Sync timed out.'));
                }

                try {
                    const res = await fetch(`/api/company-file/${companyId}/sync-status`);
                    if (!res.ok) return; // Silently ignore failed poll and retry
                    
                    const status = await res.json();
                    syncStatusEl.textContent = `Syncing... ${status.processed_items || 0} of ${status.total_items || 0} items.`;

                    if (status.status === 'Completed' || status.status === 'Completed with errors') {
                        clearInterval(pollInterval);
                        resolve();
                    } else if (status.status === 'Failed') {
                        clearInterval(pollInterval);
                        reject(new Error('Data synchronization failed.'));
                    }
                } catch (error) {
                    // Ignore fetch error and retry
                }
            }, 2000);
        });
    }

    loadDashboard();
    
    // --- Chat Logic ---
    // ... (chat logic remains the same)
});