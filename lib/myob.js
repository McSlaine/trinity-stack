const axios = require('axios');
const querystring = require('querystring');
const tokenStore = require('../tokenStore');

/**
 * Refreshes an expired MYOB access token using the stored refresh token.
 * This is the single source of truth for token refreshing.
 * @returns {Promise<object>} The new token data.
 */
async function refreshToken() {
    const tokenData = await tokenStore.getToken();
    if (!tokenData || !tokenData.refresh_token) {
        throw new Error('MYOB refresh token is not available. Please re-authenticate.');
    }

    if (process.env.DEBUG_TOKEN_REFRESH === 'true') {
        console.log('🔄 Attempting to refresh MYOB token...');
    }

    const postData = querystring.stringify({
        client_id: process.env.MYOB_CLIENT_ID,
        client_secret: process.env.MYOB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
    });

    try {
        const response = await axios.post('https://secure.myob.com/oauth2/v1/token', postData, {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        });
        
        await tokenStore.storeToken(response.data);
        console.log('✅ MYOB token refreshed successfully');
        
        if (process.env.DEBUG_TOKEN_REFRESH === 'true') {
            console.log(`🔍 New token expires in: ${response.data.expires_in} seconds`);
        }
        
        return response.data;

    } catch (error) {
        console.error('❌ Failed to refresh MYOB token:', error.response ? error.response.data : error.message);
        
        // If refresh fails, clear the stored token to force a new login
        await tokenStore.deleteToken();
        
        const err = new Error('Could not refresh token. Your session may have expired. Please log in again.');
        err.statusCode = 401;
        throw err;
    }
}

/**
 * Makes a request to the MYOB API, handling token refresh and pagination automatically.
 * @param {string} url - The MYOB API endpoint to request.
 * @param {Array} allItems - Used internally for accumulating items during pagination.
 * @returns {Promise<object>} The API response data.
 */
async function makeMyobApiRequest(url, allItems = []) {
  let tokenData = await tokenStore.getToken();
  if (!tokenData) {
    const err = new Error('Authentication required. Please log in to MYOB.');
    err.statusCode = 401;
    throw err;
  }

  if (process.env.DEBUG_OAUTH === 'true') {
    console.log(`🔗 Making MYOB API request to: ${url.substring(0, 100)}...`);
  }

  try {
    const headers = {
        'x-myobapi-key': process.env.MYOB_CLIENT_ID,
        'x-myobapi-version': 'v2',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept-Encoding': 'gzip,deflate',
    };

    if (tokenData.cftoken) {
        headers['x-myobapi-cftoken'] = tokenData.cftoken;
        if (process.env.DEBUG_OAUTH === 'true') {
            console.log('🏢 Using company file token');
        }
    }

    const response = await axios.get(url, { headers });
    const data = response.data;
    const newItems = allItems.concat(data.Items || []);

    if (process.env.DEBUG_OAUTH === 'true') {
        console.log(`📊 API Response: ${data.Items ? data.Items.length : 0} items received`);
    }

    // Handle pagination
    if (data.NextPageLink) {
      console.log(`📄 Fetching next page: ${data.NextPageLink}`);
      return await makeMyobApiRequest(data.NextPageLink, newItems);
    }

    const finalResult = data.Items ? { ...data, Items: newItems } : data;
    
    if (process.env.DEBUG_OAUTH === 'true') {
      console.log(`✅ MYOB API request completed. Total items: ${newItems.length}`);
    }

    return finalResult;

  } catch (error) {
    if (error.response && error.response.status === 401) {
      console.log('🔑 MYOB access token expired, attempting refresh...');
      try {
        await refreshToken();
        console.log('🔄 Retrying original request after token refresh...');
        return await makeMyobApiRequest(url, allItems); // Retry original request
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError.message);
        const err = new Error('Your session has expired. Please log in again.');
        err.statusCode = 401;
        throw err;
      }
    }

    // Enhanced error logging for development
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ MYOB API Error Details:');
      console.error(`  Status: ${error.response?.status}`);
      console.error(`  URL: ${url}`);
      console.error(`  Message: ${error.response?.data?.message || error.message}`);
      if (error.response?.data) {
        console.error(`  Response: ${JSON.stringify(error.response.data, null, 2)}`);
      }
    }

    // Re-throw with better error message
    const friendlyMessage = error.response?.data?.message || error.message || 'Unknown MYOB API error';
    const err = new Error(`MYOB API Error: ${friendlyMessage}`);
    err.statusCode = error.response?.status || 500;
    err.originalError = error;
    throw err;
  }
}

/**
 * Get all company files for the authenticated user
 * @returns {Promise<Array>} Array of company file objects
 */
async function getCompanyFiles() {
  try {
    console.log('🏢 Fetching MYOB company files...');
    const response = await makeMyobApiRequest('https://api.myob.com/accountright');
    const companies = response.Items || [];
    
    console.log(`✅ Found ${companies.length} company file(s)`);
    
    if (process.env.DEBUG_OAUTH === 'true') {
      companies.forEach((company, index) => {
        console.log(`  ${index + 1}. ${company.Name} (${company.Id})`);
      });
    }
    
    return companies;
  } catch (error) {
    console.error('❌ Failed to fetch company files:', error.message);
    throw error;
  }
}

module.exports = { makeMyobApiRequest, refreshToken, getCompanyFiles };
