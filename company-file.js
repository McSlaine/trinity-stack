document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const companyId = urlParams.get('id');

  // Main content and loader elements
  const companyNameEl = document.getElementById('company-name');
  const errorMessage = document.getElementById('error-message');
  const mainContent = document.getElementById('main-content');
  const chatInterface = document.getElementById('chat-interface');

  // Sync status elements
  const syncStatusEl = document.getElementById('sync-status');
  const progressBar = document.getElementById('progress-bar');
  const progressContainer = document.getElementById('progress-container');

  // Null checks for all DOM elements
  if (!companyNameEl || !errorMessage || !mainContent || !chatInterface || !syncStatusEl || !progressBar || !progressContainer) {
    console.error('Missing required DOM elements.');
    return;
  }

  if (!companyId) {
    errorMessage.textContent = 'No company file ID provided.';
    return;
  }

  // --- Data Fetching and Rendering ---

  async function fetchLocalData(resource) {
      const url = `/api/company-file/${companyId}/${resource}`;
      const response = await fetch(url);
      if (!response.ok) {
          throw new Error(`Failed to fetch local ${resource}`);
      }
      return response.json();
  }

  function createTableHTML(items, columns, formatCurrency) {
    let tableHtml = '<table><thead><tr>';
    columns.forEach(col => tableHtml += `<th>${col.header}</th>`);
    tableHtml += '</tr></thead><tbody>';

    items.forEach(item => {
        tableHtml += '<tr>';
        columns.forEach(col => {
            let value = item[col.key];
            if (col.key === 'days_overdue') {
                const dueDate = new Date(item.due_date);
                const now = new Date();
                value = dueDate < now ? Math.ceil(Math.abs(now - dueDate) / (1000 * 60 * 60 * 24)) : 0;
            } else if (col.key.includes('amount') || col.key.includes('due')) {
                value = formatCurrency(value || 0);
            }
            tableHtml += `<td>${value || 'N/A'}</td>`;
        });
        tableHtml += '</tr>';
    });

    tableHtml += '</tbody></table>';
    return { tableHtml };
  }

  function renderTable(elementId, items, columns, totalElementId, formatCurrency, countElementId, showAllBtnId) {
      const element = document.getElementById(elementId);
      const totalElement = document.getElementById(totalElementId);
      const countElement = document.getElementById(countElementId);
      const showAllBtn = document.getElementById(showAllBtnId);

      const sortedItems = [...items].sort((a, b) => new Date(b.date) - new Date(a.date));
      const initialItems = sortedItems.slice(0, 5);
      
      const total = items.reduce((acc, item) => acc + (parseFloat(item.balance_due_amount) || 0), 0);

      const { tableHtml } = createTableHTML(initialItems, columns, formatCurrency);
      element.innerHTML = tableHtml;

      if (totalElement) {
          totalElement.textContent = `Total: ${formatCurrency(total)}`;
      }
      if (countElement) {
          countElement.textContent = `Showing ${initialItems.length} of ${items.length}`;
      }
      if (showAllBtn && items.length > 5) {
          showAllBtn.style.display = 'block';
          showAllBtn.onclick = () => {
              const { tableHtml: fullTableHtml } = createTableHTML(sortedItems, columns, formatCurrency);
              element.innerHTML = fullTableHtml;
              countElement.textContent = `Showing ${items.length} of ${items.length}`;
              showAllBtn.style.display = 'none';
          };
      }
  }

  async function loadDataFromDb() {
      try {
          const [companyDetails, invoices, bills] = await Promise.all([
              fetchLocalData(''), // Now fetches from /api/company-file/:id
              fetchLocalData('invoices'),
              fetchLocalData('bills'),
          ]);

          // Fallback for missing/invalid country
          let currencyCode = 'USD';
          if (companyDetails.country === 'AU') currencyCode = 'AUD';
          else if (companyDetails.country && companyDetails.country.length === 2) currencyCode = companyDetails.country;

          const formatCurrency = (amount) => {
              if (isNaN(amount)) {
                  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(0);
              }
              return new Intl.NumberFormat(currencyCode === 'AUD' ? 'en-AU' : 'en-US', { style: 'currency', currency: currencyCode }).format(amount);
          };

          companyNameEl.textContent = companyDetails.name;

          const openInvoices = invoices.filter(inv => parseFloat(inv.balance_due_amount) > 0);
          const openBills = bills.filter(bill => parseFloat(bill.balance_due_amount) > 0);

          renderTable('outstanding-invoices', openInvoices, [
              { header: 'Invoice #', key: 'number' },
              { header: 'Customer', key: 'customer_name' },
              { header: 'Amount Due', key: 'balance_due_amount' },
              { header: 'Days Overdue', key: 'days_overdue' }
          ], 'invoices-total', formatCurrency, 'invoices-count', 'show-all-invoices');

          renderTable('outstanding-bills', openBills, [
              { header: 'Supplier', key: 'supplier_name' },
              { header: 'Amount Due', key: 'balance_due_amount' },
              { header: 'Days Overdue', key: 'days_overdue' }
          ], 'bills-total', formatCurrency, 'bills-count', 'show-all-bills');

          mainContent.style.display = 'grid';
          if (openInvoices.length > 0 || openBills.length > 0) {
            chatInterface.style.display = 'flex';
          }

      } catch (error) {
          console.error('Dashboard Error:', error);
          errorMessage.textContent = `Failed to load dashboard data: ${error.message}`;
      }
  }

  // --- Sync Process ---
  async function startSyncProcess() {
    mainContent.style.display = 'none';
    chatInterface.style.display = 'none';
    progressContainer.style.display = 'block';
    let retries = 0;
    const maxRetries = 3;
    try {
      // 1. Start the sync
      await fetch(`/api/company-file/${companyId}/sync`, { method: 'POST' });

      // 2. Poll for status
      const pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`/api/company-file/${companyId}/sync-status`);
            if (!res.ok) {
                throw new Error(`Sync status check failed: ${res.statusText}`);
            }
            const status = await res.json();

            syncStatusEl.textContent = `Status: ${status.status}... (${status.processed_items} / ${status.total_items})`;
            let progress = 0;
            if (status.total_items > 0) {
                progress = (status.processed_items / status.total_items) * 100;
            }
            progressBar.style.width = `${progress}%`;

            if (status.status === 'Completed' || status.status === 'Failed') {
              clearInterval(pollInterval);
              progressContainer.style.display = 'none';
              if (status.status === 'Completed') {
                await loadDataFromDb();
              } else {
                errorMessage.textContent = 'Data synchronization failed. Please try refreshing the page.';
              }
            }
        } catch (error) {
            retries++;
            if (retries > maxRetries) {
              clearInterval(pollInterval); // Stop polling on error
              progressContainer.style.display = 'none';
              errorMessage.textContent = `An error occurred while checking sync status: ${error.message}`;
            }
        }
      }, 2000); // Poll every 2 seconds

    } catch (error) {
      console.error('Sync Error:', error);
      errorMessage.textContent = 'Could not start data synchronization.';
      progressContainer.style.display = 'none';
    }
  }

  await startSyncProcess();

  // --- Chat Logic ---
  const chatWindow = document.getElementById('chat-window');
  const chatInput = document.getElementById('chat-input');
  const sendBtn = document.getElementById('send-btn');

  const history = [{ role: 'system', content: 'You are a business‑coach assistant. Use the provided data to answer questions.' }];

  sendBtn.addEventListener('click', async () => {
    const userMsg = chatInput.value;
    if (!userMsg) return;

    const urlParams = new URLSearchParams(window.location.search);
    const companyId = urlParams.get('id');

    history.push({ role: 'user', content: userMsg });
    chatWindow.innerHTML += `<div class="chat-message user">${userMsg}</div>`;
    chatInput.value = '';
    chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom

    // Add a thinking indicator
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
      
      thinkingEl.remove(); // Remove thinking indicator
      chatWindow.innerHTML += `<div class="chat-message ai">${reply.content}</div>`;
      chatWindow.scrollTop = chatWindow.scrollHeight; // Scroll to bottom
    } catch (error) {
        thinkingEl.remove();
        chatWindow.innerHTML += `<div class="chat-message ai error">Sorry, I couldn't get a response. Please try again.</div>`;
        console.error("Chat error:", error);
    }
  });
});
