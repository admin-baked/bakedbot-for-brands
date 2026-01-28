# Security Alert Explanation: Firebase API Key

## Why This Happened
You received a security alert because **we committed the API key directly to the code**.

1.  **Direct Cause**: The file `src/firebase/config.ts` contains the line `apiKey: "AIzaSyABrA374LHAvS22L1ztSdY0917K4BZjaaU"`.
2.  **Git Tracking**: This file is tracked by git (it is NOT in `.gitignore`), which means when we pushed the fix, the key was written to the repository history.
3.  **GitHub's Role**: GitHub automatically scans all commits for patterns that look like secrets. It saw `AIzaSy...` and correctly identified it as a Google API Key, flagging it as "leaked".

## Is This Dangerous?
**Technically, No.** (But GitHub doesn't know that).

Firebase API Keys for web applications are **Identifiers**, not **Secrets**. They are designed to be public because they must be embedded in your client-side JavaScript for the app to work. Anyone visiting your website can find this key by inspecting the network traffic.

**Crucial Caveat**: This is only safe because we applied **Restrictions** in the previous step:
-   **API Restrictions**: Only allowed to talk to Firebase/Gemini.
-   **Referrer Restrictions**: (Should be set) Only allowed to be used from `bakedbot.ai` domains.

## How to Prevent The Alert (The "Right Way")
To stop these alerts and follow best practices, we should not hardcode the key. Instead:

1.  **Use Environment Variables**:
    Change the code to:
    ```typescript
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    ```
2.  **Local Config**:
    Add `NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSy...` to `.env.local` (which IS ignored).
3.  **Production Config**:
    Add the variable to your hosting dashboard (Firebase App Hosting).

This keeps the key out of the `git` history, silencing GitHub's alarm.

## Remediation Steps for GitHub
Since the key is valid and restricted, you **do not** need to revoke it again if you don't want to break the app immediately. However, to clear the alert properly:
1.  **Mark as "False Positive" or "Used for Tests"**: If GitHub allows, acknowledge that this is a public client key.
2.  **OR Revoke & Rotate (Proper Fix)**:
    *   Implement the Environment Variable fix above FIRST.
    *   Generate Key #11.
    *   Put Key #11 in `.env*` files only.
    *   Deploy.
    *   Revoke Key #10.
