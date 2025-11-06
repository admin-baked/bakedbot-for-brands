# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

## Future Enhancements (Roadmap to Production)

### 1. Headless Menu & Checkout Flow
- **Checkout UI**: Build the complete checkout interface, including a form for customer name and contact information.
- **Location-Based Pickup**: Implement logic to find and display the 3 closest dispensaries based on user's location.
- **Order Notification**: Integrate a system (e.g., email service) to send the completed order details to the selected dispensary for fulfillment. This will complete the "headless" checkout experience without direct payment processing.

### 2. Production Firebase & Security
- **Provisioning**: Ensure production instances of Firebase Authentication and Firestore are set up.
- **Security Rules**: Write and deploy comprehensive Firestore security rules to protect all data collections.
- **App Check**: Implement Firebase App Check to ensure requests to your backend services come from your authentic app.

### 3. AI Feature Enhancements
- **AI Review Summaries**: Create a Genkit flow that uses an AI model to read all reviews for a product and generate a concise summary of pros and cons.
- **AI Social Media Images**: Implement a feature to generate watermarked, brand-aligned social media images based on product details.
- **Conversational Product Recommendations**: Enhance the chatbot to provide intelligent product recommendations based on user queries, using available product data and reviews.

### 4. Testing, Optimization, & SEO
- **Unit & E2E Testing**: Implement a testing strategy with unit tests for critical components and end-to-end (E2E) tests for key user flows (e.g., login, checkout).
- **Performance Optimization**: Analyze and optimize the application's bundle size, and implement lazy loading for components and images to ensure fast load times.
- **SEO**: Add dynamic metadata (titles, descriptions) to product and menu pages to improve search engine visibility and ranking.

## Completed Features

### Version 1.5 - Authentication & Initial Setup
- **User Authentication**: Secure user authentication system allowing brands to sign up and sign in.
- **AI Product Description Generator**: Initial version of the AI content generator.
- **Customizable AI Chatbot**: "Smokey" chatbot widget with basic brand customization (theme, icon).
- **Dashboard Foundation**: Basic dashboard layout with sidebar navigation.
