# BakedBot Embed Widgets

> Embeddable widgets for cannabis brands and dispensaries

## Available Widgets

### 1. Chatbot Widget (`chatbot.js`)

AI-powered budtender chatbot for product recommendations and customer support.

**Features:**
- Natural language product search
- Strain recommendations based on effects
- Onboarding flow for first-time users
- Conversation memory and context
- Image generation for marketing
- Mobile-responsive design

**Installation:**
```html
<!-- Add before closing </body> tag -->
<link rel="stylesheet" href="https://bakedbot.ai/embed/chatbot.css">
<script>
  window.BakedBotConfig = {
    brandId: 'your-brand-id',        // Required
    primaryColor: '#4ade80',         // Optional
    dispensaryId: 'your-disp-id',   // Optional
    entityName: 'Your Brand Name'    // Optional
  };
</script>
<script src="https://bakedbot.ai/embed/chatbot.js"></script>
```

**Configuration:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `brandId` | string | ✅ Yes | Your BakedBot brand identifier |
| `primaryColor` | string | ❌ No | Hex color for branding (e.g., '#4ade80') |
| `dispensaryId` | string | ❌ No | CannMenus dispensary ID for context |
| `entityName` | string | ❌ No | Brand/dispensary name for personalization |

---

### 2. Locator Widget (`locator.js`)

Dispensary/retailer locator with map integration.

**Features:**
- Google Maps integration
- Geolocation support
- Retailer filtering and search
- Distance calculation
- Mobile-responsive

**Installation:**
```html
<link rel="stylesheet" href="https://bakedbot.ai/embed/locator.css">
<div id="bakedbot-locator"></div>
<script>
  window.BakedBotLocatorConfig = {
    brandId: 'your-brand-id',
    googleMapsApiKey: 'your-api-key',  // Optional if using our key
    defaultLocation: {                  // Optional
      lat: 41.8781,
      lng: -87.6298
    }
  };
</script>
<script src="https://bakedbot.ai/embed/locator.js"></script>
```

---

### 3. Menu Widget (`menu.js`)

Embeddable product menu (iframe-based).

**Features:**
- Full product catalog
- Category filtering
- Shopping cart
- Checkout flow integration
- Brand customization

**Installation:**
```html
<!-- Simple iframe embed -->
<iframe
  src="https://bakedbot.ai/embed/menu/your-brand-id?layout=grid&showCart=true"
  width="100%"
  height="800px"
  frameborder="0"
></iframe>
```

**Query Parameters:**
| Parameter | Default | Options | Description |
|-----------|---------|---------|-------------|
| `layout` | `grid` | `grid`, `list`, `compact` | Display layout |
| `showCart` | `true` | `true`, `false` | Show shopping cart |
| `showCategories` | `true` | `true`, `false` | Show category filters |
| `primaryColor` | Brand color | Hex code | Custom brand color |

---

## Getting Started

### 1. Get Your Brand ID

1. Visit [bakedbot.ai](https://bakedbot.ai)
2. Sign up or log in
3. Navigate to your dashboard
4. Find your `brandId` in Settings → Embed Widgets

### 2. Choose Your Widget

Select the widget that best fits your needs:
- **Chatbot** - For customer support and product recommendations
- **Locator** - For helping customers find retail locations
- **Menu** - For full e-commerce experience

### 3. Install the Code

Copy the installation code and paste it into your website's HTML.

### 4. Customize (Optional)

Adjust colors, layout, and other options to match your brand.

---

## Demo Pages

- **Chatbot Demo:** [https://bakedbot.ai/embed/demo.html](http://localhost:3000/embed/demo.html)
- **Full Demo Shop:** [https://bakedbot.ai/demo-shop](https://bakedbot.ai/demo-shop)

---

## API Integration

All widgets connect to the BakedBot API at `/api/chat` for:
- Product recommendations
- Inventory sync
- Conversation memory
- Analytics tracking

**Security:**
- All requests are validated for prompt injection
- User data is sanitized
- Rate limiting applied
- HTTPS required in production

---

## Browser Support

| Browser | Version |
|---------|---------|
| Chrome | 90+ |
| Firefox | 88+ |
| Safari | 14+ |
| Edge | 90+ |

---

## Performance

- **Chatbot Widget:** ~820 KB (minified)
- **Locator Widget:** ~792 KB (minified)
- **Menu Widget:** ~2 KB (iframe loader)

All widgets are:
- Lazy-loaded (no impact on initial page load)
- Minified and tree-shaken
- Cached aggressively (CDN)
- Mobile-optimized

---

## Troubleshooting

### Widget not appearing?

1. Check that `brandId` is correct
2. Verify script tags are inside `<body>` (not `<head>`)
3. Check browser console for errors
4. Ensure no ad blockers are interfering

### Chatbot not responding?

1. Verify your brand page is published
2. Check network tab for API errors
3. Ensure CORS is not blocked
4. Contact support if issue persists

---

## Support

- **Documentation:** [docs.bakedbot.ai](https://bakedbot.ai)
- **Email:** support@bakedbot.ai
- **Discord:** [Join our community](https://discord.gg/bakedbot)

---

## Changelog

### Version 2.0 (Current)
- ✅ Added conversation memory
- ✅ Improved product recommendations
- ✅ Security enhancements (prompt injection protection)
- ✅ Mobile UI improvements
- ✅ Added image generation feature

### Version 1.5
- Added locator widget
- Onboarding flow for first-time users
- Hemp/CBD brand support

### Version 1.0
- Initial release
- Basic chatbot functionality
- Product search

---

## License

Proprietary - © 2026 BakedBot AI. All rights reserved.

For licensing inquiries, contact: licensing@bakedbot.ai
