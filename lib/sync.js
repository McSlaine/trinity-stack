const axios = require('axios');
const tokenStore = require('../tokenStore');

console.log('[TRACE] lib/sync.js loaded');

async function fetchMYOBDataWithRetry(url, headers, retries = 3, initialDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      console.log(`[TRACE] Attempt ${i + 1} to fetch MYOB data from: ${url}`);
      return await axios.get(url, { headers, timeout: 15000 });
    } catch (error) {
      const status = error?.response?.status || error.code || 'unknown';
      console.error(`[TRACE] Attempt ${i + 1} failed with status: ${status}`);
      if (i === retries - 1 || !(status >= 500)) throw error;
      const delay = initialDelay * 2 ** i;
      console.log(`[TRACE] Retrying in ${delay}ms...`);
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function syncCompanyInvoices(companyFileId, startDate, endDate, progressCallback) {
  console.log('[TRACE] syncCompanyInvoices called.');
  try {
    console.log('[TRACE] Attempting to load token...');
    const token = await tokenStore.getToken();
    if (!token || !token.access_token) {
      console.error('[TRACE] Token validation failed: No valid token available.');
      throw new Error('Unauthorized. No valid token available.');
    }
    console.log('[TRACE] Token loaded successfully.');
    // Avoid logging the full token for security, just confirm its presence.
    console.log(`[TRACE] Using token starting with: ${token.access_token.substring(0, 8)}...`);

    progressCallback(companyFileId, { progress: 10, message: 'Authorizing with MYOB...' });

    const headers = {
      'Authorization': `Bearer ${token.access_token}`,
      'x-myobapi-key': process.env.MYOB_CLIENT_ID.trim(),
      'x-myobapi-version': 'v2',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip,deflate'
    };
    console.log('[TRACE] Headers prepared for MYOB API call.');

    const companyFiles = await fetchMYOBDataWithRetry('https://api.myob.com/accountright', headers);
    const companyFile = companyFiles.data.find(cf => cf.Id === companyFileId);

    if (!companyFile) {
      console.error(`[TRACE] Company file with ID ${companyFileId} not found in MYOB response.`);
      throw new Error('Company file not found.');
    }
    console.log(`[TRACE] Found company file: ${companyFile.Name}`);

    progressCallback(companyFileId, { progress: 30, message: `Fetching invoices for ${companyFile.Name}...` });

    const baseUrl = companyFile.Uri;
    const filter = `BalanceDueAmount gt 0 and Date ge datetime'${startDate}T00:00:00' and Date le datetime'${endDate}T23:59:59'`;
    const params = new URLSearchParams({ '$filter': filter });
    const url = `${baseUrl}/Sale/Invoice?${params.toString()}`;
    console.log(`[TRACE] Fetching invoices from final URL: ${url}`);

    const response = await fetchMYOBDataWithRetry(url, headers);
    const invoices = response.data?.Items || [];
    console.log(`[TRACE] Successfully fetched ${invoices.length} invoices.`);

    progressCallback(companyFileId, {
      status: 'success',
      progress: 100,
      message: `Sync complete. Fetched ${invoices.length} invoices.`,
      invoiceCount: invoices.length,
    });
    console.log('[TRACE] Sync process finished successfully.');

  } catch (error) {
    console.error("[TRACE] Sync failed with an error:", error.message);
    if (error.response) {
      console.error("[TRACE] Error response data:", JSON.stringify(error.response.data, null, 2));
    }
    progressCallback(companyFileId, {
      status: 'error',
      progress: 100,
      message: 'Sync failed.',
      error: error.message,
    });
  }
}

module.exports = { syncCompanyInvoices };
