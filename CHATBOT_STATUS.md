# BakedBot Chatbot Widget - Status Report

**Date:** January 28, 2026
**Status:** ✅ OPERATIONAL

---

## Summary

The BakedBot budtender chatbot widget is fully operational and ready for demo purposes for both brands and dispensaries. All components have been verified, rebuilt, and tested.

---

## Architecture Overview

### 1. React Component (Main App)
**Location:** `src/components/chatbot.tsx`

- Used in Next.js app pages (demo-shop, brand pages, etc.)
- Imports: `@/components/chatbot`
- Features:
  - Onboarding flow for first-time users
  - Product recommendations via /api/chat
  - Conversation memory (session-based)
  - Image generation mode (Wand icon)
  - Context-aware (brandId, dispensaryId, entityName)
  - Mobile-responsive design

### 2. Embed Widget (External Sites)
**Location:** `src/embed/index.tsx` → `public/embed/chatbot.js`

- Standalone JavaScript bundle (819 KB minified)
- Can be embedded on any website via script tag
- Self-initializing via `window.BakedBotConfig`
- Features:
  - All features from React component
  - Zero dependencies (React bundled)
  - CORS-enabled API calls
  - PostMessage bridge for parent communication

### 3. API Backend
**Location:** `src/app/api/chat/route.ts`

- Endpoint: `POST /api/chat`
- Features:
  - Prompt injection protection (PromptGuard)
  - Session management (Firestore)
  - Product search (CannMenus, Firestore)
  - Conversation context (multi-turn)
  - Usage tracking (analytics)
  - Security validation (input/output sanitization)

---

## Demo Shop Integration

### Current Status: ✅ ACTIVE

**File:** `src/app/demo-shop/demo-shop-client.tsx`

```tsx
// Lines 60-61
const Chatbot = dynamicImport(() => import('@/components/chatbot'), { ssr: false });

// Lines 762-763 (Dispensary Mode)
<Chatbot products={activeProducts} brandId="demo-40tons" />

// Lines 1071-1072 (Brand Mode)
<Chatbot
  products={activeProducts}
  brandId={useImportedMenu ? 'imported-brand' : 'demo-40tons'}
/>
```

**Configuration:**
- **Brand ID:** `demo-40tons` (default) or `imported-brand` (if menu imported)
- **Products:** Active products from demo data or imported menu
- **Position:** Fixed bottom-right (floating button)
- **Mode:** Both dispensary and brand menu modes supported

---

## Features Verified

### ✅ Core Functionality
- [x] Chatbot button renders in bottom-right corner
- [x] Click to open/close chat window
- [x] Onboarding flow ("Find product recommendations" button)
- [x] Free chat mode ("Just ask me a question")
- [x] Message input and send functionality
- [x] Bot typing indicator
- [x] Product recommendations with cards
- [x] "Add to Cart" integration

### ✅ API Integration
- [x] `/api/chat` endpoint operational
- [x] Prompt injection protection active
- [x] Session management (creates/retrieves sessions)
- [x] Product search (searches demo products or CannMenus)
- [x] Conversation context (multi-turn memory)

### ✅ Security
- [x] Input validation (PromptGuard)
- [x] Output sanitization
- [x] Risk scoring and logging
- [x] CORS protection
- [x] withProtection middleware

### ✅ UX Features
- [x] Product carousel (horizontal scroll)
- [x] "Ask Smokey" quick action buttons
- [x] Clear context button (reset conversation)
- [x] Magic image generation mode (Wand icon)
- [x] Feedback buttons (thumbs up/down)
- [x] Mobile-responsive layout

### ✅ Demo Page Content
- [x] Platform demo (homepage "/" path)
- [x] Quick question buttons ("How does BakedBot work?", "Pricing models")
- [x] Product demo trigger ("Try the Product Demo")
- [x] Retail mode (demo-shop)
- [x] Preset responses for common questions

---

## Embed Widget

### Build Status: ✅ REBUILT (Jan 28, 2026)

**Command:** `npm run build:embed`

**Output Files:**
```
public/embed/
├── chatbot.js      (819.07 KB) ✅
├── chatbot.css     (217.92 KB) ✅
├── locator.js      (791.62 KB) ✅
├── locator.css     (217.92 KB) ✅
├── menu.js         (1.73 KB)   ✅
├── demo.html       (NEW)       ✅ - Interactive demo page
└── README.md       (NEW)       ✅ - Installation guide
```

### Installation (External Sites)

```html
<!-- Add before closing </body> tag -->
<link rel="stylesheet" href="https://bakedbot.ai/embed/chatbot.css">
<script>
  window.BakedBotConfig = {
    brandId: 'your-brand-id',
    primaryColor: '#4ade80',
    dispensaryId: 'optional-dispensary-id',
    entityName: 'Your Brand Name'
  };
</script>
<script src="https://bakedbot.ai/embed/chatbot.js"></script>
```

### Demo Page

**URL (Local):** http://localhost:3000/embed/demo.html
**URL (Production):** https://bakedbot.ai/embed/demo.html

Features:
- Live chatbot demo
- Installation instructions
- Configuration options table
- Feature list
- Use cases
- Troubleshooting guide

---

## Configuration Options

### React Component Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `products` | `Product[]` | ❌ | `[]` | Product catalog for recommendations |
| `brandId` | `string` | ❌ | `""` | Brand identifier for context |
| `dispensaryId` | `string` | ❌ | - | CannMenus dispensary ID |
| `entityName` | `string` | ❌ | - | Brand/dispensary name for personalization |
| `initialOpen` | `boolean` | ❌ | `false` | Open chatbot on page load |
| `positionStrategy` | `'fixed' | 'absolute' | 'relative'` | ❌ | `'fixed'` | Positioning strategy |
| `className` | `string` | ❌ | - | Custom CSS class for button |
| `windowClassName` | `string` | ❌ | - | Custom CSS class for window |
| `isSuperAdmin` | `boolean` | ❌ | `false` | Enable admin features |
| `chatbotConfig` | `object` | ❌ | - | Brand chatbot settings |

### Chatbot Config Object

```typescript
{
  enabled?: boolean;           // Show/hide chatbot
  welcomeMessage?: string;     // Custom greeting
  botName?: string;            // Default: "Smokey"
  mascotImageUrl?: string;     // Custom chatbot icon
}
```

---

## API Payload Structure

### Request (POST /api/chat)

```typescript
{
  query: string;              // User message (sanitized)
  userId?: string;            // User ID (for session)
  sessionId?: string;         // Session ID (for context)
  brandId?: string;           // Brand context
  dispensaryId?: string;      // Dispensary context
  entityName?: string;        // Personalization
  state?: string;             // Location context
  products?: Product[];       // Product catalog
  isOnboarding?: boolean;     // Onboarding flow
  isSuperAdmin?: boolean;     // Admin mode
  context?: string;           // Additional context
}
```

### Response

```typescript
{
  ok: boolean;
  message: string;            // Bot response text
  sessionId?: string;         // New/existing session
  products?: Array<{          // Product suggestions
    id: string;
    name: string;
    category: string;
    price: number;
    imageUrl: string;
    description: string;
    thcPercent?: number;
    cbdPercent?: number;
    url?: string;
    reasoning?: string;       // Why recommended
  }>;
  error?: string;             // Error message
}
```

---

## Testing Checklist

### For Brand Mode (demo-shop in brand menu mode)

1. ✅ Visit http://localhost:3000/demo-shop
2. ✅ Toggle "Menu Mode" to "Brand Menu"
3. ✅ Click chatbot icon (bottom-right)
4. ✅ Test onboarding flow
5. ✅ Ask product questions
6. ✅ Verify product recommendations
7. ✅ Test "Add to Cart" flow

### For Dispensary Mode (demo-shop default)

1. ✅ Visit http://localhost:3000/demo-shop
2. ✅ Ensure "Dispensary Menu" mode selected
3. ✅ Click chatbot icon
4. ✅ Test free chat mode
5. ✅ Ask about specific products
6. ✅ Test clear context button
7. ✅ Test image generation (Wand icon)

### For Embed Widget

1. ✅ Visit http://localhost:3000/embed/demo.html
2. ✅ Verify chatbot loads
3. ✅ Test all features
4. ✅ Check mobile responsiveness
5. ✅ Verify brand color customization

---

## Known Issues

### None Currently

All major features tested and operational.

---

## Next Steps (Optional Enhancements)

### High Priority
- [ ] Add analytics dashboard (track chatbot usage)
- [ ] Implement A/B testing for onboarding flow
- [ ] Add voice input/output (TTS integration)
- [ ] Create brand-specific training data

### Medium Priority
- [ ] Multi-language support (Spanish, French)
- [ ] Advanced product filtering (price range, effects)
- [ ] Integration with POS systems (Dutchie, Treez)
- [ ] Custom chatbot personality per brand

### Low Priority
- [ ] Dark mode theme
- [ ] Chatbot avatar customization
- [ ] Conversation export (PDF/email)
- [ ] Sentiment analysis for feedback

---

## Support Resources

### Documentation
- **Embed README:** `public/embed/README.md`
- **Demo Page:** `public/embed/demo.html`
- **Prime Context:** `.agent/prime.md`
- **Frontend Ref:** `.agent/refs/frontend.md`

### Key Files
- **Component:** `src/components/chatbot.tsx`
- **Embed Entry:** `src/embed/index.tsx`
- **API Route:** `src/app/api/chat/route.ts`
- **Demo Shop:** `src/app/demo-shop/demo-shop-client.tsx`
- **Build Config:** `tsup.config.ts`

### Commands
```bash
# Start dev server
npm run dev

# Build embed widgets
npm run build:embed

# Type check
npm run check:types

# Run tests
npm test -- src/app/api/chat/__tests__
```

---

## Contact

For questions or issues:
- **Email:** support@bakedbot.ai
- **Discord:** [Join community](https://discord.gg/bakedbot)
- **Docs:** https://docs.bakedbot.ai

---

**Last Updated:** January 28, 2026
**Verified By:** Claude Code Agent
**Build Status:** ✅ All systems operational
