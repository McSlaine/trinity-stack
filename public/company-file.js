document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('id');

    const companyNameEl = document.getElementById('company-name');
    const errorMessage = document.getElementById('error-message');
    const mainContent = document.getElementById('main-content');
    const chatInterface = document.getElementById('chat-interface');
    const progressContainer = document.getElementById('progress-container');
    let syncStatusDisplay = null;
    
    // Setup retry listeners for enhanced error handling
    window.addEventListener('errorRetry', async (event) => {
        const { context, attempt } = event.detail;
        console.log(`Retrying ${context}, attempt ${attempt}`);
        
        if (context.includes('sync')) {
            await startSync();
        } else if (context.includes('dashboard')) {
            await loadDashboard();
        }
    });
    
    // Chart instances
    let incomeChart = null;
    let expensesChart = null;
    let profitChart = null;
    let gstChart = null;
    let pnlChart = null;

    if (!companyId) {
        errorHandler.handleError(
            'No company file ID provided in URL',
            'Dashboard initialization',
            { allowRetry: false }
        );
        return;
    }

    const formatCurrency = (amount) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount || 0);
    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // Initialize Chart.js charts
    const initializeCharts = () => {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: {
                        color: '#f1f5f9'
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 10
                        }
                    }
                },
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        color: '#64748b',
                        font: {
                            size: 10
                        }
                    }
                }
            }
        };

        // Income Chart
        const incomeCtx = document.getElementById('income-chart')?.getContext('2d');
        if (incomeCtx) {
            incomeChart = new Chart(incomeCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar'],
                    datasets: [{
                        data: [0, 0, 0],
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: chartOptions
            });
        }

        // Expenses Chart
        const expensesCtx = document.getElementById('expenses-chart')?.getContext('2d');
        if (expensesCtx) {
            expensesChart = new Chart(expensesCtx, {
                type: 'line',
                data: {
                    labels: ['Jan', 'Feb', 'Mar'],
                    datasets: [{
                        data: [0, 0, 0],
                        borderColor: '#dc2626',
                        backgroundColor: 'rgba(220, 38, 38, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: chartOptions
            });
        }

        // Profit Chart
        const profitCtx = document.getElementById('profit-chart')?.getContext('2d');
        if (profitCtx) {
            profitChart = new Chart(profitCtx, {
                type: 'bar',
                data: {
                    labels: ['Income', 'Expenses'],
                    datasets: [{
                        data: [0, 0],
                        backgroundColor: ['#059669', '#dc2626'],
                        borderRadius: 4
                    }]
                },
                options: chartOptions
            });
        }

        // GST Chart
        const gstCtx = document.getElementById('gst-chart')?.getContext('2d');
        if (gstCtx) {
            gstChart = new Chart(gstCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Collected', 'Paid', 'To Pay'],
                    datasets: [{
                        data: [0, 0, 0],
                        backgroundColor: ['#2563eb', '#059669', '#d97706'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                usePointStyle: true,
                                font: {
                                    size: 10
                                }
                            }
                        }
                    }
                }
            });
        }

        // P&L Chart
        const pnlCtx = document.getElementById('pnl-chart')?.getContext('2d');
        if (pnlCtx) {
            pnlChart = new Chart(pnlCtx, {
                type: 'bar',
                data: {
                    labels: ['Income', 'Cost of Sales', 'Gross Profit', 'Net Profit'],
                    datasets: [{
                        data: [0, 0, 0, 0],
                        backgroundColor: ['#059669', '#dc2626', '#2563eb', '#d97706'],
                        borderRadius: 4
                    }]
                },
                options: chartOptions
            });
        }
    };

    // Generate business insights based on financial data
    const generateBusinessInsights = (data) => {
        const insights = [];
        const overdueAmount = parseFloat(data.overdue_invoices.total) || 0;
        const income3m = parseFloat(data.income_3m.total) || 0;
        const expenses3m = parseFloat(data.expenses_3m.total) || 0;
        const netCashFlow = income3m - expenses3m;

        // Cash flow insights
        if (netCashFlow > 0) {
            insights.push({
                icon: 'fas fa-arrow-up',
                text: `Positive cash flow of ${formatCurrency(netCashFlow)} indicates healthy business operations`,
                type: 'success'
            });
        } else if (netCashFlow < 0) {
            insights.push({
                icon: 'fas fa-exclamation-triangle',
                text: `Negative cash flow of ${formatCurrency(Math.abs(netCashFlow))} requires immediate attention`,
                type: 'warning'
            });
        }

        // Overdue invoices insights
        if (overdueAmount > 0) {
            if (overdueAmount > income3m * 0.1) {
                insights.push({
                    icon: 'fas fa-clock',
                    text: 'Overdue invoices exceed 10% of quarterly income - consider improving collection processes',
                    type: 'warning'
                });
            }
            insights.push({
                icon: 'fas fa-paper-plane',
                text: 'Send automated payment reminders to reduce overdue amounts',
                type: 'action'
            });
        }

        // Expense management insights
        if (expenses3m > income3m * 0.8) {
            insights.push({
                icon: 'fas fa-chart-pie',
                text: 'Expenses are high relative to income - review cost optimization opportunities',
                type: 'warning'
            });
        }

        // Growth insights
        if (income3m > 0 && netCashFlow > income3m * 0.2) {
            insights.push({
                icon: 'fas fa-rocket',
                text: 'Strong profit margins detected - consider growth investments or expansion',
                type: 'success'
            });
        }

        return insights;
    };

    // Update business insights display
    const updateBusinessInsights = (data) => {
        const insightsContainer = document.getElementById('ai-insights');
        if (!insightsContainer) return;

        const insights = generateBusinessInsights(data);
        
        if (insights.length === 0) {
            insightsContainer.innerHTML = `
                <div class="insight-item">
                    <i class="fas fa-info-circle"></i>
                    <span>Your financial data looks stable. Continue monitoring your cash flow trends.</span>
                </div>
            `;
            return;
        }

        insightsContainer.innerHTML = insights.map(insight => `
            <div class="insight-item">
                <i class="${insight.icon}" style="color: ${insight.type === 'success' ? '#059669' : insight.type === 'warning' ? '#d97706' : '#2563eb'};"></i>
                <span>${insight.text}</span>
            </div>
        `).join('');
    };

    // Update chart data
    const updateCharts = (data) => {
        const income3m = parseFloat(data.income_3m.total) || 0;
        const expenses3m = parseFloat(data.expenses_3m.total) || 0;
        const gstCollected = parseFloat(data.gst_collected) || 0;
        const gstPaid = parseFloat(data.gst_paid) || 0;
        const gstToPay = parseFloat(data.gst_to_pay) || 0;

        // Generate sample monthly data for trends
        const monthlyIncome = [
            income3m * 0.3,
            income3m * 0.35,
            income3m * 0.35
        ];
        
        const monthlyExpenses = [
            expenses3m * 0.32,
            expenses3m * 0.33,
            expenses3m * 0.35
        ];

        // Update Income Chart
        if (incomeChart) {
            incomeChart.data.datasets[0].data = monthlyIncome;
            incomeChart.update();
        }

        // Update Expenses Chart
        if (expensesChart) {
            expensesChart.data.datasets[0].data = monthlyExpenses;
            expensesChart.update();
        }

        // Update Profit Chart
        if (profitChart) {
            profitChart.data.datasets[0].data = [income3m, expenses3m];
            profitChart.update();
        }

        // Update GST Chart
        if (gstChart && (gstCollected > 0 || gstPaid > 0 || gstToPay > 0)) {
            gstChart.data.datasets[0].data = [gstCollected, gstPaid, gstToPay];
            gstChart.update();
        }
    };

    // Update P&L chart
    const updatePnlChart = (pnlData) => {
        if (!pnlChart || !pnlData?.AccountsBreakdown) return;

        const findValue = (name) => {
            const account = pnlData.AccountsBreakdown.find(a => a.Account.Name === name);
            return Math.abs(account ? account.AccountTotal : 0);
        };

        const totalIncome = findValue('Customer Sales') + findValue('Rental Income') + findValue('Freight Collected');
        const costOfSales = findValue('Goods Purchased');
        const grossProfit = totalIncome - costOfSales;
        const netProfitSection = pnlData.AccountsBreakdown.find(a => a.Account.Name === 'Net Profit/(Loss)');
        const netProfit = netProfitSection ? Math.abs(netProfitSection.AccountTotal) : Math.abs(grossProfit);

        pnlChart.data.datasets[0].data = [totalIncome, costOfSales, grossProfit, netProfit];
        pnlChart.update();
    };

    // Add sync button handler
    const syncBtn = document.getElementById('sync-btn');
    if (syncBtn) {
        syncBtn.addEventListener('click', async () => {
            await startSync();
        });
    }

    async function startSync() {
        try {
            // Hide main content and show sync status
            mainContent.style.display = 'none';
            chatInterface.style.display = 'none';
            progressContainer.style.display = 'block';
            
            // Create and show sync status display
            syncStatusDisplay = new SyncStatusDisplay(companyId);
            progressContainer.innerHTML = '';
            progressContainer.appendChild(syncStatusDisplay.create());
            
            // Get historical years from sessionStorage
            const historicalYears = sessionStorage.getItem('historicalYears') || '1';
            
            // Calculate date range with bulletproof date arithmetic
            const endDate = new Date();
            let startDate;
            
            const years = parseFloat(historicalYears);
            if (years === 0.25) {
                // 3 months
                startDate = new Date(endDate.getTime() - (90 * 24 * 60 * 60 * 1000));
            } else if (years === 0.5) {
                // 6 months  
                startDate = new Date(endDate.getTime() - (180 * 24 * 60 * 60 * 1000));
            } else if (years === 1) {
                // 1 year
                startDate = new Date(endDate.getTime() - (365 * 24 * 60 * 60 * 1000));
            } else if (years === 2) {
                // 2 years
                startDate = new Date(endDate.getTime() - (730 * 24 * 60 * 60 * 1000));
            } else {
                // Default to 1 year
                startDate = new Date(endDate.getTime() - (365 * 24 * 60 * 60 * 1000));
            }
            
            const formatDate = (date) => date.toISOString().split('T')[0];
            
            console.log('Starting sync with date range:', {
                startDate: formatDate(startDate),
                endDate: formatDate(endDate),
                historicalYears: years
            });
            
            const response = await fetch(`/api/sync/${companyId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    startDate: formatDate(startDate), 
                    endDate: formatDate(endDate),
                    historicalYears: years
                })
            });
            
            if (!response.ok) {
                throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
            }
            
            const result = await response.json();
            console.log('Sync completed:', result);
            
            // After successful sync, reload the dashboard
            await loadDashboard();
            
        } catch (error) {
            await errorHandler.handleError(error, 'Data synchronization', {
                allowRetry: true,
                showNotification: true
            });
            
            progressContainer.innerHTML = `
                <div class="error-container">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc2626; margin-bottom: 16px;"></i>
                    <h3>Sync Failed</h3>
                    <p>Data synchronization encountered an error. Please check the notification for details.</p>
                    <button onclick="startSync()" class="sync-button" style="margin-top: 16px;">
                        <i class="fas fa-redo"></i> Try Again
                    </button>
                </div>
            `;
        }
    }

    function renderDashboard(data) {
        console.log('Rendering dashboard with data:', data);

        // Update main financial metrics
        setText('overdue-invoices-count', data.overdue_invoices.count || 0);
        setText('overdue-bills-count', data.overdue_bills.count || 0);
        setText('income-total', data.income_3m.total || '$0.00');
        setText('expenses-total', data.expenses_3m.total || '$0.00');
        
        // Calculate and display net cash flow
        const income = parseFloat(data.income_3m.total) || 0;
        const expenses = parseFloat(data.expenses_3m.total) || 0;
        const netCashFlow = income - expenses;
        setText('net-cash-flow', formatCurrency(netCashFlow));
        
        // Update financial year data
        setText('income-fy', data.income_fy?.total || '$0.00');
        setText('expenses-fy', data.expenses_fy?.total || '$0.00');
        
        const incomeFy = parseFloat(data.income_fy?.total) || 0;
        const expensesFy = parseFloat(data.expenses_fy?.total) || 0;
        const netProfitFy = incomeFy - expensesFy;
        setText('net-profit-fy', formatCurrency(netProfitFy));
        
        // Update GST information
        setText('gst-collected', data.gst_collected || '$0.00');
        setText('gst-paid', data.gst_paid || '$0.00');
        setText('gst-to-pay', data.gst_to_pay || '$0.00');
        
        // Update overdue invoices
        setText('overdue-invoices-total', data.overdue_invoices.total || '$0.00');

        // Update charts with new data
        updateCharts(data);
        
        // Generate and display business insights
        updateBusinessInsights(data);

        // Apply color coding based on values
        const netCashFlowEl = document.getElementById('net-cash-flow');
        if (netCashFlowEl) {
            netCashFlowEl.className = 'card-main-value ' + (netCashFlow >= 0 ? 'success' : 'danger');
        }

        const netProfitFyEl = document.getElementById('net-profit-fy');
        if (netProfitFyEl) {
            netProfitFyEl.className = 'card-main-value ' + (netProfitFy >= 0 ? 'success' : 'danger');
        }
    }

    function renderPnl(pnlData) {
        if (!pnlData || !pnlData.AccountsBreakdown) {
            console.log('No P&L data available');
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

        // Update P&L chart
        updatePnlChart(pnlData);
    }

    // --- Main Logic ---
    async function loadDashboard() {
        try {
            progressContainer.style.display = 'block';
            progressContainer.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Loading your financial dashboard...</p>
            `;

            // Initialize charts first
            initializeCharts();

            const [companyDetailsRes, dashboardDataRes, pnlRes] = await Promise.all([
                errorHandler.fetch(`/api/company/${companyId}`, { 
                    context: 'Fetching company details',
                    timeout: 15000 
                }),
                errorHandler.fetch(`/api/company/${companyId}/dashboard-summary`, { 
                    context: 'Fetching dashboard data',
                    timeout: 15000 
                }),
                errorHandler.fetch(`/api/company/${companyId}/profit-and-loss`, { 
                    context: 'Fetching profit & loss data',
                    timeout: 15000 
                })
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
            
            // Show success notification
            errorHandler.showSuccess('Dashboard loaded successfully with your latest financial data.');

        } catch (error) {
            await errorHandler.handleError(error, 'Dashboard loading', {
                allowRetry: true,
                showNotification: true
            });
            
            progressContainer.innerHTML = `
                <div class="error-container" style="text-align: center;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 2rem; color: #dc2626; margin-bottom: 16px;"></i>
                    <h3>Unable to Load Dashboard</h3>
                    <p>We're having trouble loading your financial data. Please check the notification for details and retry options.</p>
                    <button onclick="loadDashboard()" class="sync-button" style="margin-top: 16px;">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        } finally {
            progressContainer.style.display = 'none';
        }
    }

    loadDashboard();
    initializeChat(companyId); // Initialize chat with the specific company ID
});