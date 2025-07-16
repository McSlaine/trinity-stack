# MYOB OAuth Authentication Issue - Investigation Report & Solution

## 1. Root Cause Analysis

The core issue is a **stale user consent** tied to the old MYOB application.

Even though the application is correctly using the **NEW** Client ID (`Cashflow Trends AI II`), MYOB's authentication system detects that the user (`Erik@hit-equipment.com.au`) has previously granted consent to the **OLD** application (`Cashflow Trends AI`).

Because of this existing consent, MYOB's system ignores the new app's configuration and defaults to the settings of the originally authorized application, which includes its old redirect URI (`http://170.64.187.70/callback`). This is why the wrong redirect is occurring.

The `ory_ac_` prefixed codes are not an error; they are part of MYOB's modern authentication backend (Ory) and are not the cause of the problem.

## 2. The Solution: Revoke Stale App Consent

The user must manually revoke access for the old application within their MYOB account. This will clear the stale consent and force the OAuth flow to use the configuration of the new application on the next login attempt.

### Action Plan for the User (Erik):

1.  **Log in** to your MYOB account.
2.  Navigate to the settings area for managing third-party applications. This is typically found under **"My Account" > "Manage connected apps"** or a similar section.
3.  Locate the old application, which will likely be named **"Cashflow Trends AI"**.
4.  Select the option to **Revoke**, **Disconnect**, or **Remove** its access.
5.  Once access has been revoked, return to the Cashflow Trends AI application and try the "Login with MYOB" flow again.

The system should now correctly redirect to `https://cashflowtrends.ai/auth/callback` and the authentication will proceed as expected.

## 3. Answers to Original Questions

1.  **Why is MYOB redirecting to the OLD app's redirect URI?**
    -   Because of a stale consent grant for the old application in the user's MYOB account.

2.  **What are these Ory authorization codes?**
    -   They are standard authorization codes from MYOB's current identity provider, Ory. They are not the problem.

3.  **Is there a cache or session issue?**
    -   The issue is on MYOB's side, related to the user's consent history, not a local cache or session problem.

4.  **Is MYOB's OAuth implementation using Ory?**
    -   Yes, and this is normal. No special handling is required for the `ory_ac_` codes.

5.  **Are we missing a parameter?**
    -   No, the OAuth URL is constructed correctly. The issue is with the user's account state in MYOB.

## 4. Best Practices for MYOB OAuth

The current implementation in `routes/auth.js` is generally correct. The key is ensuring that user consent is granted to the correct application ID. When migrating between app registrations in the future, always ensure users re-consent to the new application after revoking the old one.