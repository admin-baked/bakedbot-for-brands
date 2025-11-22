# Deployment Instructions for Firebase App Hosting

This document provides the final, critical steps required to securely configure and deploy this application on Firebase App Hosting.

## Background

The application's server-side logic and security features require secret keys that cannot be stored directly in the code. These include:

1.  `FIREBASE_SERVICE_ACCOUNT_KEY`: **(Required)** Credentials for the Firebase Admin SDK to communicate with your Firebase project securely. This is necessary for features like the "Dev Login" to work.
2.  `SENDGRID_API_KEY`: The API key for the SendGrid service to send order confirmation emails.
3.  `RECAPTCHA_SECRET_KEY`: The **secret** key for reCAPTCHA v3, used by Firebase App Check to verify requests.
4.  `CANNMENUS_API_KEY`: The API key for the CannMenus service to fetch product and retailer data.
5.  `AUTHNET_API_LOGIN_ID`: The API Login ID for Authorize.Net.
6.  `AUTHNET_TRANSACTION_KEY`: The Transaction Key for Authorize.Net.
7.  `NEXT_PUBLIC_AUTHNET_CLIENT_KEY`: The public client key for Authorize.Net Accept.js.
8.  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: The **public site key** for reCAPTCHA v3, required by the client-side code.


The `apphosting.yaml` file has been configured to use these secrets. Your final task is to create them in Google Cloud so that App Hosting can access them during runtime.

---

## Step 1: Create the `FIREBASE_SERVICE_ACCOUNT_KEY` Secret

This secret contains the JSON key for a service account, encoded in Base64. **This is mandatory for the backend to initialize correctly.**

### A. Get the Service Account JSON Key

1.  Navigate to the Google Cloud Console for your project.
2.  Go to **IAM & Admin > Service Accounts**.
3.  Find the service account named **`firebase-adminsdk-fbsvc@...`**.
4.  Click the three-dots menu (`⋮`) under **Actions** and select **Manage keys**.
5.  Click **ADD KEY > Create new key**.
6.  Select **JSON** as the key type and click **CREATE**. A JSON file will be downloaded to your computer.

### B. Base64 Encode the JSON Key

You must convert the multi-line JSON file into a single-line Base64 string.

*   **On macOS/Linux:**
    Open a terminal and run this command, replacing `path/to/your/key.json` with the actual path to the downloaded file:
    ```bash
    base64 -w0 path/to/your/key.json
    ```

*   **On Windows (PowerShell):**
    Open PowerShell and run this command, replacing `path/to/your/key.json` with the actual path:
    ```powershell
    [Convert]::ToBase64String([IO.File]::ReadAllBytes("path/to/your/key.json"))
    ```
    
**Copy the resulting single-line string.** It will be very long.

### C. Create the Secret in Secret Manager

1.  Navigate to the Google Cloud Console for your project.
2.  Go to **Security > Secret Manager**.
3.  Click **CREATE SECRET**.
4.  **Name:** `FIREBASE_SERVICE_ACCOUNT_KEY`
5.  **Secret value:** Paste the entire Base64-encoded string you copied.
6.  Leave replication policy as "Automatic".
7.  Click **CREATE SECRET**.

---

## Step 2: Create Other Required Secrets

Follow the "Create the Secret in Secret Manager" steps from above for each of the following secrets.

| Secret Name                         | Value Description                                     |
| ----------------------------------- | ----------------------------------------------------- |
| `SENDGRID_API_KEY`                  | Your new, rotated SendGrid API key.                   |
| `CANNMENUS_API_KEY`                 | Your CannMenus API key.                               |
| `AUTHNET_API_LOGIN_ID`              | Your Authorize.Net API Login ID.                      |
| `AUTHNET_TRANSACTION_KEY`           | Your Authorize.Net Transaction Key.                   |
| `NEXT_PUBLIC_AUTHNET_CLIENT_KEY`    | Your Authorize.Net public client key for Accept.js.   |

---

## Step 3: Configure App Check (reCAPTCHA v3)

This step is vital for backend security and involves two parts: a **Secret Key** for the backend and a **Site Key** for the frontend.

### A. Get Your reCAPTCHA v3 Keys

1.  Go to the [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create).
2.  **Label:** Give it a recognizable name (e.g., "BakedBot App Check").
3.  **reCAPTCHA type:** Select **reCAPTCHA v3**.
4.  **Domains:** Add the domain of your deployed Firebase App Hosting backend (e.g., `your-app-name.web.app`).
5.  Accept the terms and submit.
6.  You will be given a **Site Key** (public) and a **Secret Key**. You need both.

### B. Create the reCAPTCHA Secrets

1.  Navigate to **Security > Secret Manager** in the Google Cloud Console.
2.  Click **CREATE SECRET**.
3.  **Name:** `RECAPTCHA_SECRET_KEY`
4.  **Secret value:** Paste the **Secret Key** you just obtained.
5.  Click **CREATE SECRET**.
6.  Repeat the process to create another secret:
7.  **Name:** `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
8.  **Secret value:** Paste the **Site Key** you obtained.
9.  Click **CREATE SECRET**.

---

## Step 4: (Optional) Set Up App Check Debug Token for Development

If you are running the app in a local development environment or a preview environment like Firebase Studio, App Check will block requests because the domain (`localhost` or a temporary URL) is not on your reCAPTCHA allowed list. To fix this:

1.  Run the app in your development environment.
2.  Open the browser's developer console. You will see a message like: `App Check debug token: <A-LONG-TOKEN-STRING>`.
3.  Copy that entire token string.
4.  Go to your **Firebase Console → Build → App Check**.
5.  Select the **Web app**.
6.  Click the three-dots menu (`⋮`) and choose **Manage debug tokens**.
7.  Click **Add debug token** and paste the token you copied.

This tells App Check to trust requests coming from your specific browser, allowing you to test authentication and other Firebase features without disabling enforcement.

---

## Step 5: Deploy the Application

Once all secrets are configured, you can deploy the application.

The `apphosting.yaml` file will automatically instruct Firebase App Hosting to find these secrets by name and securely inject them into the runtime environment. Your backend is now protected by App Check.
