#!/usr/bin/env python3
"""
Gemini CLI - Trinity Stack Executor Agent (Safe Version)
"""

import os
import subprocess
from datetime import datetime

def log_to_trinity(message):
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with open('trinity.log', 'a') as f:
        f.write(f"[GEMINI][{timestamp}] {message}\n")

def execute_command(command):
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
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

def main():
    print("""
Trinity Stack Executor Agent
Gemini CLI is ready. Type 'exit' to quit.
""")
    log_to_trinity("Gemini CLI started")

    # Pre-checks (optional)
    commands = [
        "pwd",
        "pm2 list | grep cashflow || echo 'No PM2 processes found'",
        "curl -f http://localhost:3000/health 2>/dev/null || echo 'Health check failed'"
    ]

    for cmd in commands:
        print(f"> {cmd}")
        result = execute_command(cmd)
        if result["success"]:
            print(result["stdout"].strip())
            log_to_trinity(f"Executed: {cmd}")
        else:
            print(f"⚠️ Error: {result['stderr'].strip()}")
            log_to_trinity(f"Failed: {cmd} - {result['stderr']}")

    print("\n🎯 Interactive mode - Enter commands or 'exit' to quit:")

    while True:
        try:
            command = input("> ").strip()

            if command.lower() == 'exit':
                print("Goodbye.")
                log_to_trinity("Gemini CLI exited.")
                break

            if not command:
                continue

            # Basic safety - allow echo, ls, cat, pm2, curl, etc.
            banned = ["tail -f", "while true", "gemini_cli.py", "trinity-watch.sh"]
            if any(bad in command.lower() for bad in banned):
                print(f"⚠️ Blocked: {command} (blacklisted)")
                log_to_trinity(f"Blocked command: {command}")
                continue

            result = execute_command(command)
            if result["success"]:
                print(result["stdout"].strip())
                log_to_trinity(f"Executed: {command}")
            else:
                print(f"❌ Error: {result['stderr'].strip()}")
                log_to_trinity(f"Failed: {command} - {result['stderr']}")

        except KeyboardInterrupt:
            print("\nGoodbye.")
            log_to_trinity("Gemini CLI interrupted by keyboard.")
            break
        except Exception as e:
            print(f"Unhandled error: {e}")
            log_to_trinity(f"Unhandled error: {e}")

if __name__ == "__main__":
    main()
