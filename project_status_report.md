# Project Status Report: Cashflow Trends AI

**Date:** July 16, 2025

## 1. Project Overview

**Purpose:** Cashflow Trends AI is a SaaS platform designed to provide semantic financial analysis for businesses. It syncs data from MYOB accounting software into a PostgreSQL and Pinecone vector database stack. This allows users to perform natural language queries about their financial data, including transactions, cash flow, bills, and GST status, to gain actionable insights.

**Core Technologies:**
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL (managed via DigitalOcean), Pinecone (Vector DB)
- **External APIs:** MYOB API (for data syncing), OpenAI API (for AI-powered chat and analysis)
- **Frontend:** Vanilla JavaScript, HTML5, CSS3, with some React components (`SyncLogModal.jsx`, `SyncProgress.jsx`).
- **Process Management:** PM2

## 2. Architecture

### 2.1. Backend
The backend is a Node.js application using the Express.js framework. Key components include:
- **`server.js`**: The main entry point, which sets up the Express server, routes, and middleware.
- **`db.js`**: Manages the connection to the PostgreSQL database.
- **`myobAdapter.js`**: Handles all communication with the MYOB API, including OAuth 2.0 authentication and data fetching.
- **`tokenStore.js`**: Securely stores and refreshes MYOB API access tokens.
- **`sync.js` / `lib/sync.js`**: Contains the core logic for syncing data from MYOB to the local PostgreSQL database and Pinecone.
- **Routes**: The `routes/` directory defines API endpoints for authentication (`auth.js`), company data (`company.js`), chat (`chat.js`), and data synchronization (`sync.js`).

### 2.2. Frontend
The frontend is primarily built with vanilla JavaScript, HTML, and CSS, served directly from the Node.js backend.
- **`public/`**: Contains all frontend assets.
- **`index.html`**: The main dashboard.
- **`dashboard.js`**: Handles fetching company files and chat functionality.
- **`company-dashboard.html` / `company-dashboard.js`**: Displays detailed views of company data.
- **React Components**: The presence of `.jsx` files in `src/components/` suggests a move towards or an integration with React for more complex UI elements, such as the sync progress display.

### 2.3. Data Storage
- **PostgreSQL**: The primary relational database, defined in `db.sql`. It stores structured financial data like company files, invoices, bills, and sync progress. The schema has recently been updated to include an `accounts` table and a `uri` column in the `company_files` table.
- **Pinecone**: A vector database used to store embeddings of financial data for semantic search and natural language queries.
- **`tokenStore/`**: A directory likely used by `node-persist` to store MYOB API tokens on the filesystem.

## 3. Key Features & Functionality

- **MYOB Integration**: Securely connects to a user's MYOB account using OAuth 2.0.
- **Data Synchronization**: A robust sync process that pulls financial data (invoices, bills, etc.) from MYOB and stores it locally. It includes status tracking (`sync_progress` table) and error logging.
- **AI-Powered Chat**: A chat interface that allows users to ask natural language questions about their financial data. This is powered by the OpenAI API and the Pinecone vector database.
- **Dashboard & Reporting**: A web-based interface for viewing company data and sync status.

## 4. Dependencies

The `package.json` file lists the following key dependencies:
- **`express`**: Web server framework.
- **`pg`**: PostgreSQL client.
- **`openai`**: OpenAI API client.
- **`pinecone-client`**: Pinecone API client.
- **`axios`**: HTTP client for making API requests.
- **`body-parser`**, **`cors`**, **`dotenv`**: Standard middleware and configuration tools.
- **`jsonwebtoken`**: For handling JSON Web Tokens.
- **`node-persist`**: For storing API tokens.
- **`react`, `react-dom`**: Indicates the use of React components.
- **`tailwindcss`**: A utility-first CSS framework.

## 5. Deployment and Operations

- **`ecosystem.config.js`**: This PM2 configuration file defines how the application is run. It specifies the main script (`server.js`), the application name (`cashflow-trends-ai`), and that it should be run in cluster mode.
- **Nginx**: The presence of Nginx configuration files (`nginx-auto-restart.conf`, `nginx-failsafe.sh`) and the context from `GEMINI.md` indicates that Nginx is used as a reverse proxy, likely for handling HTTPS and load balancing.
- **Debugging and Maintenance**: The project contains numerous shell scripts (`.sh`) and markdown files (`.md`) that document debugging procedures, setup instructions, and investigation notes. This suggests a complex environment with a history of troubleshooting, particularly around OAuth and API integration.

## 6. Current Status & Recent Activities

Based on the file names and content, the project appears to be in an active development and debugging phase.
- **OAuth and Authentication**: There is a significant focus on fixing and documenting the MYOB OAuth 2.0 flow. Files like `AUTHENTICATION_FIX_BACKUP.md`, `GEMINI_OAUTH_DEBUG.md`, and `fix-redirect-uri.sh` point to recent challenges in this area.
- **Database Schema**: The schema has been recently modified (`db_add_accounts.sql`) to expand the data model.
- **Sync Logic**: The sync process is a core feature that is being actively developed and refined. The `GEMINI.md` file notes a bug fix related to updating the `sync_progress` table.
- **Frontend Development**: The introduction of React and Tailwind CSS suggests that the frontend is being modernized.
- **Known Issues**: The `GEMINI.md` file explicitly lists known bugs, such as `initializeChat is not defined` in `dashboard.js` and an empty Pinecone database before the first sync.

## 7. Potential Next Steps & Known Issues

### 7.1. Immediate Actions
1.  **Fix Known Bugs**:
    - Address the `initializeChat is not defined` error in `public/dashboard.js`.
    - Implement the missing `GET /api/sync/status/:companyFileId` endpoint as proposed in `GEMINI.md`.
2.  **Complete Frontend Integration**: Continue the integration of React components and ensure a consistent frontend experience.
3.  **Stabilize OAuth Flow**: Given the amount of documentation and debugging scripts, ensure the MYOB OAuth flow is robust and well-tested.

### 7.2. Strategic Development (from `GEMINI.md`)
- **Deepen Financial Data Scope**: Sync the Chart of Accounts, P&L statements, and Balance Sheets.
- **Enhance AI Advisor**: Improve the semantic query engine with more advanced prompt engineering and a wider range of financial data.
- **Cost Optimization**: Implement caching strategies (Redis) and hybrid AI model routing to reduce API costs.
- **Marketing & Onboarding**: Develop automated lead generation and a guided onboarding process.

### 7.3. Technical Debt & Refactoring
- **Consolidate JavaScript Files**: There appear to be duplicate or similar files in the `public/` directory and the root directory (e.g., `db.js`, `server.js`). These should be cleaned up to avoid confusion.
- **Environment Variables**: A `find_myob_vars.sh` script and a `.env.backup` file suggest that environment variable management could be improved. Ensure all secrets are handled securely and consistently.
- **Documentation**: While there is a lot of documentation, it is spread across many files. Consolidating this into a more structured format would be beneficial.
