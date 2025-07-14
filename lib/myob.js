const axios = require('axios');
const querystring = require('querystring');
const tokenStore = require('../tokenStore');

const { MYOB_CLIENT_ID, MYOB_CLIENT_SECRET } = process.env;

async function refreshToken() {
    const tokenData = await tokenStore.getToken();
    if (!tokenData || !tokenData.refresh_token) {
        throw new Error('Refresh token not available.');
    }
    const postData = querystring.stringify({
        client_id: MYOB_CLIENT_ID,
        client_secret: MYOB_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: tokenData.refresh_token,
    });
    const tokenResponse = await axios.post('https://secure.myob.com/oauth2/v1/authorize', postData, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    await tokenStore.storeToken(tokenResponse.data);
    console.log('Token refreshed successfully.');
    return tokenResponse.data;
}

async function makeMyobApiRequest(url, allItems = []) {
  let tokenData = await tokenStore.getToken();
  if (!tokenData) {
    const err = new Error('Authentication required. Please log in to MYOB.');
    err.statusCode = 401;
    throw err;
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'x-myobapi-key': MYOB_CLIENT_ID,
        'x-myobapi-version': 'v2',
        'Authorization': `Bearer ${tokenData.access_token}`,
        'Accept-Encoding': 'gzip,deflate',
      },
    });

    const data = response.data;
    const newItems = allItems.concat(data.Items || []);

    if (data.NextPageLink) {
      console.log(`[Pagination] Fetching next page: ${data.NextPageLink}`);
      return await makeMyobApiRequest(data.NextPageLink, newItems);
    }

    if (data.Items) {
      return { ...data, Items: newItems };
    }
    return data;

  } catch (error) {
    console.error(`MYOB API request to ${url} failed:`, error.response?.data || error.message);
    if (error.response && error.response.status === 401) {
      console.log('Access token expired, attempting refresh...');
      try {
        await refreshToken();
        console.log('Token refreshed, retrying original request to:', url);
        return await makeMyobApiRequest(url, allItems);
      } catch (refreshError) {
        console.error('Failed to refresh token:', refreshError.message);
        const err = new Error('Your session has expired. Please log in again.');
        err.statusCode = 401;
        throw err;
      }
    }
    if (error.response) {
      error.statusCode = error.response.status;
    }
    throw error;
  }
}

module.exports = { makeMyobApiRequest, refreshToken };
