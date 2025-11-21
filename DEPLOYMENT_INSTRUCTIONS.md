# Deployment Instructions for Firebase App Hosting

This document provides the final, critical steps required to securely configure and deploy this application on Firebase App Hosting.

## Background

The application's server-side logic and security features require secret keys that cannot be stored directly in the code. These include:

1.  `FIREBASE_SERVICE_ACCOUNT_KEY`: Credentials for the Firebase Admin SDK to communicate with your Firebase project securely.
2.  `SENDGRID_API_KEY`: The API key for the SendGrid service to send order confirmation emails.
3.  `RECAPTCHA_SITE_KEY`: The **secret** key for reCAPTCHA v3, used by Firebase App Check to verify requests.
4.  `CANNMENUS_API_KEY`: The API key for the CannMenus service to fetch product and retailer data.

The `apphosting.yaml` file has been configured to use these keys by referencing them as secrets. Your final task is to create these secrets in Google Cloud Secret Manager so that App Hosting can access them during runtime.

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
5.  **Secret value:** Paste your CannMenus API key (`e13ed642...`).
6.  Leave replication policy as "Automatic".
7.  Click **CREATE SECRET**.

---

## Step 4: Create the `RECAPTCHA_SITE_KEY` Secret for App Check

This step is vital for backend security.

### A. Get Your reCAPTCHA v3 Keys

1.  Go to the [reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin/create).
2.  **Label:** Give it a recognizable name (e.g., "BakedBot App Check").
3.  **reCAPTCHA type:** Select **reCAPTCHA v3**.
4.  **Domains:** Add the domain of your deployed Firebase App Hosting backend (e.g., `your-app-name.web.app`).
5.  Accept the terms and submit.
6.  You will be given a **Site Key** and a **Secret Key**. You need the **Secret Key** for this step.

### B. Create the Secret in Secret Manager

1.  Navigate to the Google Cloud Console for your project.
2.  Go to **Security > Secret Manager**.
3.  Click **CREATE SECRET**.
4.  **Name:** `RECAPTCHA_SITE_KEY`
5.  **Secret value:** Paste the **Secret Key** you just obtained from the reCAPTCHA admin console.
6.  Leave replication policy as "Automatic".
7.  Click **CREATE SECRET**.

---

## Step 5: Deploy the Application

Once all four secrets (`FIREBASE_SERVICE_ACCOUNT_KEY`, `SENDGRID_API_KEY`, `CANNMENUS_API_KEY`, and `RECAPTCHA_SITE_KEY`) are created in Secret Manager, you can deploy the application.

The `apphosting.yaml` file will automatically instruct Firebase App Hosting to find these secrets by name and securely inject them as environment variables into your application's runtime. Your backend is now protected by App Check.
