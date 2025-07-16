# Find Hardcoded MYOB Environment Variables on Ubuntu Server

## Problem Description
I have an Ubuntu server (DigitalOcean droplet) where old MYOB OAuth credentials are hardcoded somewhere in the system environment. These hardcoded values are overriding my application's `.env` file, causing my Node.js app to use the wrong credentials.

## The Issue
- My `.env` file contains NEW credentials: `MYOB_CLIENT_ID=7e825f9a-2c09-4fd8-b00f-c585bbe904ca`
- But the app keeps using OLD credentials: `MYOB_CLIENT_ID=3502423a-cfd5-40f8-b7c8-af12d72241a3`
- Even after restarting PM2 with `--update-env`, it still loads the old values
- This suggests the environment variables are set globally somewhere

## What I Need
I need to find and remove these hardcoded environment variables. Please provide:

1. **A comprehensive list of ALL locations** where environment variables might be set on Ubuntu
2. **Exact commands to search** for MYOB-related variables in each location
3. **How to remove or override** these variables once found
4. **The correct order** to check these locations (from most likely to least likely)

## Environment Variables to Find
```
MYOB_CLIENT_ID
MYOB_CLIENT_SECRET
MYOB_REDIRECT_URI
```

## Server Details
- OS: Ubuntu (Linux 6.11.0-29-generic)
- User: root
- Shell: /bin/bash
- App runs via PM2 as root user
- Working directory: /home/cashflow-trends-ai

## Locations I've Already Checked
- `.env` file in app directory (contains correct values)
- `ecosystem.config.js` (updated with correct values)

## Suspected Locations
Please check these and any others you can think of:
- User-specific: ~/.bashrc, ~/.profile, ~/.bash_profile
- System-wide: /etc/environment, /etc/profile, /etc/bash.bashrc
- PM2 specific locations
- Systemd service files
- Docker/container configs (if any)
- Any other Ubuntu/Linux locations where env vars can be set

## Expected Output
Please provide:
1. A shell script that searches ALL possible locations
2. Commands to remove the hardcoded values
3. How to verify the changes took effect
4. Whether a reboot is needed or just sourcing files

## Example of What I'm Looking For
```bash
# Example search command
grep -r "MYOB_CLIENT_ID" /etc/ /home/ ~/.* 2>/dev/null

# Example of what might be found
/etc/environment:export MYOB_CLIENT_ID="3502423a-cfd5-40f8-b7c8-af12d72241a3"
```

Please help me track down where these environment variables are being set so I can remove them and use the correct credentials from my `.env` file. 