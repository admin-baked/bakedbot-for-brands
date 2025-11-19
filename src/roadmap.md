# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

---

## 🚀 Roadmap to Version 2.0

This roadmap outlines the path to a robust, feature-complete "2.0" version of the application. The primary goals are to complete technical hardening and build out the core functionality for our dispensary partners.

### Phase 1: Polish & Pre-Launch Hardening

This phase focuses on addressing remaining technical debt and ensuring the application is clean, maintainable, and ready for production scaling.

1.  **Consolidate Authorization Logic**:
    *   **Goal**: Ensure all server actions use a single, consistent method for authentication and authorization.
    *   **Action**: Refactor all remaining server actions to use the new `requireUser` utility, removing duplicated session-checking logic.

2.  **Optimize Client Bundle**:
    *   **Goal**: Reduce the initial JavaScript bundle size for a faster end-user experience.
    *   **Action**: Move all static demo data (`demoProducts`, `demoRetailers`, etc.) from `src/lib/data.ts` to server-only modules that are not included in the client build.

3.  **Unify Marketing Assets**:
    *   **Goal**: Maintain a single source of truth for all marketing and placeholder images.
    *   **Action**: Move the hardcoded hero image path from `src/app/page.tsx` into the `src/lib/placeholder-images.json` configuration file.

4.  **Finalize AI Engine Hardening**:
    *   **Goal**: Make the AI recommendation engine's failure states transparent and user-friendly.
    *   **Action**: Implement rich, structured logging within the `recommendProducts` flow and create specific, helpful fallback messages for different failure scenarios (e.g., "No matching products," "Menu is being set up").

### Phase 2: V2.0 Feature - Dispensary Enablement

This phase focuses on building the core feature set for our Dispensary Manager persona, enabling the B2B2C order fulfillment loop.

1.  **Dispensary Manager Dashboard**:
    *   **Goal**: Provide dispensary managers with a dedicated interface to manage their information and incoming orders.
    *   **Action**: Build out the `/dashboard/orders` and `/dashboard/settings` views specifically for the `dispensary` role.

2.  **Real-Time Order Management**:
    *   **Goal**: Allow dispensaries to view and update the status of orders routed to them in real-time.
    *   **Action**: Implement a live-updating order list on the dispensary dashboard. Build the UI and server actions necessary for a manager to transition an order's status (e.g., from `submitted` -> `confirmed` -> `ready` -> `completed`).

---

## ✅ Completed Milestones

### Full Product CRUD & Security (Day 18+)
- **Full Product Lifecycle Management**: Implemented the complete "Create, Read, Update, and Delete" (CRUD) functionality for brand managers via the dashboard. This includes a unified `saveProduct` action and a secure `deleteProduct` action with a confirmation dialog.
- **Centralized Authorization**: Created a `requireUser` server-side utility to centralize and standardize authentication and role-based access control for all server actions.
- **Hardened Firestore Rules**: Deployed stricter Firestore security rules for the `products` collection, ensuring data operations are protected at the database level.
- **End-to-End Test for Products**: Added a comprehensive Playwright test to validate the entire product management lifecycle, guarding against future regressions.

### Foundational Multi-Tenancy & DX Refinements (Day 16-18)
- **Brand-Centric Homepage**: Established a new homepage targeting brands as the primary user, clarifying the B2B value proposition.
- **Unified State Management**: Merged `useStore` and `useCookieStore` into a single Zustand store with selective persistence, creating a single source of truth for client state.
- **Simplified Provider Architecture**: Consolidated all global context providers directly into the root layout, making the app's structure cleaner and more explicit.
- **Role-Based Login & Live Order Status**: Shipped major UX improvements, including a multi-persona login dropdown and a dynamic, real-time order tracking page for customers.
- **AI Recommendation Engine Hardening**: Made the core recommendation flow more resilient by adding defensive checks, keyword search fallbacks, and improved data validation.

### Headless Commerce & Order Routing (Day 4-10)
- **Secure Server Actions**: Built and secured server actions for order submission, price verification, and status updates.
- **Order Routing & Email Notifications**: Implemented email notifications via SendGrid for order confirmations and status changes.
- **Retailer Selection & Foundational Auth**: Integrated location selection and initial PIN-based login pages.

### Initial Platform Build (Day 1-3)
- **Role-Based Access Control (RBAC)**: Implemented Firebase Custom Claims (`role`, `brandId`, `locationId`) as the basis for the security model.
- **Dashboard & Component UI**: Built the foundational UI for the dashboard, menus, and AI content tools using Next.js and ShadCN.
