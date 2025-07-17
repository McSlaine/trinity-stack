# 🤖 Multi-Agent Collaboration Protocol (Claude + Gemini + Grok + Human)

## Purpose
This document defines the standard operating procedure for leveraging Claude (planner), Gemini CLI (executor), and Grok (advisor) in collaboration with a human developer using Cursor or similar environments.

The goal is to streamline debugging, deployment, and DevOps actions across environments using structured AI delegation and multi-perspective problem solving.

---

## 🧠 Agent Roles

| Agent      | Role              | Responsibilities |
|------------|-------------------|------------------|
| Claude     | Planner/Thinker   | Diagnoses issues, writes or rewrites code, builds plans, tracks logical flow |
| Gemini CLI | Executor/Doer     | Executes shell commands, applies file changes, restarts servers, validates endpoints |
| Grok       | Advisor/Consultant| Provides alternative approaches, debugging insights, reviews Claude's solutions |
| Human      | Orchestrator      | Provides prompts, reviews outputs, directs agent collaboration, handles edge cases |

---

## 🧭 Workflow Pattern

1. **Human detects or suspects issue**
2. **Claude analyzes and writes fix plan**
3. **Grok reviews plan and suggests alternatives (optional)**
4. **Claude hands off commands to Gemini via shell**
5. **Gemini executes commands and confirms result**
6. **Grok validates solution or proposes improvements (optional)**
7. **Claude optionally updates documentation or code**
8. **Human reviews + confirms success or re-routes AI**

---

## 🔁 Use Cases

- OAuth setup (e.g. MYOB) - Claude plans, Grok advises, Gemini executes
- SSL certificate configuration - Multi-agent validation of security practices
- Debugging DB connections - Alternative diagnostics from multiple AI perspectives
- File creation + endpoint testing - Collaborative code review and testing
- Nginx deployment logic - Cross-validation of configuration approaches

---

## 📦 Directory Layout

/docs/ai-collab-protocol.md ← this file
/docs/PRODUCTION_HARDENING.md ← environment security rules
/scripts/verify-prod.sh ← optional verification shell
/test-grok-direct.py ← Grok integration testing script

---

## 🤖 Grok Integration Setup

Grok (xAI's Grok-4) is integrated via direct API calls:
- **API Key**: Configured in `test-grok-direct.py`
- **Model**: Using `grok-4-0709` for technical consulting
- **Usage**: `python3 test-grok-direct.py` for interactive consultation
- **Role**: Provides alternative approaches and validates Claude's solutions
- **Context**: Specialized for Node.js, SSL, OAuth, and deployment issues

---

## 🧪 Testing & Validation Strategy

Agents must be able to:
- **Claude**: Detect and confirm endpoint errors (e.g. 404 on `/auth/login`)
- **Gemini**: Restart servers and validate health (`/health`)
- **Grok**: Provide alternative testing approaches and validate solutions
- **All agents**: Edit code + config reliably with version control
- **All agents**: Follow hardening policies outlined in `PRODUCTION_HARDENING.md`

---

## 🛡️ Failover Policy

In cases where agents conflict or diverge:
- Human operator has override authority
- Claude can document the dispute in `docs/ai-conflict-log.md`
- Grok can provide tie-breaking recommendations when Claude/Gemini disagree
- Gemini CLI should stop execution if unknown commands appear
- If Claude and Grok disagree, human makes final decision

---

## 🚀 Future Automation

This protocol lays the groundwork for:
- Agent chaining (Claude → Grok → Gemini) for collaborative problem solving
- Multi-AI consensus mechanisms for complex decisions
- Action logging and blame tracking across all three agents
- Git pre-deploy validation using hardening rules with Grok validation
- Auto-generated recovery scripts with multi-perspective testing

---

## 🔐 Commit History Rule

- All AI-created files should be committed with a `docs:` or `ops:` prefix
- All commits should include agent name and version (e.g. `claude-3-opus`, `gemini-2.5-pro`)

---

## 🧠 Rule of Thumb

*Claude writes the fix. Grok reviews it. Gemini proves it. Human deploys it.*

---

*Protocol established July 2025 by Erik Krystal with assistance from Signal.* 