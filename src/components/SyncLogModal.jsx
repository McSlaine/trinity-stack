import React, { useState, useEffect, useMemo } from 'react';

// Modal Component for displaying sync logs
const SyncLogModal = ({ isOpen, onClose, logs, isLoading, error }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'sync_date', direction: 'descending' });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  if (!isOpen) return null;

  const sortedLogs = useMemo(() => {
    let sortableLogs = [...logs];
    if (sortConfig.key !== null) {
      sortableLogs.sort((a, b) => {
        const valA = a[sortConfig.key] || '';
        const valB = b[sortConfig.key] || '';
        if (valA < valB) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (valA > valB) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableLogs;
  }, [logs, sortConfig]);

  const filteredLogs = useMemo(() => 
    sortedLogs.filter(log => {
      const status = log.status || '';
      const errorMessage = log.error_message || '';
      const term = searchTerm.toLowerCase();
      return status.toLowerCase().includes(term) || errorMessage.toLowerCase().includes(term);
    }),
  [sortedLogs, searchTerm]);

  // Reset to page 1 whenever filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, sortConfig]);

  const pageCount = Math.ceil(filteredLogs.length / itemsPerPage);
  const currentLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return ' ';
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  const SortableHeader = ({ columnKey, title }) => (
    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer select-none" onClick={() => requestSort(columnKey)}>
      <div className="flex items-center">
        {title}
        <span className="ml-2 text-blue-500 w-4">{getSortIcon(columnKey)}</span>
      </div>
    </th>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white z-10">
          <h3 className="text-xl font-bold text-gray-800">Sync History</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
        </div>
        
        <div className="p-6">
          <input
            type="text"
            placeholder="Filter by status or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="px-6 pb-6 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
          ) : error ? (
            <div className="text-red-600 bg-red-100 p-4 rounded-md">{error}</div>
          ) : logs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No sync history found for this company file.</div>
          ) : filteredLogs.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No logs match your search criteria.</div>
          ) : (
            <div className="overflow-x-auto border rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <SortableHeader columnKey="sync_date" title="Date" />
                    <SortableHeader columnKey="status" title="Status" />
                    <SortableHeader columnKey="records_processed" title="Records" />
                    <SortableHeader columnKey="error_message" title="Details" />
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {currentLogs.map(log => (
                    <tr key={log.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{new Date(log.sync_date).toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          log.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-center">{log.records_processed}</td>
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs break-words">{log.error_message || 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="flex justify-between items-center p-4 border-t sticky bottom-0 bg-white z-10">
          <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Previous</button>
          {pageCount > 0 && <span className="text-sm text-gray-700">Page {currentPage} of {pageCount}</span>}
          <button onClick={() => setCurrentPage(p => Math.min(pageCount, p + 1))} disabled={currentPage === pageCount || pageCount === 0} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">Next</button>
        </div>
      </div>
    </div>
  );
};

export default SyncLogModal;
