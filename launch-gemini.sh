#!/bin/bash
# Trinity Stack - Gemini CLI Launcher  
echo "[GEMINI][$(date '+%Y-%m-%d %H:%M:%S')] Starting Gemini CLI session..." >> trinity.log

echo "=== GEMINI CLI SESSION STARTING ==="
echo "⚡ Gemini is ready for command execution"
echo "Role: Executor/Doer - executes shell commands, validates endpoints"
echo "Type 'exit' to quit Gemini session"
echo "Current task: Execute sync investigation commands"
echo ""

# Launch the Gemini CLI executor
python3 gemini_cli.py

echo "[GEMINI][$(date '+%Y-%m-%d %H:%M:%S')] Gemini CLI session ended" >> trinity.log 