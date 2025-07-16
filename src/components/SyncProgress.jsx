import React, { useState, useEffect } from 'react';
import axios from 'axios';
import SyncLogModal from './SyncLogModal'; // Assuming this component exists and is styled

/**
 * A component to handle the data synchronization process from MYOB.
 * It allows users to select a company file, specify a date range,
 * and initiate a sync. It provides real-time feedback on the sync
 * status and allows viewing of historical sync logs.
 */
export default function SyncProgress() {
  // State for company files fetched from the server
  const [companyFiles, setCompanyFiles] = useState([]);
  
  // State for form inputs
  const [selectedCompanyFile, setSelectedCompanyFile] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Unified state for component status: 'idle', 'loading', 'syncing', 'success', 'error'
  const [status, setStatus] = useState('loading');
  
  // State for holding error or success messages
  const [message, setMessage] = useState('');

  // State for the sync log modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState([]);
  const [isLogLoading, setIsLogLoading] = useState(false);
  const [logError, setLogError] = useState('');

  // Fetch company files on component mount
  useEffect(() => {
    setStatus('loading');
    axios.get('/api/myob/company-files')
      .then(res => {
        setCompanyFiles(res.data || []);
        setStatus('idle');
      })
      .catch(() => {
        setMessage('Failed to load company files. Please refresh the page.');
        setStatus('error');
      });
  }, []);

  /**
   * Validates the form inputs before initiating the sync.
   * @returns {boolean} - True if validation passes, false otherwise.
   */
  const validateInputs = () => {
    if (!selectedCompanyFile) {
      setMessage('Please select a company file.');
      setStatus('error');
      return false;
    }
    if (!startDate || !endDate) {
      setMessage('Please select both a start and an end date.');
      setStatus('error');
      return false;
    }
    if (new Date(endDate) < new Date(startDate)) {
      setMessage('End date cannot be before the start date.');
      setStatus('error');
      return false;
    }
    return true;
  };

  /**
   * Handles the sync process when the user clicks the "Start Sync" button.
   */
  const handleSync = async (e) => {
    e.preventDefault();
    if (!validateInputs()) return;

    setStatus('syncing');
    setMessage('');

    try {
      const response = await axios.post('/api/sync', {
        companyFileId: selectedCompanyFile,
        startDate,
        endDate,
      });
      
      if (response.data.success) {
        setMessage(response.data.message || 'Sync completed successfully!');
        setStatus('success');
        // Optionally reset form fields on success
        // setSelectedCompanyFile('');
        // setStartDate('');
        // setEndDate('');
      } else {
        setMessage(response.data.message || 'An unknown error occurred on the server.');
        setStatus('error');
      }
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'A network or server error occurred.';
      setMessage(errorMessage);
      setStatus('error');
    }
  };

  /**
   * Fetches and displays the sync logs for the selected company file.
   */
  const handleViewLogs = async () => {
    if (!selectedCompanyFile) {
      setMessage("Please select a company file to view its sync history.");
      setStatus('error');
      return;
    }
    
    setIsModalOpen(true);
    setIsLogLoading(true);
    setLogError('');
    setSyncLogs([]);

    try {
      const res = await axios.get(`/api/sync/history/${selectedCompanyFile}`);
      setSyncLogs(res.data || []);
    } catch (err) {
      const errorMsg = err.response?.data?.message || err.message || 'Could not fetch sync history.';
      setLogError(errorMsg);
    } finally {
      setIsLogLoading(false);
    }
  };

  const isSyncInProgress = status === 'syncing';
  const isDataLoading = status === 'loading';

  return (
    <>
      <div className="bg-slate-100 dark:bg-slate-900 flex items-center justify-center p-4 sm:p-6 lg:p-8 min-h-screen">
        <div className="w-full max-w-2xl bg-white dark:bg-slate-800 p-6 sm:p-8 rounded-2xl shadow-2xl transform transition-all">
          <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-6 text-center">
            Data Synchronization
          </h2>

          {/* Unified Alert Box */}
          {message && (
            <div
              className={`border-l-4 p-4 mb-6 rounded-md ${
                status === 'error' ? 'bg-red-100 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-300' : ''
              } ${
                status === 'success' ? 'bg-green-100 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-300' : ''
              }`}
              role="alert"
            >
              <p className="font-bold">{status === 'error' ? 'Error' : 'Success'}</p>
              <p>{message}</p>
              {status === 'error' && (
                 <button
                    onClick={handleSync}
                    className="mt-2 px-3 py-1 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                >
                    Retry Sync
                </button>
              )}
            </div>
          )}

          <form onSubmit={handleSync} className="space-y-6">
            {/* Company File Selection */}
            <div>
              <label htmlFor="companyFile" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Company File
              </label>
              <select
                id="companyFile"
                value={selectedCompanyFile}
                onChange={(e) => setSelectedCompanyFile(e.target.value)}
                disabled={isDataLoading || isSyncInProgress}
                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out disabled:bg-slate-200 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed"
              >
                <option value="">{isDataLoading ? 'Loading files...' : 'Select a company file'}</option>
                {companyFiles.map(file => (
                  <option key={file.id} value={file.id}>{file.name}</option>
                ))}
              </select>
            </div>

            {/* Date Range Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={isSyncInProgress}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out disabled:bg-slate-200 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={isSyncInProgress}
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition duration-150 ease-in-out disabled:bg-slate-200 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 space-y-4">
              <button
                type="submit"
                disabled={isDataLoading || isSyncInProgress}
                className="w-full inline-flex justify-center items-center py-3 px-6 border border-transparent shadow-sm text-base font-medium rounded-lg text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
              >
                {isSyncInProgress ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : 'Start Sync'}
              </button>
              <button
                type="button"
                onClick={handleViewLogs}
                disabled={isDataLoading || isSyncInProgress || !selectedCompanyFile}
                className="w-full inline-flex justify-center items-center py-2.5 px-5 border border-slate-300 dark:border-slate-600 shadow-sm text-base font-medium rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-200 dark:disabled:bg-slate-700/50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out"
              >
                View Sync Log
              </button>
            </div>
          </form>
        </div>
      </div>
      <SyncLogModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        logs={syncLogs}
        isLoading={isLogLoading}
        error={logError}
      />
    </>
  );
}
