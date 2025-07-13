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

If the dashboard shows a "Sync Failed" error, the issue is likely in the `syncCompanyData` function in `server.js`.

**Problem:** The sync process was using a single, generic database query for different data types (invoices, bills, accounts), causing a fatal SQL error if the columns didn't match. It also lacked resilience, failing the entire sync if one part failed.

**Solution:** The `syncCompanyData` function was refactored to use specific, correct `INSERT` statements for each data type. The process now syncs data sequentially and isolates errors, allowing the sync to complete even if a non-critical part fails. This makes the entire process more robust and less prone to API timeouts.
