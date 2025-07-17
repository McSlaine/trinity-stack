#!/usr/bin/env python3

import os
import time
import subprocess
from datetime import datetime

LOG_FILE = "trinity.log"

def log_to_trinity(message):
    """Append message with timestamp to trinity.log"""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open(LOG_FILE, 'a') as f:
        f.write(f"[GEMINI][{timestamp}] {message}\n")

def execute_command(command):
    """Execute shell command and return result dict"""
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout.strip(),
            "stderr": result.stderr.strip(),
            "returncode": result.returncode
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "stdout": "",
            "stderr": "Command timed out after 30 seconds",
            "returncode": -1
        }
    except Exception as e:
        return {
            "success": False,
            "stdout": "",
            "stderr": str(e),
            "returncode": -1
        }

def tail_log_and_execute():
    """Tail trinity.log and execute TRINITY_EXECUTE lines"""
    log_to_trinity("Parser activated - watching for TRINITY_EXECUTE commands")
    with open(LOG_FILE, 'r') as f:
        f.seek(0, os.SEEK_END)
        while True:
            line = f.readline()
            if not line:
                time.sleep(0.5)
                continue
            if "TRINITY_EXECUTE:" in line:
                command = line.split("TRINITY_EXECUTE:")[-1].strip()
                log_to_trinity(f"Parser received: {command}")
                result = execute_command(command)
                if result["success"]:
                    log_to_trinity(f"Success: {command} → {result['stdout']}")
                else:
                    log_to_trinity(f"Error: {command} → {result['stderr']}")

if __name__ == "__main__":
    print("🔁 Gemini Parser Mode started - Watching for TRINITY_EXECUTE commands...")
    tail_log_and_execute()
