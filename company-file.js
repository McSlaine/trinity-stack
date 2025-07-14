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

        // --- THIS IS THE FIX ---
        // The API returns numbers, not objects with a 'total' property for these fields.
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
        if (!pnlData || !pnlData.AccountsBreakdown || pnlData.AccountsBreakdown.length === 0) {
            console.log('No P&L data to render.');
            return;
        }
        console.log('Rendering P&L with data:', pnlData);

        const findValue = (name) => {
            const account = pnlData.AccountsBreakdown.find(a => a.Account.Name === name);
            return account ? account.AccountTotal : 0;
        };

        // This is a simplified example. A real implementation would need to sum up accounts
        // based on their category (Income, Cost of Sales, Expense) from the Chart of Accounts.
        const totalIncome = findValue('Customer Sales') + findValue('Rental Income') + findValue('Freight Collected');
        const costOfSales = findValue('Goods Purchased');
        const grossProfit = totalIncome - costOfSales;
        
        // A more accurate Net Profit would be to take the value from the report if available
        const netProfitSection = pnlData.AccountsBreakdown.find(a => a.Account.Name === 'Net Profit/(Loss)');
        const netProfit = netProfitSection ? netProfitSection.AccountTotal : pnlData.AccountsBreakdown.reduce((acc, item) => acc + item.AccountTotal, 0);


        setText('pnl-income', formatCurrency(totalIncome));
        setText('pnl-cost-of-sales', formatCurrency(costOfSales));
        setText('pnl-gross-profit', formatCurrency(grossProfit));
        setText('pnl-net-profit', formatCurrency(netProfit));
    }

    // --- Main Logic ---
    async function loadDashboard() {
        try {
            progressContainer.style.display = 'block';
            syncStatusEl.textContent = 'Loading dashboard data...';

            const [companyDetailsRes, dashboardDataRes, pnlRes] = await Promise.all([
                fetch(`/api/company/${companyId}`),
                fetch(`/api/company/${companyId}/dashboard-summary`),
                fetch(`/api/company/${companyId}/profit-and-loss`)
            ]);

            if (!companyDetailsRes.ok || !dashboardDataRes.ok || !pnlRes.ok) {
                throw new Error(`Failed to fetch required dashboard data from the server.`);
            }

            const companyDetails = await companyDetailsRes.json();
            const dashboardData = await dashboardDataRes.json();
            const pnlData = await pnlRes.json();

            companyNameEl.textContent = companyDetails.name || 'Company Dashboard';
            
            renderDashboard(dashboardData);
            renderPnl(pnlData);

            mainContent.style.display = 'block';
            chatInterface.style.display = 'block';

        } catch (error) {
            console.error('Dashboard Error:', error);
            errorMessage.textContent = `Error loading dashboard: ${error.message}`;
        } finally {
            progressContainer.style.display = 'none';
        }
    }

    loadDashboard();
    initializeChat(companyId); // Initialize chat with the specific company ID
});