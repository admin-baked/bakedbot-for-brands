# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

---

## 🚀 Roadmap to Version 3.0: Automated Intelligence

With the core platform, user journeys, and initial intelligence engine complete, the next phase focuses on automation and deep market insights by integrating with third-party data sources.

### Phase 3: Automated Menu & Pricing Intelligence via CannMenus Integration

*   **Goal**: To eliminate manual data entry for dispensary menus, provide real-time menu accuracy insights, and unlock competitive pricing intelligence.
*   **Vision**: Transform the Brand Intelligence Console from a tool for managing a brand's *own* data into a tool for understanding the entire competitive landscape in real-time.

1.  **Foundational API Integration & Data Ingestion**:
    *   **Action**: Build a secure, server-side service/repository to communicate with the CannMenus API. Implement a flow to fetch menu data for dispensaries carrying the brand's products and map it to our internal models.

2.  **Real-Time Menu Sync & Accuracy Dashboard**:
    *   **Action**: Create a "Menu Sync" feature in the dashboard to provide a live view of product listings across all partner dispensaries, automatically flagging discrepancies.

3.  **Competitive Pricing Intelligence**:
    *   **Action**: Build a "Pricing Intelligence" dashboard to visualize a brand's own pricing against their top competitors, SKU-by-SKU and market-by-market.

4.  **AI-Powered Pricing Recommendations**:
    *   **Action**: Enhance the AI engine with a new flow that analyzes competitive pricing data to provide proactive, strategic recommendations for price adjustments and promotions.

---

## ✅ Completed Milestones

### Phase 2: The Brand Intelligence Engine
- **Unified Data Model**: Eliminated the client-side "Demo Mode" toggle by making "BakedBot" a first-class, seedable brand. Critically, added `brandId` to `Order` documents, linking sales data directly to brands.
- **Harmonized Homepage**: Redesigned the marketing homepage to be visually consistent with the application's dynamic theme, creating a seamless user experience.
- **Analytics Dashboard**: Launched the `/dashboard/analytics` page, providing brand owners with their first actionable insights, including Total Revenue, Total Orders, and Top Selling Products visualized with charts.

### Phase 1: Polish & User Experience Hardening
- **Enhanced Authentication UX**: Replaced magic link logins with a professional and secure email/password system for Brand and Dispensary users, including a full sign-up flow.
- **Robust Error Handling**: Implemented a `global-error.tsx` boundary to catch server-side errors and prevent application crashes, with specific handling for Firestore permission errors. Added loading skeletons for a better perceived performance.
- **Completed Onboarding Logic**: Ensured that new brand owners have a `Brand` document automatically created upon completing the onboarding flow, allowing them to immediately manage their settings.
- **AI Content Application & Feedback Loop**: Added a "Save to Product" button to the Content AI suite and implemented a "Like/Dislike" feedback system for AI-generated recommendations.
- **Customer Account Center**: Built the "My Account" page for customers to view order history and manage preferences, including setting a "Favorite Dispensary" to streamline checkout.
- **Advanced AI Content Generation**: Expanded the AI suite to include social media image generation, allowing brands to create unique marketing assets on demand.
- **CEO/Admin Console**: Created a secure dashboard for administrators to manage underlying application data and AI processes, including data seeding and vector index management.

### Initial Platform Build (Pre-Roadmap)
- **Role-Based Access Control (RBAC)**: Implemented Firebase Custom Claims (`role`, `brandId`, `locationId`) as the basis for the security model.
- **Secure Server Actions & Order Routing**: Built and secured server actions for order submission, price verification, and status updates, including email notifications.
- **Foundational UI & State**: Built the foundational UI for the dashboard, menus, and AI content tools using Next.js, ShadCN, and a unified Zustand store.
