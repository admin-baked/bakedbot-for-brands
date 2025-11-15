# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

## Quarterly Review Prep: The Good, The Bad, and The Ugly

### The Good (Wins)

-   **Full Headless Commerce Flow**: We successfully implemented a complete, public-facing menu and headless checkout system, including location-based pricing and order fulfillment logic. This is a major milestone.
-   **Advanced AI Capabilities**: The AI is no longer just a simple chatbot. It now provides intelligent, multi-step product recommendations and can generate AI-powered summaries of customer reviews, adding significant value.
-   **Robust Pre-Publish Checks**: After some initial struggles, we now have a solid `pre-publish.sh` script that validates types, linting, and the production build, preventing broken code from being deployed.
-   **Flexible UI System**: We've established a themeable and component-based UI using ShadCN and Tailwind, allowing for rapid iteration and brand customization.

### The Bad (Challenges)

-   **Build & Dependency Hell**: The initial build process was plagued with a high volume of TypeScript errors and dependency mismatches, particularly between the main app and the Cloud Functions environment. This significantly slowed down development and required multiple iterations to fix.
-   **State Management Complexity**: We have two separate client-side stores (`useCart` and `useStore`). While functional, this adds complexity and could be a source of bugs. Consolidating or clarifying the boundary between them would be beneficial.
-   **AI Development Learning Curve**: Debugging Genkit flows and understanding the exact data shapes returned by AI tools and Firestore APIs proved to be a challenge, leading to several cycles of trial-and-error.

### The Ugly (Technical Debt & Blockers)

-   **Testing Gaps**: While we have some test files, there is no comprehensive unit or end-to-end testing strategy. This is a significant risk as the application grows. The existing tests were also broken and required fixing.
-   **Inconsistent Data Fallback**: The logic for when to fall back to demo data versus live data is inconsistent. Some components fall back gracefully if live data is empty, while others do not. This needs to be standardized.
-   **Lack of SEO**: The product and menu pages currently have static metadata. They lack dynamic titles and descriptions, which is a major missed opportunity for search engine optimization and organic traffic.

---

## Future Enhancements (Roadmap to Production)

### 1. Production Deployment & Security
- **Order Notification System**: Integrate a system (e.g., email service) to send the completed order details to the selected dispensary for fulfillment. This will complete the "headless" checkout experience without direct payment processing.
- **Production Firebase & Security**:
    - Provisioning: Ensure production instances of Firebase Authentication and Firestore are set up.
    - Security Rules: Continue to refine and deploy comprehensive Firestore security rules to protect all data collections.
    - App Check: Implement Firebase App Check to ensure requests to your backend services come from your authentic app.

### 2. AI Feature Enhancements
- **AI Social Media Images**: Refine the feature to generate watermarked, brand-aligned social media images based on product details.
- **Conversational Product Recommendations**: Continue to enhance the chatbot to provide more intelligent product recommendations based on user queries, available product data, and reviews.

### 3. Testing, Optimization, & SEO
- **Unit & E2E Testing**: Implement a testing strategy with unit tests for critical components and end-to-end (E2E) tests for key user flows (e.g., login, checkout).
- **Performance Optimization**: Analyze and optimize the application's bundle size, and implement lazy loading for components and images to ensure fast load times.
- **SEO**: Add dynamic metadata (titles, descriptions) to product and menu pages to improve search engine visibility and ranking.

## Completed Features

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
