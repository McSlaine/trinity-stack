# Project: Cashflow Trends AI

**Goal:** Product Overview: Cashflow AI
---------------------------------
Cashflow AI is a SaaS platform that leverages advanced artificial intelligence 
to analyze your business's historical accounting data and forecast future cash flow trends. 
This tool enables business owners and financial professionals to gain actionable insights 
to optimize cash management and fine-tune operations—powered by the most advanced AI on the planet.

Key Features:
-------------
1. Historical Data Analysis
   - Automated Data Import: Secure integration with MYOB (and future accounting systems) to import historical data.
   - Trend Analysis: Identify key trends in revenue, expenses, and cash flow.

2. Predictive Analytics & Forecasting
   - Future Forecasts: Use AI models to predict cash flow, detect potential shortfalls, and identify growth opportunities.
   - Scenario Planning: Simulate “what-if” scenarios to understand the impact of business decisions.

3. Actionable Business Insights
   - Personalized Recommendations: Receive tailored advice on cost-cutting, revenue optimization, and strategic investments.
   - Alerts & Notifications: Set up real-time alerts for cash flow deviations to stay ahead of issues.

4. Interactive Dashboard
   - Visualizations: Interactive charts and graphs that present your financial data clearly.
   - Reporting: Generate detailed, exportable reports for meetings and reviews.

5. AI-Powered Chat
   - Interactive Analysis: Chat with an AI assistant to get instant insights from your financial data.
   - Natural Language Queries: Ask complex questions in plain English and receive easy-to-understand answers.

6. Security & Data Protection
   - Secure Integration: Uses secure OAuth 2.0 integration with MYOB.
   - Compliance: Follows industry-standard security practices to protect your business data.

7. Token Management
   - Seamless Authentication: Access tokens are stored securely and automatically refreshed.
   - Minimal User Disruption: Once authenticated, users can continue working without repeated logins until the token expires.

Business Model:
---------------
- SaaS Subscription: Offered as a monthly subscription with tiered pricing:
  - Basic: For small businesses with essential features.
  - Professional: For growing businesses needing advanced analytics.
  - Enterprise: For larger organizations with complex data requirements.
- Free Trial: New users receive a risk-free trial period.


**Technologies:** Node.js, Express.js, OpenAI API, Python (for data analysis scripts), PostgreSQL.

---

## Autonomous Operation Guidelines

- **Independent Testing:** I will proactively use `web_fetch` to gather information and test functionalities independently, especially when an active token is available. I will only request your input or intervention when it's essential for progress or verification.

## Cashflow Trends AI – Strategic Development Plan (Enhanced Edition)

This document outlines the architectural evolution from a proof-of-concept into a robust, multi-tenant financial intelligence platform with real-time sync and AI-driven insights.

---

## Phase 1: Local Data Cache & Background Sync ✅

**Goal:** Decouple UI from MYOB latency, enable scalable architecture for analysis.

- [x] Local PostgreSQL mirror of MYOB data (invoices, bills, GST)
- [x] REST API endpoints: `/sync/:companyId`, `/sync-status`, `/sync-log`
- [x] Per-company sync isolation (resilient error handling)
- [x] Timeout logic (Promise.race)
- [x] Crash protection (uncaughtException, unhandledRejection)
- [x] Sync diagnostics via `syncProgressMap`
- [x] Error logging to `sync_log`
- [ ] Pull 2 years of data on initial sync
- [ ] Redis fallback demo data for new users while sync completes
- [ ] Queue-based sync (RabbitMQ or similar) to handle load & rate limits
- [ ] Serve default ABS-based industry templates in UI pre-sync
- [ ] Display “sync in progress” state and estimated duration to user

---

## Phase 2: Deepen Financial Data Scope

**Goal:** Expand local mirror with high-value datasets to support true financial intelligence.

- [ ] Sync Chart of Accounts
- [ ] Sync P&L Statements
- [ ] Sync Balance Sheets
- [ ] Sync Customer & Supplier records

---

## Phase 3: Semantic AI Advisor (Post-Sync)

**Goal:** Transform AI into a contextual financial assistant.

- [ ] Integrate Pinecone (or Weaviate) as VectorDB
- [ ] Generate vector embeddings of financial data via Sentence Transformers
- [ ] Semantic query engine with relevant retrieval + prompt injection
- [ ] Enable strategic queries: forecasting, trends, anomaly detection
- [ ] Build prompt-engineering layer to support cashflow logic tree

---

## Phase 4: Cost Optimisation & Monitoring

**Goal:** Minimise cloud/API costs, add internal observability.

- [ ] Redis cache for high-frequency queries (semantic + sync)
- [ ] Claude/Grok/OpenAI hybrid query routing via LangChain rules
- [ ] Batch nightly sync + embedding (lower cost)
- [ ] Internal AI mentor: alerts for spikes, failed syncs, high costs
- [ ] Cost dashboard (queries/user/API breakdowns)
- [ ] Add disclaimers for seasonal outliers and AI advice boundaries

---

## Phase 5: Tooling Migration (Gemini CLI ��� Advanced AI Ops)

**Goal:** Migrate away from Gemini CLI toward a multi-agent model.

- [ ] Regenerate MYOB sync with Copilot/Claude for benchmarking
- [ ] Update AI routing to support anomaly classification/escalation
- [ ] Switch code completion tools (test accuracy and reliability)

---

## Phase 6: Marketing & Onboarding

**Goal:** Build automated lead gen and guided onboarding.

- [ ] Integrate ScoreApp or equivalent for onboarding quiz funnel
- [ ] Auto-categorise company type post-sync using transaction analysis
- [ ] Store guessed business type in `user_profile`
- [ ] Personalise UI and AI prompts per industry
- [ ] GDPR-compliant consent for analysis
- [ ] Email signup/lead flow via Nodemailer + Scorecard webhook

---

## Scalability Forecast

- PostgreSQL (DigitalOcean Managed): $500–$1000/month (100 users)
- Pinecone (VectorDB): $10–$50/month
- Claude/OpenAI API costs: $100–$300/month (post-routing)
- Redis: $50/month (demo + cache)
- Total Estimated Cost @100 users: ~$1,000–$1,500/month

---

## Instructions for Gemini:

Please act as a senior software engineer specializing in financial data analysis. My goal is for you to help me with code reviews, bug detection, optimization, and explaining complex concepts related to this project.

**When I ask you to "check the code," please focus on:**
- Code quality and adherence to best practices for JavaScript/Python.
- Potential bugs or logical errors.
- Performance bottlenecks.
- Security vulnerabilities (especially related to data handling).
- Readability and maintainability.
- Suggestions for refactoring or improving algorithms.

Frontend





Technologies: HTML5, CSS3, JavaScript (ES6+)



Structure:





index.html: Main dashboard displaying a list of company files and an AI chat interface.



company-file.html: Page to display details of a specific company file.



dashboard.js: Handles fetching company files and all chat functionality.



company-file.js: JavaScript to fetch and display company file details.



Coding Standards:





Use semantic HTML.



Follow BEM methodology for CSS.



Use async/await for asynchronous operations.



Common Issues:





Ensure proper error handling for API calls.



Check for correct DOM element IDs in JavaScript.

Backend





Technologies: Node.js v18.20.6, Express.js, OpenAI



Structure:





server.js: Main server file handling routes, MYOB integration, and the /chat endpoint.



tokenStore.js: Manages MYOB access tokens.



API Integrations:





MYOB API for fetching company files and details.



OpenAI API for the chat functionality.



Uses OAuth 2.0 for authentication.



Security:





Store tokens securely using node-persist.



Implement token refresh logic.

Error Checking





Common Errors:





Token expiration or invalidation.



API rate limit exceeded.



Incorrect file paths or missing files.



Testing:





Use Jest for unit testing backend routes.



Manually test frontend interactions.

Code Generation





Patterns:





Follow RESTful API principles.



Use modular code with clear separation of concerns.



Naming Conventions:





CamelCase for JavaScript variables and functions.



Kebab-case for file names.



Documentation:





Use JSDoc for JavaScript functions.



Comment complex logic in code.

Using Gemini CLI





Debugging:





"Debug the GET request to /company-file/:id"



"Check if the access token is valid before making API calls"



"Why is the AI chat returning an error?"



Code Generation:





"Generate a new HTML template for displaying invoices"



"Create a new Express route for fetching invoice data"



"Analyze the data from the MYOB API and provide insights"

Maintenance





Update this file whenever significant changes are made to the project structure or coding standards.



Ensure that the instructions remain relevant and accurate.

## Debugging Principles

- Never retry schema fixes if the same table/column has already been added.
- Always check for the presence of columns using SELECT * FROM information_schema.columns...
- Do not attempt sync unless all DB migrations are complete and schema is validated.
- Use crash.log ONLY to identify new problems. Do not overwrite fixes without confirmation.



## 📌 Project Name: Cashflow Trends AI

### 🧠 Purpose
Semantic financial analysis tool that syncs MYOB company file data into a PostgreSQL + Pinecone stack, allowing natural language queries about transactions, cashflow, bills, and GST status.

---

## ✅ Current System Overview

### 🗃️ Backend Stack
- Node.js server
- PostgreSQL (via DigitalOcean Managed DB)
- Pinecone Vector DB
- MYOB API Integration
- OpenAI GPT-4 API

### 🖼️ Frontend Stack
- Vanilla JS
- Dashboard page served from server
- AI Assistant input box for natural language query to `/vector-query/:companyId`

---

## 🔁 Sync Pipeline (sync.js)

### Functionality
- Fetches data from MYOB using `myobAdapter.js`
- Inserts into `bills`, `invoices`, `gst_activity`, etc.
- Pushes structured text + metadata to Pinecone with `pushToVectorDB()`

### Expected Metadata in Pinecone Vectors
- `type` (e.g., invoice, bill, payment)
- `amount`
- `status`
- `date`
- `original_text`

---

## 📡 API Endpoints

### POST `/api/sync/:companyId`
Triggers sync of MYOB data for given company file.

### POST `/vector-query/:companyId`
User enters query (e.g. "What are my top expenses?") → GPT turns it into embedding → Pinecone vector similarity → Top K matches returned.

### ⚠️ MISSING: GET `/api/sync/status/:companyId`
> Must be implemented. The Dashboard JS polls this endpoint for real-time sync status.

Proposed implementation (Node.js):
```js
app.get('/api/sync/status/:companyFileId', async (req, res) => {
  const { companyFileId } = req.params;
  try {
    const { rows } = await query('SELECT * FROM sync_progress WHERE company_file_id = $1', [companyFileId]);
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

---

## 🛠️ Known Bugs & Issues

### 1. `initializeChat is not defined`
- JS error in `dashboard.js:145`
- Solution: Either define this dummy function:
```js
function initializeChat() { console.log("Chat placeholder"); }
```
or wire in actual chat module if implemented elsewhere.

### 2. Vector DB empty (Pinecone)
- No embeddings returned until sync works
- Confirm `pushToVectorDB()` is called inside `syncCompany()`

### 3. `company_files` table missing `uri` column
- Already patched in `db.sql`:
```sql
ALTER TABLE company_files ADD COLUMN uri TEXT;
```

---

## ✍️ Gemini Prompt Cheatsheet

### ✅ To fix missing `/sync/status` endpoint:
```
Add a GET route `/api/sync/status/:companyFileId` that queries sync_progress by company_file_id and returns status JSON.
```

### ✅ To fix chat init crash:
```
Ensure initializeChat() is defined before calling it in dashboard.js:145.

Sync Progress Bug � Resolved
Issue:
UI displayed sync status as (0/0) with no progress, even when backend processed records correctly.

Cause:
In lib/sync.js, the final UPDATE sync_progress query did not update processed_items and total_items.
This caused the frontend to see zero values, wiping out any progress visually.

Fix:
Modified the final update to include:

 
processed_items = total_items
This ensures accurate display of sync completion in the UI.

Updated query (in lib/sync.js):

js
 
await query(`
  UPDATE sync_progress 
  SET status = $1, 
      processed_items = total_items, 
      details = CASE WHEN $1 = 'Completed' THEN NULL ELSE details END 
  WHERE company_file_id = $2
`, [overallStatus, companyId]);
Outcome:
UI now reflects correct sync completion values. Issue closed.

---
##  Debugging Protocol

**Problem Summary:**
- **Nginx is dead**: This is the root cause for HTTPS (port 443) connections failing.
- **PM2 is running**: The Node.js application is managed by PM2 and works correctly on port 3000.
- **Debugging Confusion**: Previous debugging attempts created confusion by using `npm` to manage processes instead of `pm2`.

**Operational Rules:**
1.  **Always use PM2**: The Node.js application must be managed with PM2 (`pm2 restart app_name`, `pm2 logs`, etc.).
2.  **Do NOT use npm directly**: Avoid using `npm start` or `npm stop` as it conflicts with the PM2/Nginx setup.
3.  **Check Nginx first**: If the `https://` URL is down, check the Nginx service status (`systemctl status nginx`) before debugging the Node.js application.