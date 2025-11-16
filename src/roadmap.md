# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

---

## 🚀 Final Roadmap to Production

This section outlines the final, critical steps required to launch the application, moving from a functional prototype to a production-ready service.

### Phase 1: Production Hardening (Must-Haves for Go-Live)

*   **Security Lockdown**:
    *   **Finalize & Deploy Firestore Rules**: Conduct a comprehensive, line-by-line security audit of all Firestore rules to ensure no unauthorized data access is possible across tenants. Deploy the finalized rules.
    *   **Implement App Check**: Integrate Firebase App Check to verify that all backend requests originate from your authentic application, preventing abuse and unauthorized API usage.
*   **Production Configuration**:
    *   **Secure API Keys & Secrets**: Transition all secrets (SendGrid API key, Firebase Service Account) to a secure, environment-variable-based system using a service like Google Secret Manager, as outlined in `DEPLOYMENT_INSTRUCTIONS.md`. Remove all hardcoded or locally-managed keys.
    *   **Provision Production Firebase Instance**: Set up and configure the definitive production instances of Firebase Authentication and Firestore.

### Phase 2: Testing & Optimization (Pre-Launch)

*   **Comprehensive Testing**:
    *   **End-to-End (E2E) Tests**: Write and automate E2E tests for the most critical user journeys: the full customer checkout flow and the brand/dispensary login process. This is vital to prevent regressions that could impact revenue or access.
    *   **Unit Test Expansion**: Increase unit test coverage for key components and utility functions to ensure reliability.
*   **Performance Optimization**:
    *   **Bundle Size Analysis**: Use the Next.js Bundle Analyzer to identify large dependencies and create a strategy for optimization.
    *   **Implement Lazy Loading**: Apply lazy loading for non-critical components (e.g., complex dashboard charts, modals) and images to significantly improve initial page load times.

### Phase 3: Feature Polish (Post-Launch / V2.1)

*   **AI Feature Refinement**:
    *   **AI Social Media Images**: Enhance the image generation feature to properly apply brand watermarks and better align with brand guidelines for production-quality marketing assets.
    *   **Conversational AI Polish**: Continue to refine the AI budtender's conversational abilities and the accuracy of its product recommendations.

---

## ✅ Completed Milestones

### Technical Debt Paydown & Hardening (Day 13-15)
- **State Management Consolidated**: Merged `useCart` and `useStore` hooks into a single, unified `useStore`, simplifying the codebase.
- **Robust Data Fetching**: Implemented `useMenuData` hook that gracefully falls back to demo data, ensuring a stable UI.
- **Server-Side Repositories**: Created server-side repositories for data access, improving security and performance.
- **Dynamic SEO for Products**: Enhanced product pages to generate unique metadata for titles and descriptions.
- **Testing Foundation Built**: Configured Jest and fixed broken unit tests, establishing a stable testing environment.

### Brand & Retailer Dashboards (Day 8-12)
- **Role-Based Dashboards**: Built dedicated dashboard views for Brand Managers, Dispensary Managers, and Customers, ensuring users only see relevant information.
- **Real-time Order Management**: Implemented a real-time order dashboard for dispensaries with status update capabilities.
- **Customer Self-Service**: Created a "My Account" area for customers to view order history and manage preferences.

### Headless Commerce & Order Routing (Day 4-7)
- **Secure Server Actions**: Built and secured server actions for order submission, price verification, and status updates, removing logic from the client.
-   **Order Routing & Email Notifications**: Implemented email notifications via SendGrid to alert both customers and dispensaries of order confirmations and status changes.
-   **Retailer Selection**: Integrated a location/retailer selection step into the checkout process.

### Multi-Tenant Foundation (Day 1-3)
-   **Role-Based Access Control (RBAC)**: Implemented Firebase Custom Claims (`brandId`, `locationId`, `role`) to enforce strict data separation between different brands and user types.
-   **Secure Data Queries**: Updated all dashboard and data-fetching logic to be tenant-aware, ensuring a brand manager can only access their own data.
-   **Centralized Auth Logic**: Refactored the `DashboardLayout` to be the single source of truth for user authorization and role-based redirects.
