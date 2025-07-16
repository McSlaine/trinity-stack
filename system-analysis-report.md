# Cashflow Trends AI: System Analysis Report

## 1. Codebase Exploration

### 1.1. File Structure & Key Components

*   **`server.js`**: The main entry point of the application. It initializes the Express server, database connection, vector services, and middleware.
*   **`package.json`**: Defines project dependencies, scripts, and metadata.
*   **`.env`**: Contains environment variables for database connections, API keys, and other configurations.
*   **`routes/`**: This directory contains the API endpoint definitions.
    *   `advisory.js`: Implements a multi-agent AI advisory service using Claude, Grok, and GPT-4.
    *   `auth.js`: Handles user authentication with MYOB, including the OAuth 2.0 flow.
    *   `chat.js`: Provides a chat interface powered by OpenAI's GPT-4.
    *   `company.js`: Manages company file data, including fetching details and dashboard summaries.
    *   `companyFiles.js`: Fetches a list of company files from MYOB.
    *   `debug.js`: Contains endpoints for debugging purposes, such as checking database records and logs.
    *   `query.js`: Handles vector-based queries using Pinecone.
    *   `sync.js`: Manages data synchronization between MYOB and the local database.
*   **`lib/`**: Contains core application logic.
    *   `myob.js`: A library for interacting with the MYOB API.
    *   `sync.js`: Implements the data synchronization logic.
    *   `errors.js`: Defines custom error classes.
*   **`middleware/`**: Contains Express middleware.
    *   `auth.js`: Authentication middleware.
    *   `errorHandler.js`: A centralized error handler.
    *   `sessionAuth.js`: Session-based authentication middleware.
*   **`db.js`**: Manages the PostgreSQL database connection.
*   **`db.sql`**: The database schema file.
*   **`vector.js`**: Handles interactions with the Pinecone vector database.
*   **`tokenStore.js`**: Manages MYOB access tokens.
*   **`public/`**: Contains static assets, including HTML, CSS, and client-side JavaScript files.

### 1.2. Data Flow

The application follows this general data flow:

1.  **User Authentication**: The user authenticates with their MYOB account via OAuth 2.0.
2.  **Data Synchronization**: The application syncs financial data (invoices, bills, etc.) from MYOB to the local PostgreSQL database.
3.  **Vectorization**: The synced data is then vectorized and stored in Pinecone for semantic search.
4.  **AI Analysis**: The user can interact with the AI chat, which uses the vectorized data to provide financial insights.

### 1.3. API Endpoints

| Method | Endpoint                        | Description                                                                                             |
| :----- | :------------------------------ | :------------------------------------------------------------------------------------------------------ |
| POST   | `/api/ai/advisory`              | Triggers a multi-agent AI evaluation of a user's query.                                                 |
| GET    | `/auth/login`                   | Displays the login page.                                                                                |
| GET    | `/auth/myob`                    | Redirects the user to MYOB for authentication.                                                          |
| GET    | `/auth/callback`                | Handles the OAuth 2.0 callback from MYOB.                                                               |
| POST   | `/auth/select-company`          | Selects a company file to use for the session.                                                          |
| POST   | `/api/chat`                     | Sends a message to the AI chat.                                                                         |
| GET    | `/api/company/files`            | Fetches a list of company files from MYOB.                                                              |
| GET    | `/api/company/:id`              | Fetches details for a specific company file.                                                            |
| GET    | `/api/company/:id/dashboard-summary` | Fetches a dashboard summary for a company file.                                                      |
| POST   | `/api/sync/:companyFileId`      | Initiates data synchronization for a company file.                                                      |
| GET    | `/api/sync/status/:companyFileId` | Fetches the sync status for a company file.                                                             |
| GET    | `/api/sync/log/:companyFileId`  | Fetches the sync log for a company file.                                                                |
| POST   | `/api/query`                    | Performs a vector-based query.                                                                          |
| DELETE | `/api/query/clear`              | Clears the Pinecone index.                                                                              |

## 2. Architecture Understanding

### 2.1. OAuth Flow

The OAuth flow is implemented in `routes/auth.js`. It uses the `express-session` and `connect-redis` libraries to manage user sessions. The flow is as follows:

1.  The user is redirected to the MYOB authentication URL.
2.  After successful authentication, MYOB redirects the user back to the application's callback URL.
3.  The application exchanges the authorization code for an access token and stores it in the `tokenStore`.
4.  The user's session is updated to indicate that they are authenticated.

### 2.2. Financial Data Sync

The data synchronization process is handled by `routes/sync.js` and `lib/sync.js`. It fetches financial data from MYOB and stores it in the local PostgreSQL database. The `myobAdapter.js` file provides a convenient interface for interacting with the MYOB API.

### 2.3. Vector Database Integration

The application uses Pinecone for vector storage and semantic search. The `vector.js` file contains the logic for creating, updating, and querying the Pinecone index.

### 2.4. AI Chat Implementation

The AI chat is implemented in `routes/chat.js`. It uses OpenAI's GPT-4 to generate responses to user queries. The chat context is enriched with financial data from the local database to provide more accurate and relevant answers.

### 2.5. Multi-Agent AI System

The `routes/advisory.js` file implements a multi-agent AI system that uses Claude, Grok, and GPT-4 to provide financial advice. This approach allows for a more comprehensive and robust analysis of user queries.

### 2.6. Redis Caching

Redis is used for session storage via `connect-redis`. There is no other explicit caching implementation found in the codebase.

## 3. Testing Analysis

### 3.1. Existing Tests

The `package.json` file contains a placeholder test script: `"test": "echo \"Error: no test specified\" && exit 1"`. There are no actual test files in the project.

### 3.2. Missing Tests

The following tests are missing and should be implemented:

*   Unit tests for all API endpoints.
*   Integration tests for the data synchronization process.
*   Tests for the AI chat and multi-agent advisory system.
*   Tests for the OAuth flow.

### 3.3. Testing Recommendations

*   Use a testing framework like Jest or Mocha to write and run tests.
*   Implement a continuous integration (CI) pipeline to automatically run tests on every commit.
*   Use a code coverage tool to measure the effectiveness of the tests.

## 4. Discovered Issues

### 4.1. Known Issues

*   **Broken OAuth Flow**: The OAuth flow is currently broken due to invalid MYOB credentials.

### 4.2. New Issues

*   **Missing Tests**: The lack of tests makes it difficult to ensure the quality and reliability of the application.
*   **Inconsistent Error Handling**: The error handling is not consistent across the application. Some routes use custom error classes, while others do not.
*   **Lack of Input Validation**: There is no input validation on some of the API endpoints, which could lead to security vulnerabilities.
*   **No Logging**: There is no logging implemented in the application, which makes it difficult to debug issues.

## 5. Security Concerns

*   **No Input Validation**: The lack of input validation could expose the application to common web vulnerabilities, such as Cross-Site Scripting (XSS) and SQL injection.
*   **Insecure Session Management**: The session secret is hardcoded in `server.js`, which is a security risk. It should be stored in an environment variable.
*   **No Rate Limiting**: There is no rate limiting on the API endpoints, which could make the application vulnerable to denial-of-service (DoS) attacks.

## 6. Documentation Review

### 6.1. Existing Documentation

*   **`GEMINI.md`**: Contains a high-level overview of the project, including its goals, features, and technologies.
*   **`CURRENT_STATE_README.md`**: Provides an overview of the current state of the system.

### 6.2. Missing Documentation

*   **API Documentation**: There is no detailed documentation for the API endpoints.
*   **Setup and Deployment Guide**: There is no guide on how to set up and deploy the application.
*   **Developer Guide**: There is no guide for developers who want to contribute to the project.

## 7. Recommendations

*   **Fix the OAuth flow**: This is the highest priority issue and needs to be addressed before the application can be used.
*   **Implement a comprehensive testing suite**: This will help to ensure the quality and reliability of the application.
*   **Improve error handling**: The error handling should be consistent across the application.
*   **Add input validation**: This will help to prevent security vulnerabilities.
*   **Implement logging**: This will make it easier to debug issues.
*   **Improve security**: The session secret should be stored in an environment variable, and rate limiting should be implemented on the API endpoints.
*   **Add documentation**: The API, setup, and deployment should be documented.
