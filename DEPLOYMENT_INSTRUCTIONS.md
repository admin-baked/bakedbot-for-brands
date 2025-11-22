# Deployment Instructions for Firebase App Hosting

This document provides the final, critical steps required to securely configure and deploy this application on Firebase App Hosting.

## Background

The application's server-side logic and security features require secret keys that cannot be stored directly in the code. These include:

1.  `FIREBASE_SERVICE_ACCOUNT_KEY`: Credentials for the Firebase Admin SDK to communicate with your Firebase project securely.
2.  `SENDGRID_API_KEY`: The API key for the SendGrid service to send order confirmation emails.
3.  `RECAPTCHA_SECRET_KEY`: The **secret** key for reCAPTCHA v3, used by Firebase App Check to verify requests.
4.  `CANNMENUS_API_KEY`: The API key for the CannMenus service to fetch product and retailer data.
5.  `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`: The **public site key** for reCAPTCHA v3, required by the client-side code.

The `apphosting.yaml` file has been configured to use the secrets. Your final task is to create these secrets and environment variables in Google Cloud so that App Hosting can access them during runtime.

---

## Step 1: Create the `FIREBASE_SERVICE_ACCOUNT_KEY` Secret

This secret contains the JSON key for a service account, encoded in Base64.

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

## Step 2: Create the `SENDGRID_API_KEY` Secret

1.  Navigate to the Google Cloud Console for your project.
2.  Go to **Security > Secret Manager**.
3.  Click **CREATE SECRET**.
4.  **Name:** `SENDGRID_API_KEY`
5.  **Secret value:** Paste your new, rotated SendGrid API key.
6.  Leave replication policy as "Automatic".
7.  Click **CREATE SECRET**.

---

## Step 3: Create the `CANNMENUS_API_KEY` Secret

1.  Navigate to the Google Cloud Console for your project.
2.  Go to **Security > Secret Manager**.
3.  Click **CREATE SECRET**.
4.  **Name:** `CANNMENUS_API_KEY`
5.  **Secret value:** Paste your CannMenus API key.
6.  Leave replication policy as "Automatic".
7.  Click **CREATE SECRET**.

---

## Step 4: Configure App Check (reCAPTCHA v3)

This step is vital for backend security and involves two parts: a **Secret Key** for the backend and a **Site Key** for the frontend.

### A. Get Your reCAPTCHA v3 Keys

1.  Go to the [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create).
2.  **Label:** Give it a recognizable name (e.g., "BakedBot App Check").
3.  **reCAPTCHA type:** Select **reCAPTCHA v3**.
4.  **Domains:** Add the domain of your deployed Firebase App Hosting backend (e.g., `your-app-name.web.app`).
5.  Accept the terms and submit.
6.  You will be given a **Site Key** (public) and a **Secret Key**. You need both.

### B. Create the `RECAPTCHA_SECRET_KEY` Secret

1.  Navigate to the Google Cloud Console for your project.
2.  Go to **Security > Secret Manager**.
3.  Click **CREATE SECRET**.
4.  **Name:** `RECAPTCHA_SECRET_KEY`
5.  **Secret value:** Paste the **Secret Key** you just obtained.
6.  Leave replication policy as "Automatic".
7.  Click **CREATE SECRET**.

### C. Set the `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` Environment Variable

The public **Site Key** must be set as a standard environment variable in your App Hosting backend configuration.

1.  Navigate to your **Firebase project**.
2.  Go to **Build > App Hosting**.
3.  Select your backend.
4.  Go to the **Settings** tab.
5.  Under **Environment variables**, click **Add variable**.
6.  **Variable:** `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
7.  **Value:** Paste the **Site Key** you obtained from the reCAPTCHA admin console.
8.  Save your changes.

---

## Step 5: (Optional) Set Up App Check Debug Token for Development

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

## Step 6: Deploy the Application

Once all secrets and the environment variable are configured, you can deploy the application.

The `apphosting.yaml` file will automatically instruct Firebase App Hosting to find these secrets by name and securely inject them, while the Next.js runtime will pick up the public environment variable. Your backend is now protected by App Check.
