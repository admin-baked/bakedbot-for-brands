# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

---

## 🚀 Final Roadmap to Production

This section outlines the final, critical steps required to launch the application, moving from a functional prototype to a production-ready service. This roadmap is focused on a multi-tenant architecture where "Brands" are the primary tenants.

### Phase 1: Multi-Tenancy & Security Hardening (Must-Haves for Go-Live)

*   **Tenant-Aware Routing & Data**:
    *   **Dynamic Subdomains/Paths**: Implement the logic to resolve a `brandId` from the request hostname (e.g., `brand-name.bakedbot.ai`) or path (`/menu/brand-name`).
    *   **Server-Side Data Scoping**: Ensure all data fetching (products, locations, orders) is strictly scoped on the server using the resolved `brandId` from the request, not from client-side state.

*   **Security Lockdown**:
    *   **Finalize & Deploy Firestore Rules**: Conduct a comprehensive, line-by-line security audit of all Firestore rules. Rules must be updated to use `request.auth.token.brandId` and `request.auth.token.locationId` to enforce strict data ownership and prevent cross-tenant data access.
    *   **Implement App Check**: Integrate Firebase App Check to verify that all backend requests originate from your authentic application, preventing abuse and unauthorized API usage.
    *   **Harden Server Actions**: Re-verify user identity and authorization claims (`role`, `brandId`) at the beginning of every Server Action to ensure every operation is authorized.

*   **Production Configuration**:
    *   **Secure API Keys & Secrets**: Transition all secrets (SendGrid API key, Firebase Service Account) to a secure, environment-variable-based system using a service like Google Secret Manager, as outlined in `DEPLOYMENT_INSTRUCTIONS.md`.
    *   **Provision Production Firebase Instance**: Set up and configure the definitive production instances of Firebase Authentication and Firestore.

### Phase 2: Testing & Optimization (Pre-Launch)

*   **Comprehensive Testing**:
    *   **End-to-End (E2E) Tests**: Write and automate E2E tests for the most critical user journeys: the full customer checkout flow, brand onboarding, and the dispensary login process. This is vital to prevent regressions.
    *   **Unit Test Expansion**: Increase unit test coverage for data repositories, server actions, and critical UI components.
*   **Performance Optimization**:
    *   **Bundle Size Analysis**: Use the Next.js Bundle Analyzer to identify and optimize large dependencies.
    *   **Implement Lazy Loading**: Apply lazy loading for non-critical components (e.g., complex dashboard charts, modals) and images to improve initial page load times.

### Phase 3: Feature Polish (Post-Launch / V2.1)

*   **AI Feature Refinement**:
    *   **AI Social Media Images**: Enhance the image generation feature to properly apply brand watermarks and better align with brand guidelines.
    *   **Conversational AI Polish**: Continue to refine the AI budtender's conversational abilities and the accuracy of its product recommendations.
*   **Custom Domains for Paid Tiers**: Build the UI and backend logic to allow paid brand accounts to map their own custom domains to their headless menu.

---

## ✅ Completed Milestones

### Foundational Multi-Tenancy (Day 16+)
- **Brand-Centric Homepage**: Established a new homepage targeting brands as the primary user, clarifying the B2B value proposition.
- **Role-Based Dashboards**: Built dedicated dashboard views for Brand Managers, Dispensary Managers, and Customers.
- **Real-time Order Management**: Implemented a real-time order dashboard for dispensaries with status update capabilities.
- **Customer Self-Service**: Created a "My Account" area for customers to view order history and manage preferences.

### Headless Commerce & Order Routing (Day 4-10)
- **Secure Server Actions**: Built and secured server actions for order submission, price verification, and status updates.
- **Order Routing & Email Notifications**: Implemented email notifications via SendGrid for order confirmations and status changes.
- **Retailer Selection & PIN Login**: Integrated a location selection step and a foundational PIN login page for dispensaries.

### Initial Platform Build (Day 1-3)
- **Role-Based Access Control (RBAC)**: Implemented Firebase Custom Claims (`role`, `brandId`, `locationId`) as the basis for the security model.
- **Dashboard & Component UI**: Built the foundational UI for the dashboard, menus, and AI content tools using Next.js and ShadCN.
