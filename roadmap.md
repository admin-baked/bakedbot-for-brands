# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

## Version 1.8.8 - Feedback System Foundation

### Core Features:
- **Feedback Data Model**: Updated the `Product` data model to include `likes` and `dislikes` fields to store feedback.
- **Enabled Feedback UI**: Activated the "thumbs up/down" buttons on product cards within the chatbot and on the AI-generated content display. This provides the user interface for collecting feedback.
- **Dashboard Feedback Metrics**: Added new cards to the main dashboard to display aggregate "Total Likes" and "Total Dislikes" counts, giving brands a high-level view of customer sentiment.

## Version 1.8.1 - CannMenus Stable

### Core Features:
- **CannMenus Integration**: Added the UI and secure backend functionality for users to save their CannMenus API key in their private profile. This is the first step towards pulling product data.

## Version 1.5 - Authentication Added

### Core Features:
- **User Authentication**: Secure user authentication system allowing brands to sign up and sign in with Google or a passwordless "Magic Link".
- AI Product Description Generator with image upload and MSRP support.
- Customizable AI Chatbot Widget ("Smokey") for product discovery.
- Advanced brand customization:
  - Theme color selection.
  - Set brand color via HEX code or website URL crawling.
  - Upload a custom icon for the chatbot widget.
- Selectable chat experiences ("Default" with product carousel or "Classic" conversation view).
- Horizontally scrollable product carousel within the chatbot.
- "Ask Smokey" functionality for conversational product inquiries.

## Future Enhancements

### Reviews & Feedback System
- **In-App Product Reviews**: Allow end-users to leave star ratings and written reviews for products directly within the application or chatbot.
- **Display Average Ratings**: Show the average star rating on product cards in the chatbot and product listings.
- **AI Content Feedback**: Implement the logic for the "thumbs up/down" buttons on AI-generated content to collect feedback for future model fine-tuning.
- **Reviews Management**: Create a new dashboard page for brands to view, manage, and respond to customer reviews.

### Chatbot & AI Agent
- **AI-Powered Branding Agent**: Implement the backend logic for the AI agent to crawl a user's website and automatically match brand colors and style.
- **AI-Powered Image Generation**: Wire up the "Generate Image" button to an AI image generation model (like DALL-E or Imagen) to create product packaging concepts.
- **Advanced Conversational AI**: Integrate a more powerful language model to provide more in-depth product knowledge, remember conversation context, and handle more complex user queries.
- **Personalized Recommendations**: Store user interaction history to provide personalized product recommendations in future sessions.

### Application & Dashboard
- **Content Management**: Add functionality to save, edit, and manage all generated product descriptions.
- **Analytics Dashboard**: Create a new dashboard page to provide insights on chatbot usage, such as most frequently asked questions, most viewed products, and overall user engagement.
- **Real Inventory Integration**: Develop a system to connect to a brand's actual inventory via API to provide real-time product availability.

### Settings & Configuration
- **Fine-grained Chatbot Control**: Add more settings to control the chatbot's personality, tone of voice, and default opening messages.
- **Brand Document Analysis**: Implement the logic to process uploaded brand guideline documents to extract brand voice and style.
