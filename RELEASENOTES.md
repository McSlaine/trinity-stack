# Release Notes

## How to restart the server

If the server fails to start with an `EADDRINUSE` error, it means another process is already using port 3000. Here's how to fix it:

1.  **Find the process ID (PID) using the port:**
    ```bash
    lsof -i :3000
    ```
    This will show you the PID of the process using the port.

2.  **Kill the process:**
    Replace `[PID]` with the PID you found in the previous step.
    ```bash
    kill [PID]
    ```

3.  **Restart the server:**
    ```bash
    node server.js &
    ```

## Debugging Dashboard Data Errors

If the dashboard is missing data, the issue is likely a failure in the data sync process.

**Problem:** The sync process was failing for two reasons:
1.  The MYOB API call for the Profit & Loss report was missing required parameters (`ReportingBasis`, `YearEndAdjust`).
2.  API calls for large datasets (like the Chart of Accounts) were timing out, causing the entire sync to fail.

**Solution:**
1.  The P&L API call was corrected to include all required parameters, based on the official MYOB documentation.
2.  The sync logic was refactored to handle API timeouts gracefully. It now marks the sync as "Completed with errors" and continues to process other data, preventing a total failure.
3.  The P&L report is now fetched directly when the dashboard loads to ensure it is always up-to-date.