# BakedBot AI - Product Roadmap

This document outlines the planned features and improvements for the BakedBot AI application.

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