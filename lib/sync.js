const axios = require('axios');
const tokenStore = require('../tokenStore');

async function fetchMYOBDataWithRetry(url, headers, retries = 3, initialDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      return await axios.get(url, { headers, timeout: 15000 });
    } catch (error) {
      const status = error?.response?.status || error.code || 'unknown';
      if (i === retries - 1 || !(status >= 500)) throw error;
      const delay = initialDelay * 2 ** i;
      await new Promise(res => setTimeout(res, delay));
    }
  }
}

async function syncCompanyInvoices(companyFileId, startDate, endDate, progressCallback) {
  try {
    const token = await tokenStore.getToken();
    if (!token || !token.access_token) {
      throw new Error('Unauthorized. No valid token available.');
    }

    progressCallback(companyFileId, { progress: 10, message: 'Authorizing with MYOB...' });

    const headers = {
      'Authorization': `Bearer ${token.access_token}`,
      'x-myobapi-key': process.env.MYOB_CLIENT_ID.trim(),
      'x-myobapi-version': 'v2',
      'Accept': 'application/json',
      'Accept-Encoding': 'gzip,deflate'
    };

    const companyFiles = await fetchMYOBDataWithRetry('https://api.myob.com/accountright', headers);
    const companyFile = companyFiles.data.find(cf => cf.Id === companyFileId);

    if (!companyFile) {
      throw new Error('Company file not found.');
    }

    progressCallback(companyFileId, { progress: 30, message: `Fetching invoices for ${companyFile.Name}...` });

    const baseUrl = companyFile.Uri;
    const filter = `BalanceDueAmount gt 0 and Date ge datetime'${startDate}T00:00:00' and Date le datetime'${endDate}T23:59:59'`;
    const params = new URLSearchParams({ '$filter': filter });
    const url = `${baseUrl}/Sale/Invoice?${params.toString()}`;

    const response = await fetchMYOBDataWithRetry(url, headers);
    const invoices = response.data?.Items || [];

    progressCallback(companyFileId, {
      status: 'success',
      progress: 100,
      message: `Sync complete. Fetched ${invoices.length} invoices.`,
      invoiceCount: invoices.length,
    });

  } catch (error) {
    console.error("Sync failed:", error.message);
    progressCallback(companyFileId, {
      status: 'error',
      progress: 100, // Show completion of the attempt, but with an error
      message: 'Sync failed.',
      error: error.message,
    });
  }
}

module.exports = { syncCompanyInvoices };