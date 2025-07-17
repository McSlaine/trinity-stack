# TRINITY STACK PROTOCOL VIOLATIONS

## LEVEL 1 VIOLATIONS (SYSTEM CRITICAL)

### VIOLATION #001 - Recursive Log Loop 
**Date:** 2025-01-17  
**Agent:** Multiple (Claude, Gemini, Grok)  
**Root Cause:** `trinity-watch.sh` infinite `tail -f trinity.log` + simultaneous agent writes  
**Impact:** CPU runaway, system crash-loop  
**Status:** RESOLVED - Agent coordination rules implemented  

**Technical Details:**
- `trinity-watch.sh` Line 18: `tail -f "$LOG_FILE" | while read line; do` (no break condition)
- Multiple agents writing to same log simultaneously
- No rate limiting or collision detection
- Infinite feedback loop triggered

## AGENT COORDINATION SAFETY RULES

### Rule #1: Log File Coordination
- **NEVER** run `tail -f` without timeout or break conditions
- **ALWAYS** use file locking for shared log writes
- **IMPLEMENT** rate limiting for log writes (max 1/second per agent)

### Rule #2: Infinite Loop Prevention  
- **ALL** `while True:` loops MUST have:
  - Timeout conditions
  - Break triggers  
  - Resource monitoring
- **NO** agent should run indefinitely without user input

### Rule #3: Agent Handoff Protocol
- **ONE** active agent at a time
- **EXPLICIT** handoff with confirmation
- **NO** automated recursive agent calls
- **TIMEOUT** all agent sessions (max 30 minutes)

### Rule #4: Resource Monitoring
- **MONITOR** CPU usage during agent operations
- **KILL** processes exceeding 80% CPU for >30 seconds  
- **LOG** all resource violations

### Rule #5: Emergency Stop Protocol
- **CTRL+C** must work on ALL agent processes
- **Kill switches** for runaway processes
- **System recovery** procedures documented

## IMPLEMENTATION CHECKLIST
- [ ] Add timeouts to trinity-watch.sh
- [ ] Implement file locking for trinity.log
- [ ] Add resource monitoring to agent CLIs
- [ ] Create emergency stop procedures
- [ ] Test agent coordination under load

**Trinity Stack Protocol - Safety First** 