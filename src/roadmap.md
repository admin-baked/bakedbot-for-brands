# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

---

## ✅ v2.0 Milestone: Technical Debt Paydown & Hardening

We have successfully completed a major phase of technical debt reduction and application hardening.

-   **State Management Consolidated**: Merged `useCart` and `useStore` hooks into a single, unified state management solution (`useStore`), simplifying the codebase.
-   **Robust Data Fallback Logic**: Implemented a consistent data fetching strategy in `useMenuData` that gracefully falls back to demo data only when live data is unavailable, ensuring a stable UI.
-   **Dynamic SEO for Products**: Enhanced product pages to generate unique, dynamic metadata for titles and descriptions, making them discoverable by search engines.
-   **Testing Foundation Built**: Established a stable testing environment by configuring Jest with `jest-setup.ts` and fixing all broken unit tests for components and hooks.

---

## 🚀 Roadmap to Production

This section outlines the final, critical steps required to launch the application.

### Phase 1: Core Production Readiness (Must-Haves)

*   **Security Lockdown**:
    *   **Refine & Deploy Firestore Rules**: Conduct a final review of all Firestore security rules to ensure no unauthorized data access is possible. Deploy the finalized rules.
    *   **Implement App Check**: Integrate Firebase App Check to ensure all backend requests originate from your authentic application, preventing abuse.

*   **Production Configuration**:
    *   **Provision Production Firebase**: Set up and configure the production instances of Firebase Authentication, Firestore, and Cloud Functions.
    *   **Secure API Keys**: Ensure all third-party API keys (like SendGrid) and service account credentials are securely stored in a secret manager (like Google Secret Manager) and accessed only by the backend.

### Phase 2: Feature Completion & Optimization

*   **AI Feature Refinement**:
    *   **AI Social Media Images**: Improve the image generation feature to properly apply watermarks and align with brand guidelines for production use.
*   **Performance Optimization**:
    *   **Bundle Size Analysis**: Use the Next.js Bundle Analyzer to identify large dependencies and opportunities for optimization.
    *   **Implement Lazy Loading**: Apply lazy loading for non-critical components and images to improve initial page load times.

### Phase 3: Go-Live & Post-Launch

*   **Comprehensive Testing**:
    *   **End-to-End (E2E) Tests**: Write E2E tests for critical user journeys, including the full checkout flow and user login, to prevent regressions.
*   **Launch**:
    *   Deploy the application to the production environment.
*   **Post-Launch Monitoring**:
    *   Set up monitoring and alerting for application performance and errors.

## Completed Milestones

### Version 2.0 - Headless Menu & Enhanced AI
- **Headless Menu & Checkout Flow**: 
    - Built a full-featured, public-facing product menu.
    - Implemented a complete checkout UI with a form for customer details.
    - Integrated location-based logic to find and display the 3 closest dispensaries.
- **AI Review Summaries**: Created a Genkit flow and UI that uses an AI model to read all reviews for a product and generate a concise summary of pros and cons.
- **Enhanced AI Chatbot**: The chatbot now has a multi-step onboarding flow to provide better recommendations.

### Version 1.5 - Authentication & Initial Setup
- **User Authentication**: Secure user authentication system allowing brands to sign up and sign in via Google and magic link.
- **AI Product Description Generator**: Initial version of the AI content generator for product descriptions and social images.
- **Customizable AI Chatbot**: "Smokey" chatbot widget with basic brand customization (theme, icon).
- **Dashboard Foundation**: Basic dashboard layout with editable sidebar navigation and administrative controls.
