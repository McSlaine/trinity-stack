const { syncCompanyInvoices } = require('./sync');

const syncProgress = new Map();

console.log('[TRACE] lib/syncManager.js loaded');

function startSyncProcess(companyFileId, startDate, endDate) {
  console.log('[TRACE] startSyncProcess called.');
  const existingSync = syncProgress.get(companyFileId);
  if (existingSync && existingSync.status === 'syncing') {
    console.log(`[TRACE] Sync already in progress for ${companyFileId}. Aborting new sync.`);
    return;
  }

  console.log(`[TRACE] Setting initial sync status for ${companyFileId}.`);
  syncProgress.set(companyFileId, {
    status: 'syncing',
    progress: 0,
    message: 'Initializing sync...',
    error: null,
  });

  console.log('[TRACE] Starting background sync process (syncCompanyInvoices)...');
  syncCompanyInvoices(companyFileId, startDate, endDate, updateSyncProgress).catch(err => {
    console.error(`[FATAL TRACE] Unhandled promise rejection in syncCompanyInvoices for ${companyFileId}:`, err);
    updateSyncProgress(companyFileId, {
      status: 'error',
      message: 'A fatal error occurred during sync.',
      error: err.message || 'Unknown error',
    });
  });
  console.log('[TRACE] Background sync process started.');
}

function updateSyncProgress(companyFileId, update) {
  console.log(`[TRACE] updateSyncProgress for ${companyFileId}:`, JSON.stringify(update));
  const current = syncProgress.get(companyFileId) || {};
  syncProgress.set(companyFileId, { ...current, ...update });
}

function getSyncStatus(companyFileId) {
  const progress = syncProgress.get(companyFileId);
  if (!progress) {
    return { status: 'idle', progress: 0, message: 'Not started' };
  }
  return progress;
}

module.exports = {
  startSyncProcess,
  getSyncStatus,
  updateSyncProgress,
};
