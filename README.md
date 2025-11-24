# BakedBot AI: The Agentic Commerce OS for Cannabis

BakedBot is an **Agentic Commerce Operating System** designed specifically for the cannabis industry. It's a single platform where brands and dispensaries can deploy and manage a workforce of specialized AI agents to automate marketing, manage pricing, streamline operations, and own the customer relationship from discovery to purchase.

This project is built on a Next.js 14, Firebase, and Genkit multi-agent stack featuring agents like Smokey, Craig, Pops, Ezal, and Deebo.

---

## 2. Quick Start

To get the project running locally, follow these steps:

```bash
# 1. Clone the repository
git clone https://github.com/your-repo/bakedbot.git
cd bakedbot

# 2. Install dependencies
npm install

# 3. Set up environment variables
# Copy the example and fill in your Firebase Web SDK keys.
# Note: Server-side keys are handled by the environment.
cp .env.example .env.local

# 4. Run the development server
npm run dev
```

The application will be available at `http://localhost:3001`.

---

## 3. Environment Variables

This application requires the following environment variables, typically stored in `.env.local` for local development.

-   `NEXT_PUBLIC_FIREBASE_PROJECT_ID`: Your Firebase project ID.
-   `NEXT_PUBLIC_FIREBASE_APP_ID`: Your Firebase web app ID.
-   `NEXT_PUBLIC_FIREBASE_API_KEY`: Your Firebase web app API key.
-   `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`: Your Firebase project's auth domain.
-   `GEMINI_API_KEY`: Your API key for Google AI Studio (for Genkit).

For server-side operations (especially when deployed), the environment must also provide:
-   `FIREBASE_SERVICE_ACCOUNT_KEY`: The JSON service account key. For Firebase App Hosting, this is configured as a secret.

---

## 4. App Structure

The project uses the `src` directory to organize all application code.

-   **`src/app/`**: **Canonical App Router Root**. All Next.js routes, pages, and layouts live here. **Do not** add a top-level `app/` directory.
-   **`src/components/`**: Shared React components.
-   **`src/firebase/`**: Client and server Firebase helpers, including initialization and custom hooks.
-   **`src/server/`**: Server-only logic, including agent definitions, repositories, and authentication utilities.
-   **`src/ai/`**: Genkit flows that define the core logic for our AI agents.

---

## 5. Key Scripts

-   `npm run dev`: Starts the Next.js development server.
-   `npm run build`: Creates a production-ready build of the application. This is used by Firebase App Hosting.
-   `npm test:e2e`: Runs the Playwright end-to-end test suite.
-   `npx tsc --noEmit`: Performs a static type-check of the project without generating JavaScript files.

---

## 6. Deployment

This application is configured for deployment on **Firebase App Hosting**.

-   The backend is defined in `apphosting.yaml`.
-   Server-side secrets (e.g., `FIREBASE_SERVICE_ACCOUNT_KEY`, `GEMINI_API_KEY`) must be configured in **Google Cloud Secret Manager**. See `DEPLOYMENT_INSTRUCTIONS.md` for a detailed guide.
