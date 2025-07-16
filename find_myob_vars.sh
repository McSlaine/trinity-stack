#!/bin/bash

# This script searches for MYOB environment variables in common Ubuntu configuration locations.

# --- Search Configuration ---
# Turn on extended globbing
shopt -s globstar

# Variables to search for, combined into a single pattern for grep
PATTERN="MYOB_CLIENT_ID|MYOB_CLIENT_SECRET|MYOB_REDIRECT_URI"
echo "Searching for pattern: $PATTERN"
echo "--------------------------------------------------"

# --- Search Locations ---
# An array of files and directories to search.
# Using /root/.* because the script runs as root.
SEARCH_LOCATIONS=(
    "/root/.bashrc"
    "/root/.profile"
    "/root/.bash_profile"
    "/etc/environment"
    "/etc/profile"
    "/etc/bash.bashrc"
    "/etc/profile.d/**/*.sh"
    "/etc/systemd/system/**/*.service"
    "/etc/cron.d/*"
    "/etc/crontab"
    "/var/spool/cron/crontabs/root"
)

# --- Execution ---
# Loop through each location and search for the pattern.
# The `-H` flag ensures the filename is printed.
for location in "${SEARCH_LOCATIONS[@]}"; do
    if [ -e "$location" ]; then
        echo "[SEARCHING] $location"
        grep -EH "$PATTERN" "$location" 2>/dev/null
    else
        echo "[SKIPPING] $location (does not exist)"
    fi
done

# Perform a final, broad search across /etc/ and /home/
echo "--------------------------------------------------"
echo "[SEARCHING] Broad search in /etc/ and /home/..."
grep -rEH "$PATTERN" /etc/ /home/ 2>/dev/null

echo "--------------------------------------------------"
echo "Search complete."