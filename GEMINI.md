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

## Strategic Development Plan

This plan outlines the architectural evolution from a simple proof-of-concept to a robust, data-centric platform.

### Phase 1: Implement a Local Data Cache & Background Sync
-   **Goal:** Decouple the user experience from slow, on-demand API calls to MYOB. Create a scalable foundation for data analysis.
-   **Key Steps:**
    1.  **Introduce a PostgreSQL Database:** Store a local copy of MYOB data (invoices, bills, etc.).
    2.  **Asynchronous Syncing:** Create a background job to perform the initial, full data sync from MYOB when a user connects a company file.
    3.  **Responsive UI:** Update the frontend to provide immediate feedback (e.g., "Syncing data...") and load instantly by querying the local database.
    4.  **Ongoing Sync:** Implement a mechanism (webhooks or periodic polling) to keep the local database fresh.
-   **Benefit:** A fast, responsive application and a stable data source for the AI.

### Phase 2: Deepen the Financial Data Scope
-   **Goal:** Move beyond basic invoices and bills to enable true financial analysis.
-   **Key Steps:**
    1.  Expand the data sync to include:
        -   Chart of Accounts
        -   Profit & Loss Statements
        -   Balance Sheets
        -   Customer & Supplier Data
-   **Benefit:** Provide the AI with the necessary context to generate strategic insights.

### Phase 3: Evolve the AI from "Chatbot" to "Strategic Advisor"
-   **Goal:** Transform the AI from a simple Q&A tool into a proactive financial advisor.
-   **Key Steps:**
    1.  **Engineer Sophisticated Prompts:** Feed the AI summarized, structured data from our local database (P&L trends, cash flow summaries, key metrics).
    2.  **Enable Complex Queries:** Allow the AI to answer strategic questions about profitability, forecasting, and customer behavior.
-   **Benefit:** Deliver on the core value proposition of the product: actionable, AI-driven business insights.

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