const axios = require('axios');
const tokenStore = require('./tokenStore');

// Add a response interceptor to handle retries
axios.interceptors.response.use(null, async (error) => {
    const config = error.config;

    // If we have no retry count, or we've already retried, reject
    if (!config || !config.retry) {
        return Promise.reject(error);
    }

    // Set a retry flag so we don't retry again
    config.__retry = true;
    config.retry--;

    // Log the retry attempt
    console.log('Retrying API call...');

    // Create a new promise to handle the retry
    return new Promise((resolve) => {
        // Add a delay before retrying
        setTimeout(() => {
            console.log('Making retry call');
            resolve(axios(config));
        }, 1000);
    });
});


async function makeMyobApiCall(apiCall) {
    try {
        return await apiCall();
    } catch (error) {
        if (error.response && error.response.status === 401) {
            console.log('MYOB token expired, refreshing...');
            await refreshToken();
            // Retry the API call with the new token
            return await apiCall();
        }
        // Handle timeout and other network errors
        if (error.code === 'ECONNABORTED' || (error.response && error.response.status === 504)) {
            console.error('MYOB API call timed out or failed with 504.');
            // The interceptor will handle the retry
        }
        throw error;
    }
}

async function getCompanyFiles() {
    return makeMyobApiCall(async () => {
        const token = await tokenStore.getToken();
        if (!token) {
            throw new Error('MYOB token not found.');
        }

        const response = await axios.get('https://api.myob.com/accountright', {
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'x-myobapi-key': process.env.MYOB_CLIENT_ID.trim(),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            },
            timeout: 10000, // 10 second timeout
            retry: 1 // Number of retries
        });

        return response.data;
    });
}

async function fetchBills(companyId) {
    return makeMyobApiCall(async () => {
        const token = await tokenStore.getToken();
        if (!token) {
            throw new Error('MYOB token not found.');
        }

        const companyFiles = await getCompanyFiles();
        const companyFile = companyFiles.find(cf => cf.Id === companyId);

        if (!companyFile) {
            throw new Error(`Company file with ID ${companyId} not found.`);
        }

        const response = await axios.get(`${companyFile.Uri}/Purchase/Bill`, {
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'x-myobapi-key': process.env.MYOB_CLIENT_ID.trim(),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            },
            params: {
                $filter: "IsPaid eq false",
                $orderby: "Date desc",
                $top: 100,
            },
            timeout: 10000, // 10 second timeout
            retry: 1 // Number of retries
        });

        if (!response.data || !response.data.Items) {
            console.warn('MYOB API returned no bill data or a malformed response.');
            return [];
        }

        return response.data.Items.map(item => ({
            UID: item.UID,
            type: 'bill',
            date: item.Date,
            dueDate: item.Terms.DueDate,
            amount: item.TotalAmount,
            status: item.Status,
            description: item.Lines && item.Lines.length > 0 ? item.Lines[0].Description : 'N/A',
        }));
    });
}

async function fetchInvoices(companyId) {
    return makeMyobApiCall(async () => {
        const token = await tokenStore.getToken();
        if (!token) {
            throw new Error('MYOB token not found.');
        }

        const companyFiles = await getCompanyFiles();
        const companyFile = companyFiles.find(cf => cf.Id === companyId);

        if (!companyFile) {
            throw new Error(`Company file with ID ${companyId} not found.`);
        }

        const response = await axios.get(`${companyFile.Uri}/Sale/Invoice`, {
            headers: {
                'Authorization': `Bearer ${token.access_token}`,
                'x-myobapi-key': process.env.MYOB_CLIENT_ID.trim(),
                'x-myobapi-version': 'v2',
                'Accept-Encoding': 'gzip,deflate',
            },
            params: {
                $filter: "Status eq 'Open'",
                $orderby: "Date desc",
                $top: 100,
            },
            timeout: 10000, // 10 second timeout
            retry: 1 // Number of retries
        });

        if (!response.data || !response.data.Items) {
            console.warn('MYOB API returned no invoice data or a malformed response.');
            return [];
        }

        return response.data.Items.map(item => ({
            UID: item.UID,
            type: 'invoice',
            date: item.Date,
            dueDate: item.Terms.DueDate,
            amount: item.TotalAmount,
            status: item.Status,
            description: item.Lines && item.Lines.length > 0 ? item.Lines[0].Description : 'N/A',
        }));
    });
}

async function refreshToken() {
    const token = await tokenStore.getToken();
    if (!token || !token.refresh_token) {
        throw new Error('MYOB refresh token not found.');
    }

    const params = new URLSearchParams();
    params.append('client_id', process.env.MYOB_CLIENT_ID.trim());
    params.append('client_secret', process.env.MYOB_CLIENT_SECRET);
    params.append('grant_type', 'refresh_token');
    params.append('refresh_token', token.refresh_token);

    const response = await axios.post('https://secure.myob.com/oauth2/v1/authorize', params, {
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        }
    });

    await tokenStore.storeToken(response.data);
    return response.data;
}

module.exports = {
    fetchBills,
    fetchInvoices,
    getCompanyFiles,
    refreshToken,
};
