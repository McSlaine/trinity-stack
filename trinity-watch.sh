#!/bin/bash

# ==============================================
# Trinity Stack Log Watcher (Unified Safe Version)
# - Tails trinity.log
# - Exits after 100 lines or 60 seconds
# - Ignores duplicates and echo triggers
# ==============================================

LOG_FILE="trinity.log"
MAX_LINES=100
TIMEOUT=60  # seconds
START_TIME=$(date +%s)
LINE_COUNT=0
LAST_LINE=""

echo "🔍 Trinity Watch started - watching $LOG_FILE (max $MAX_LINES lines, $TIMEOUT sec)"

tail -n 0 -F "$LOG_FILE" | while read -r LINE; do
    # Timeout guard
    CURRENT_TIME=$(date +%s)
    ELAPSED=$((CURRENT_TIME - START_TIME))
    if [[ $ELAPSED -ge $TIMEOUT ]]; then
        echo "⏰ Timeout reached ($TIMEOUT sec) - exiting watcher"
        break
    fi

    # Skip blank or duplicate lines
    [[ -z "$LINE" || "$LINE" == "$LAST_LINE" ]] && continue
    LAST_LINE="$LINE"

    # Guard against echo loops and noise
    if [[ "$LINE" == *"[GEMINI]"* && "$LINE" == *"echo"* ]]; then continue; fi
    if [[ "$LINE" == *"[GEMINI]"* && "$LINE" == *"Command executed successfully"* ]]; then continue; fi
    if [[ "$LINE" == *"[GEMINI]"* && "$LINE" == *"session ended"* ]]; then continue; fi

    echo "📄 $LINE"

    LINE_COUNT=$((LINE_COUNT + 1))
    if [[ $LINE_COUNT -ge $MAX_LINES ]]; then
        echo "📉 Max line count ($MAX_LINES) reached - exiting watcher"
        break
    fi
done

echo "✅ Trinity Watch safely exited"
