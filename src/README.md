# BakedBot AI: The Agentic Commerce OS for Cannabis

Welcome to the BakedBot AI platform! This document provides a comprehensive overview of the product vision, architecture, and technical stack to help new engineers get up and running quickly.

---

## 1. North Star: What is BakedBot?

BakedBot is an **Agentic Commerce Operating System** designed specifically for the cannabis industry. It's a single platform where brands and dispensaries can deploy and manage a workforce of specialized AI agents to automate marketing, manage pricing, streamline operations, and own the customer relationship from discovery to purchase.

Our core mission is to **keep the customer in the brand's funnel**. We provide the tools for brands to create a rich, intelligent, and compliant shopping experience on their own digital properties, while still routing orders to their retail partners for fulfillment.

The platform is designed as a hybrid of **Chat + UI**. Operators can use natural language to express complex ideas ("_Watch my top 3 competitors in Chicago and alert me when they undercut my price on 1g vapes_") and use a clean UI for precision tasks like managing products or reviewing analytics.

---

## 2. Core Features & Personas

The system is built around a cast of specialized AI agents, each with a distinct role:

-   **Smokey (The AI Budtender)**: The customer-facing agent that provides intelligent, semantic product recommendations using a Retrieval-Augmented Generation (RAG) pipeline.
-   **Craig (The Marketer)**: Handles marketing automation, such as drafting and sending welcome email series to new subscribers.
-   **Pops (The Accountant)**: The analytics agent that tracks all business events (sessions, checkouts, revenue) and aggregates them into actionable dashboards.
-   **Ezal (The Lookout)**: The competitive intelligence agent that monitors competitor pricing and menu changes.
-   **Deebo (The Enforcer)**: The compliance agent responsible for ensuring all outbound communications and promotions adhere to the complex, state-by-state rules of the cannabis industry.
-   **Money Mike (The Banker)**: Manages billing, subscriptions, and payment processing integrations.
-   **Mrs. Parker (The Hostess)**: Manages customer loyalty, tracking points, tiers, and triggering retention campaigns.

These agents are orchestrated through two primary interfaces in the **Smokey Control Center**:

1.  **Agentic Chat**: An "inbox" where operators converse with their AI workforce to delegate tasks.
2.  **Playbooks**: A library of pre-built and custom automations (e.g., "abandoned cart saver," "competitor price watch") that can be toggled on or off.

---

## 3. Architecture & Tech Stack

The application is a modern, full-stack TypeScript monorepo built on Next.js and Firebase.

### Frontend
-   **Framework**: **Next.js 14** (using the App Router).
-   **Language**: **TypeScript**.
-   **UI Library**: **React**.
-   **Styling**: **Tailwind CSS** for utility-first styling.
-   **Component Library**: **ShadCN UI**, which is built upon Radix UI for accessible, unstyled primitives.
-   **State Management**: **Zustand** (with `persist` middleware) for lightweight global state (cart, UI preferences).
-   **Forms**: **React Hook Form** with **Zod** for schema validation.
-   **Data Visualization**: **Recharts** for rendering analytics charts.

### Backend & Platform
-   **Platform**: **Firebase**.
    -   **Hosting**: **Firebase App Hosting** for deploying the Next.js application.
    -   **Authentication**: **Firebase Authentication** for managing Brand, Dispensary, and Customer users. It uses a combination of Email/Password, Google Sign-In, and Custom Tokens (for Dev Login). Role-based access control (RBAC) is implemented via Firebase Custom Claims.
    -   **Database**: **Firestore** (in Native mode) serves as our primary database for all application data, including products, orders, users, and agent-related documents.
    -   **Security**: Firestore Security Rules are used to enforce data access policies. **Firebase App Check** with reCAPTCHA v3 is used to protect backend resources from unauthorized clients.
-   **Server-Side Logic**: Implemented using **Next.js Server Actions** and API Routes.

### Generative AI
-   **AI Framework**: **Genkit**, a Google-native, open-source framework for building production-ready AI applications.
-   **AI Models**: We leverage **Google AI** models through the `@genkit-ai/google-genai` plugin.
    -   **LLMs**: **Gemini 2.5 Flash** for most chat and reasoning tasks due to its excellent balance of performance and cost.
    -   **Embeddings**: **`text-embedding-004`** for generating vector embeddings for our RAG pipeline.
    -   **Image Generation**: **`gemini-2.5-flash-image-preview`** for creating social media marketing assets.

### Event-Driven Architecture
-   **Event Spine**: The core of our agentic system is an event-driven pipeline built on Firestore. System events (e.g., `checkout.paid`, `reach.entry`) are written to an `events` collection.
-   **Agents**: Each AI agent is a server-side module that processes relevant events from the spine. The system is designed to be **idempotent**, tracking which events each agent has processed to prevent duplicate work.
-   **Dead-Letter Queue**: A crucial feature for robustness. If an agent fails to process an event, it's moved to an `events_failed` collection for later inspection and retry, ensuring no data is lost and the main pipeline is never blocked.

### Testing & Tooling
-   **End-to-End Testing**: **Playwright** is used for all browser-based E2E tests.
-   **Unit & Integration Testing**: **Jest** and **React Testing Library** are configured for component and utility testing.
-   **Linting & Formatting**: ESLint and Prettier (integrated into Tailwind config).

---

## 4. Getting Started

1.  **Clone the repository.**
2.  **Install dependencies**: `npm install`
3.  **Set up Firebase**: Ensure you have a Firebase project and have configured it according to `DEPLOYMENT_INSTRUCTIONS.md`. This includes setting up secrets like `BAKEDBOT_SERVICE_ACCOUNT_KEY` and `RECAPTCHA_SECRET_KEY`.
4.  **Run the development server**: `npm run dev`
5.  **Access the application**: Open `http://localhost:3001` in your browser.
6.  **Log In**: Use the **Dev Login** button on any login page (`/brand-login`, `/dispensary-login`) to impersonate different user personas and test role-based features.

This setup provides a complete local development environment with access to all features of the BakedBot AI platform.
