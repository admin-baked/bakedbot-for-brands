# Hero Banner System - Phase 3 Features

> Next-generation features for maximum engagement and reach

**Status:** ✅ Complete
**Date:** 2026-02-06

---

## 📋 Phase 3 Features Overview

Phase 3 transforms the Hero Banner system into a world-class marketing platform:

1. **🎬 Video Background Support** - Cinematic hero experiences
2. **📚 Hero Templates Library** - 10 pre-built templates
3. **📱 Social Media Preview** - Auto-generate OG/Twitter cards
4. **🌍 Multi-language Support** - Localized content
5. **📍 Location Personalization** - Geo-targeted messaging
6. **📊 Google Analytics** - Enterprise-grade tracking

---

## 🎬 1. Video Background Support

### Overview
Create cinematic hero experiences with full-screen video backgrounds.

### Files Created
- `src/components/demo/brand-hero-video.tsx` - Enhanced hero component
- `src/types/heroes.ts` - Added `videoBackground` field

### Usage

**Create Hero with Video:**
```typescript
const hero: Hero = {
  // ... other fields
  videoBackground: {
    url: 'https://storage.googleapis.com/.../hero-video.mp4',
    posterImage: 'https://storage.googleapis.com/.../poster.jpg',
    muted: true,
    loop: true,
    autoplay: true,
  },
};
```

**Render Video Hero:**
```tsx
import { BrandHeroVideo } from '@/components/demo/brand-hero-video';

<BrandHeroVideo
  {...hero}
  videoBackground={hero.videoBackground}
/>
```

### Features
- ✅ **Mute Toggle** - User-controlled audio
- ✅ **Poster Image** - Fallback while loading
- ✅ **Auto-play** - Starts automatically (muted)
- ✅ **Looping** - Continuous playback
- ✅ **Mobile Optimized** - Works on all devices
- ✅ **Accessibility** - Proper ARIA labels

### Best Practices

**Video Specifications:**
- **Resolution:** 1920x1080 (Full HD) or 3840x2160 (4K)
- **Format:** MP4 (H.264 codec)
- **Duration:** 10-30 seconds (for looping)
- **File Size:** < 10MB (< 5MB ideal)
- **Frame Rate:** 30fps

**Use Cases:**
- Cannabis cultivation process (seed to harvest)
- Product manufacturing (extraction, infusion)
- Brand lifestyle (customers enjoying products)
- Store ambiance (inviting atmosphere)

**Example Upload:**
```typescript
// 1. Upload video to Firebase Storage
const formData = new FormData();
formData.append('file', videoFile);
formData.append('orgId', 'org_123');
formData.append('type', 'hero');

const upload = await fetch('/api/heroes/upload', {
  method: 'POST',
  body: formData,
});

const { url } = await upload.json();

// 2. Update hero with video URL
await updateHero(heroId, {
  videoBackground: {
    url,
    posterImage: hero.heroImage, // Use hero image as poster
    muted: true,
    loop: true,
    autoplay: true,
  },
});
```

---

## 📚 2. Hero Templates Library

### Overview
10 professionally designed templates for instant hero creation.

### Files Created
- `src/lib/hero-templates.ts` - Template library

### Available Templates

1. **Premium Flower Brand** - Professional, green, local pickup
2. **Neighborhood Dispensary** - Welcoming, hybrid model
3. **Luxury Cannabis** - Sophisticated purple, online-only
4. **Medical Dispensary** - Healthcare focus, consultations
5. **4/20 Event Promo** - Bold design, scheduled activation
6. **Gourmet Edibles** - Appetizing orange, food-focused
7. **Eco-Friendly Cannabis** - Sustainable, earth tones
8. **Fast Delivery** - Modern blue, express delivery
9. **Craft Cannabis** - Artisanal brown, small-batch
10. **Newcomer Friendly** - Educational, approachable

### Usage

**Browse Templates:**
```typescript
import { getAllTemplates, getTemplatesByCategory } from '@/lib/hero-templates';

// Get all templates
const templates = getAllTemplates();

// Get templates by category
const brandTemplates = getTemplatesByCategory('brand');
const eventTemplates = getTemplatesByCategory('event');
```

**Apply Template:**
```typescript
import { applyTemplate } from '@/lib/hero-templates';

const heroData = applyTemplate(
  'premium-flower',
  'Sunset Valley Cannabis', // Brand name
  'org_123', // Organization ID
  { // Optional overrides
    brandLogo: 'https://...',
    heroImage: 'https://...',
  }
);

const result = await createHero(heroData);
```

**Template Structure:**
```typescript
interface HeroTemplate {
  id: string;
  name: string;
  description: string;
  category: 'dispensary' | 'brand' | 'event' | 'medical' | 'luxury';
  thumbnail?: string;
  template: Partial<Hero>;
}
```

### UI Integration (Future)

**Template Picker Component:**
```tsx
<HeroTemplatePicker
  category="brand"
  onSelect={(templateId) => {
    const hero = applyTemplate(templateId, brandName, orgId);
    createHero(hero);
  }}
/>
```

---

## 📱 3. Social Media Preview Generator

### Overview
Automatically generate Open Graph and Twitter Card meta tags for SEO and social sharing.

### Files Created
- `src/app/api/heroes/social-preview/route.ts` - Preview API

### Usage

**Generate Preview Data:**
```typescript
const response = await fetch('/api/heroes/social-preview', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ heroId: 'hero_123' }),
});

const { preview } = await response.json();
// {
//   ogTitle: "Brand Name - Tagline",
//   ogDescription: "...",
//   ogImage: "https://...",
//   twitterCard: "summary_large_image",
//   structuredData: { ... }
// }
```

**Get HTML Meta Tags:**
```typescript
const metaTags = await fetch('/api/heroes/social-preview?heroId=hero_123');
const html = await metaTags.text();

// Insert into page <head>
```

**In Next.js Page:**
```tsx
// app/[brand]/page.tsx
import { Metadata } from 'next';
import { getActiveHero } from '@/app/actions/heroes';

export async function generateMetadata({ params }): Promise<Metadata> {
  const hero = await getActiveHero(params.brand);

  if (!hero.success || !hero.data) return {};

  const h = hero.data;

  return {
    title: `${h.brandName} - ${h.tagline}`,
    description: h.description,
    openGraph: {
      title: `${h.brandName} - ${h.tagline}`,
      description: h.description,
      images: [h.heroImage || h.brandLogo || '/default-og.png'],
    },
    twitter: {
      card: 'summary_large_image',
      title: `${h.brandName} - ${h.tagline}`,
      description: h.description,
      images: [h.heroImage || h.brandLogo || '/default-og.png'],
    },
  };
}
```

### Structured Data (Schema.org)

The API automatically generates JSON-LD structured data:

```json
{
  "@context": "https://schema.org",
  "@type": "OnlineStore",
  "name": "Brand Name",
  "description": "...",
  "image": "https://...",
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": 4.8,
    "bestRating": 5
  }
}
```

**Benefits:**
- Rich snippets in Google search results
- Better SEO ranking
- Enhanced social media sharing
- Improved click-through rates

---

## 🌍 4. Multi-language Support

### Overview
Serve localized hero content based on user's language preference.

### Files Updated
- `src/types/heroes.ts` - Added `languages` field
- `src/server/services/hero-personalization.ts` - Localization logic

### Usage

**Define Translations:**
```typescript
const hero: Hero = {
  brandName: 'Cannabis Co',
  tagline: 'Premium Cannabis Products', // Default (English)

  languages: {
    'es': { // Spanish
      tagline: 'Productos Premium de Cannabis',
      description: 'Descubre nuestra colección de productos premium.',
      primaryCtaLabel: 'Encontrar Cerca',
      secondaryCtaLabel: 'Ver Productos',
    },
    'fr': { // French
      tagline: 'Produits de Cannabis Premium',
      description: 'Découvrez notre collection de produits premium.',
      primaryCtaLabel: 'Trouver Près de Moi',
      secondaryCtaLabel: 'Voir les Produits',
    },
  },
};
```

**Personalize Based on Language:**
```typescript
import { personalizeHero, getUserContextFromHeaders } from '@/server/services/hero-personalization';

// Get user context from request
const context = getUserContextFromHeaders(request.headers);
// { language: 'es', location: { state: 'CA' } }

// Personalize hero
const personalizedHero = personalizeHero(hero, context);
// Hero now shows Spanish content
```

**Supported Languages:**
- `en` - English (default)
- `es` - Spanish
- `fr` - French
- `de` - German
- `it` - Italian
- `pt` - Portuguese
- `zh` - Chinese
- Any ISO 639-1 language code

---

## 📍 5. Location Personalization

### Overview
Show geo-targeted messages and CTAs based on user location.

### Files Created
- `src/server/services/hero-personalization.ts` - Personalization engine

### Usage

**Define Location Rules:**
```typescript
const hero: Hero = {
  // ... other fields

  locationPersonalization: {
    enabled: true,
    rules: [
      {
        condition: 'state',
        value: 'CA',
        customMessage: 'Now delivering to your area! Same-day delivery available in California.',
        customCta: {
          label: 'Get Delivered Today',
          url: '/delivery/california',
        },
      },
      {
        condition: 'city',
        value: 'Denver',
        customMessage: 'Welcome, Denver! Visit our downtown location.',
        customCta: {
          label: 'Denver Locations',
          url: '/locations/denver',
        },
      },
      {
        condition: 'zipCode',
        value: '90210',
        customMessage: 'Free delivery in 90210 on orders over $50!',
      },
    ],
  },
};
```

**Personalize Based on Location:**
```typescript
import { personalizeHero, getUserContextFromHeaders } from '@/server/services/hero-personalization';

// Server-side in page.tsx
export default async function BrandPage({ request }) {
  const context = getUserContextFromHeaders(request.headers);
  const hero = await getActiveHero(orgId);

  const personalizedHero = personalizeHero(hero.data, context);

  return <BrandHero {...personalizedHero} />;
}
```

**Location Detection:**

1. **Cloudflare/Vercel Headers** (fastest)
   ```typescript
   cf-ipcity: "San Francisco"
   cf-region: "CA"
   cf-ipcountry: "US"
   ```

2. **IP Geolocation API** (fallback)
   ```typescript
   import { getLocationFromIP } from '@/server/services/hero-personalization';

   const location = await getLocationFromIP(userIp);
   // { city: "Denver", state: "CO", zipCode: "80202" }
   ```

**Use Cases:**
- **State-specific delivery** - "Now delivering in California"
- **Local store highlights** - "Visit our Denver location"
- **Regional promotions** - "Colorado residents get 10% off"
- **Compliance messaging** - State-specific legal disclaimers

---

## 📊 6. Google Analytics Integration

### Overview
Track hero performance with Google Analytics 4 events.

### Files Created
- `src/lib/analytics/google-analytics.ts` - GA tracking functions

### Usage

**Initialize Analytics:**
```typescript
import { initializeHeroAnalytics } from '@/lib/analytics/google-analytics';

// In _app.tsx or layout.tsx
useEffect(() => {
  initializeHeroAnalytics('G-XXXXXXXXXX'); // Your GA4 Measurement ID
}, []);
```

**Track Hero Events:**
```tsx
import { trackHeroView, trackHeroCtaClick } from '@/lib/analytics/google-analytics';

export function BrandHeroTracked({ hero }) {
  useEffect(() => {
    // Track view on mount
    trackHeroView(hero.id, hero.brandName);
  }, [hero.id]);

  const handleCtaClick = (type: 'primary' | 'secondary') => {
    trackHeroCtaClick(
      hero.id,
      hero.brandName,
      type,
      type === 'primary' ? hero.primaryCta.label : hero.secondaryCta?.label || ''
    );

    // Then navigate...
  };

  return <BrandHero {...hero} onFindNearMe={() => handleCtaClick('primary')} />;
}
```

**Available Events:**

| Event | Description | Parameters |
|-------|-------------|------------|
| `hero_view` | Hero displayed to user | hero_id, hero_name |
| `hero_cta_click` | CTA button clicked | hero_id, hero_name, cta_type, cta_label |
| `hero_video_play` | Video started playing | hero_id, hero_name |
| `hero_video_complete` | Video finished | hero_id, hero_name |
| `hero_ab_test` | A/B test variant shown | hero_id, test_id, variant |

**Custom Dimensions:**

Set up these custom dimensions in GA4:
1. `hero_id` - Unique hero identifier
2. `hero_name` - Brand/hero name
3. `cta_type` - primary or secondary
4. `test_id` - A/B test identifier
5. `variant` - A or B

**View in GA4:**

1. **Engagement Overview**
   - Events → Filter by "hero_view"
   - See total hero impressions

2. **Conversions**
   - Mark "hero_cta_click" as conversion event
   - Track conversion rate per hero

3. **Custom Reports**
   - Dimensions: hero_name, cta_type
   - Metrics: hero_view, hero_cta_click
   - Calculate: CTR = cta_clicks / views

---

## 🚀 Quick Start - Phase 3

### 1. Video Background Hero

```typescript
// Upload video
const videoUpload = await uploadVideo(videoFile, orgId);

// Create hero with video
await createHero({
  brandName: 'Cannabis Co',
  tagline: 'Experience the Difference',
  videoBackground: {
    url: videoUpload.url,
    posterImage: hero.heroImage,
    muted: true,
    loop: true,
    autoplay: true,
  },
  // ... other fields
});
```

### 2. Use Template

```typescript
import { applyTemplate } from '@/lib/hero-templates';

const hero = applyTemplate('premium-flower', 'Your Brand', orgId, {
  brandLogo: 'https://...',
  stats: { products: 50, rating: 4.9 },
});

await createHero(hero);
```

### 3. Multi-language + Location

```typescript
await createHero({
  brandName: 'Cannabis Co',
  tagline: 'Premium Products',

  // Spanish translation
  languages: {
    es: {
      tagline: 'Productos Premium',
      description: '...',
      primaryCtaLabel: 'Comprar Ahora',
    },
  },

  // California-specific messaging
  locationPersonalization: {
    enabled: true,
    rules: [{
      condition: 'state',
      value: 'CA',
      customMessage: 'Same-day delivery in California!',
    }],
  },
});
```

### 4. Analytics Tracking

```tsx
'use client';

import { useEffect } from 'react';
import { trackHeroView, trackHeroCtaClick } from '@/lib/analytics/google-analytics';

export function HeroWithTracking({ hero }) {
  useEffect(() => {
    trackHeroView(hero.id, hero.brandName);
  }, []);

  return (
    <BrandHero
      {...hero}
      onFindNearMe={() => {
        trackHeroCtaClick(hero.id, hero.brandName, 'primary', 'Find Near Me');
        // Navigate...
      }}
    />
  );
}
```

---

## 📊 Analytics Dashboard (Future UI)

**Planned Features:**
- Real-time hero performance metrics
- Video engagement analytics (play rate, completion rate)
- Language preference breakdown
- Location heatmap (where users are viewing from)
- Template usage statistics
- Social sharing analytics

**Location:** `/dashboard/heroes?tab=analytics`

---

## 🎯 Real-World Examples

### Example 1: Luxury Brand Launch

```typescript
const hero = applyTemplate('luxury-brand', 'Diamond Cannabis', orgId, {
  videoBackground: {
    url: 'https://.../luxury-cannabis-process.mp4',
    posterImage: 'https://.../poster.jpg',
    muted: true,
    loop: true,
  },
  languages: {
    en: {
      tagline: 'Luxury Cannabis Redefined',
      description: 'Experience artisanal cannabis...',
    },
  },
  stats: {
    rating: 4.9,
    awards: ['Cannabis Cup Winner 2025'],
  },
});
```

### Example 2: 4/20 Bilingual Campaign

```typescript
const hero = applyTemplate('420-event', 'Cannabis Co', orgId, {
  languages: {
    en: {
      tagline: '4/20 Sale - Up to 50% Off',
      primaryCtaLabel: 'Shop Deals',
    },
    es: {
      tagline: 'Venta 4/20 - Hasta 50% de Descuento',
      primaryCtaLabel: 'Ver Ofertas',
    },
  },
  scheduledActivation: {
    startDate: new Date('2026-04-19'),
    endDate: new Date('2026-04-21'),
    autoDeactivate: true,
  },
});
```

### Example 3: Medical Dispensary (Location-based)

```typescript
const hero = applyTemplate('medical-focus', 'Wellness Dispensary', orgId, {
  locationPersonalization: {
    enabled: true,
    rules: [
      {
        condition: 'state',
        value: 'CA',
        customMessage: 'California medical patients: Get 10% off with valid card.',
      },
      {
        condition: 'state',
        value: 'CO',
        customMessage: 'Colorado patients: We accept out-of-state medical cards.',
      },
    ],
  },
});
```

---

## 🔧 Configuration

### Video Optimization

**FFmpeg Command for Optimization:**
```bash
ffmpeg -i input.mp4 \
  -vcodec libx264 \
  -crf 23 \
  -preset slow \
  -vf scale=1920:1080 \
  -acodec aac \
  -b:a 128k \
  -movflags +faststart \
  output.mp4
```

### Google Analytics Setup

**1. Create GA4 Property**
- Go to Google Analytics
- Create new GA4 property
- Get Measurement ID (G-XXXXXXXXXX)

**2. Set Custom Dimensions**
- Admin → Custom Definitions → Create custom dimensions
- Add: hero_id, hero_name, cta_type, test_id, variant

**3. Mark Conversions**
- Configure → Events → Mark "hero_cta_click" as conversion

---

## 🐛 Troubleshooting

### Video Not Playing on Mobile

**Solution:**
- Ensure `muted: true` (required for autoplay on mobile)
- Add `playsInline` attribute
- Provide poster image for iOS devices
- Use MP4 with H.264 codec

### Location Detection Not Working

**Solution:**
- Check Cloudflare/Vercel proxy headers are enabled
- Fallback to IP geolocation API
- Test with VPN to simulate different locations

### Translations Not Appearing

**Solution:**
- Verify `Accept-Language` header is set
- Check language code matches (ISO 639-1)
- Ensure `getUserContextFromHeaders()` is called server-side

---

## 🌟 Best Practices

### Video Guidelines
1. **Keep it short** - 10-30 seconds ideal for looping
2. **Optimize file size** - < 5MB preferred
3. **Provide poster** - Always include fallback image
4. **Test on mobile** - Ensure smooth playback
5. **Accessible** - Add descriptive text for screen readers

### Templates
1. **Customize, don't copy** - Use as starting point
2. **Brand consistency** - Update colors and fonts
3. **Test variations** - A/B test different templates
4. **Category match** - Choose template matching your business type

### Localization
1. **Professional translations** - Don't rely solely on machine translation
2. **Cultural awareness** - Adapt messaging to local norms
3. **Test with native speakers** - Verify accuracy
4. **Keep consistent** - Match brand voice across languages

### Location Personalization
1. **Relevant messaging** - Only personalize when value is clear
2. **Test extensively** - Verify rules work correctly
3. **Privacy first** - Don't be creepy with location data
4. **Fallback content** - Always have default message

---

## 📈 Performance Impact

**Video Heroes:**
- Initial load: +2-3 seconds (first visit)
- Cached: Same as image heroes
- Mobile data: 3-10 MB video download
- **Recommendation:** Use wisely, consider user context

**Templates:**
- Zero performance impact (static data)
- Speeds up hero creation time

**Localization:**
- Minimal impact (< 1KB additional data per language)
- Server-side processing (no client overhead)

**Analytics:**
- ~14KB gtag.js script
- Minimal event tracking overhead
- **Recommendation:** Essential for optimization

---

## 🚢 Deployment Checklist

- [ ] Upload video files to Firebase Storage
- [ ] Configure video optimization pipeline
- [ ] Test video playback on all devices
- [ ] Set up Google Analytics 4
- [ ] Create custom dimensions in GA4
- [ ] Test location detection (Cloudflare/Vercel headers)
- [ ] Add translations for target languages
- [ ] Configure location personalization rules
- [ ] Test social preview meta tags
- [ ] Verify structured data (Google Rich Results Test)
- [ ] Load test video bandwidth usage

---

## 🎓 Training & Documentation

**For Marketing Teams:**
- How to choose the right template
- When to use video vs static heroes
- Writing effective hero copy
- Location targeting best practices

**For Developers:**
- Video encoding and optimization
- Implementing custom templates
- GA4 event tracking
- Multi-language content management

---

**Ready for Phase 4?** We've built an enterprise-grade hero system! 🚀

**Next:** Analytics dashboard UI, automated video generation, AI-powered A/B test recommendations...

---

**Last Updated:** 2026-02-06
