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
