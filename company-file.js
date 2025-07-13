document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('id');

    // --- DOM Elements ---
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

    // --- Utility Functions ---
    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(amount || 0);
    };

    const setText = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = text;
    };

    // --- Data Rendering ---
    function renderDashboard(data) {
        // Up Next
        setText('overdue-invoices-count', data.overdue_invoices.count || 0);
        setText('overdue-bills-count', data.overdue_bills.count || 0);

        // Your Business
        setText('income-total', formatCurrency(data.income_3m.total));
        setText('expenses-total', formatCurrency(data.expenses_3m.total));

        // Financial Position
        setText('net-profit-fy', formatCurrency(data.financial_position.net_profit));
        setText('income-fy', formatCurrency(data.financial_position.income));
        setText('expenses-fy', formatCurrency(data.financial_position.expenses));

        // Bank Balances
        const bankAccountsList = document.getElementById('bank-accounts-list');
        if (bankAccountsList) {
            bankAccountsList.innerHTML = data.bank_accounts.map(acc => `
                <div class="list-item">
                    <span>${acc.name}</span>
                    <span>${formatCurrency(acc.current_balance)}</span>
                </div>
            `).join('') || '<p>No bank accounts found.</p>';
        }

        // GST
        setText('gst-to-pay', formatCurrency(data.gst.to_pay));
        setText('gst-collected', formatCurrency(data.gst.collected));
        setText('gst-paid', formatCurrency(data.gst.paid));
        
        // Overdue Invoices
        setText('overdue-invoices-total', formatCurrency(data.overdue_invoices.total));
        
        mainContent.style.display = 'block';
        chatInterface.style.display = 'block';
    }

    // --- Main Logic ---
    async function loadDashboard() {
        try {
            const syncResponse = await fetch(`/api/company-file/${companyId}/sync`, { method: 'POST' });

            if (syncResponse.status === 202) {
                syncStatusEl.textContent = 'Syncing data...';
                await pollForSyncCompletion();
            } else if (syncResponse.status !== 200) {
                throw new Error('Failed to initiate data sync.');
            }
            
            const [companyDetailsRes, dashboardDataRes] = await Promise.all([
                fetch(`/api/company-file/${companyId}`),
                fetch(`/api/company-file/${companyId}/dashboard-summary`)
            ]);

            if (!companyDetailsRes.ok || !dashboardDataRes.ok) {
                throw new Error('Failed to fetch dashboard data from the server.');
            }

            const companyDetails = await companyDetailsRes.json();
            const dashboardData = await dashboardDataRes.json();

            companyNameEl.textContent = companyDetails.name || 'Company Dashboard';
            renderDashboard(dashboardData);

        } catch (error) {
            console.error('Dashboard Error:', error);
            errorMessage.textContent = `Error loading dashboard: ${error.message}`;
        } finally {
            progressContainer.style.display = 'none';
        }
    }
    
    async function pollForSyncCompletion() {
        return new Promise((resolve, reject) => {
            const pollInterval = setInterval(async () => {
                try {
                    const res = await fetch(`/api/company-file/${companyId}/sync-status`);
                    if (!res.ok) throw new Error('Sync status check failed.');
                    
                    const status = await res.json();
                    syncStatusEl.textContent = `Syncing... ${status.processed_items} of ${status.total_items} items.`;

                    if (status.status === 'Completed') {
                        clearInterval(pollInterval);
                        resolve();
                    } else if (status.status === 'Failed') {
                        clearInterval(pollInterval);
                        throw new Error('Data synchronization failed.');
                    }
                } catch (error) {
                    clearInterval(pollInterval);
                    reject(error);
                }
            }, 2000);
        });
    }

    loadDashboard();
    
    // --- Chat Logic ---
    const chatWindow = document.getElementById('chat-window');
    const chatInput = document.getElementById('chat-input');
    const sendBtn = document.getElementById('send-btn');
    const history = [{ role: 'system', content: 'You are a business-coach assistant. Use the provided data to answer questions.' }];

    sendBtn.addEventListener('click', async () => {
        const userMsg = chatInput.value;
        if (!userMsg) return;

        history.push({ role: 'user', content: userMsg });
        chatWindow.innerHTML += `<div class="chat-message user">${userMsg}</div>`;
        chatInput.value = '';
        chatWindow.scrollTop = chatWindow.scrollHeight;

        const thinkingEl = document.createElement('div');
        thinkingEl.classList.add('chat-message', 'ai', 'thinking');
        thinkingEl.textContent = '...';
        chatWindow.appendChild(thinkingEl);
        chatWindow.scrollTop = chatWindow.scrollHeight;

        try {
            const res = await fetch('/chat', {
                method: 'POST', headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ messages: history, companyId: companyId })
            });
            if (!res.ok) throw new Error('Failed to get response from AI.');

            const { reply } = await res.json();
            history.push(reply);
            
            thinkingEl.remove();
            chatWindow.innerHTML += `<div class="chat-message ai">${reply.content}</div>`;
            chatWindow.scrollTop = chatWindow.scrollHeight;
        } catch (error) {
            thinkingEl.remove();
            chatWindow.innerHTML += `<div class="chat-message ai error">Sorry, I couldn't get a response. Please try again.</div>`;
            console.error("Chat error:", error);
        }
    });
});
