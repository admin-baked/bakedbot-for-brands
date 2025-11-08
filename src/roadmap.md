# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

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
