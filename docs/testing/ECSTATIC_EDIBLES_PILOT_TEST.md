# Ecstatic Edibles Pilot Testing Guide

**Version:** 1.0
**Date:** January 2026
**Pilot Customer:** Ecstatic Edibles (ecstaticedibles@bakedbot.ai)
**Test URL:** https://bakedbot.ai/ecstaticedibles

---

## Overview

This guide walks through end-to-end testing of the BakedBot headless menu for **Ecstatic Edibles**, our first **hemp e-commerce pilot customer**. Unlike dispensary brands, Ecstatic Edibles operates an **online-only shipping model** - no local pickup, no dispensary locator.

### Key Differences from Dispensary Model
| Feature | Dispensary (Cannabis) | Ecstatic Edibles (Hemp) |
|---------|----------------------|-------------------------|
| Purchase Model | Local Pickup | Online Shipping |
| "Find Near Me" | Visible | **Hidden** |
| Checkout | Dispensary selection | Shipping address |
| Messaging | "Pickup at Dispensary" | "Ships Nationwide" |
| Product Type | Cannabis | Hemp (CBD/Delta-8) |

---

## Pre-Test Setup

### 1. Run Configuration Script

First, configure the Ecstatic Edibles brand in Firestore:

```bash
cd c:\Users\admin\BakedBot for Brands\bakedbot-for-brands
npx tsx dev/configure-ecstatic-edibles.ts
```

**Expected Output:**
```
🎉 ECSTATIC EDIBLES PILOT CONFIGURATION COMPLETE!
============================================================
📧 Email: ecstaticedibles@bakedbot.ai
🏷️  Brand ID: brand_ecstatic_edibles
🏢 Org ID: org_ecstatic_edibles
🔗 Brand URL: https://bakedbot.ai/ecstaticedibles
🎨 Theme: Red (#DC2626), Black (#000000), White (#FFFFFF)
📦 Purchase Model: Online Only (Shipping)
💰 Plan: Pilot Partner (Free)
```

### 2. Sign In to Brand Dashboard

1. Navigate to: https://bakedbot.ai/brand-login
2. Sign in with: `ecstaticedibles@bakedbot.ai`
3. Clear browser cache if you encounter auth errors (tokens were revoked)
4. Verify redirect to `/dashboard/brand`

---

## Part 1: Create Test Products

Create 2 products for testing the menu. Engineers will add product images.

### Product 1: Snickerdoodle Bites

**Navigate to:** Dashboard → Products → New Product
**URL:** https://bakedbot.ai/dashboard/products/new

| Field | Value |
|-------|-------|
| Product Name | `Snickerdoodle Bites` |
| Description | `Indulge in the warm, nostalgic flavors of cinnamon and sugar with our Snickerdoodle Bites. Each delicious morsel delivers a precise 25mg of premium hemp-derived Delta-8 THC for a smooth, euphoric experience. Perfect for unwinding after a long day.` |
| Category | `Edibles` |
| Base Price | `24.99` |
| Image URL | `[ENGINEER: Add product image URL here]` |
| Image Hint | `snickerdoodle cookie hemp edible gummy` |
| Featured | ✅ Checked |
| Sort Order | `1` |

**Hemp/Edibles Details:**
| Field | Value |
|-------|-------|
| Weight (g) | `50` |
| Servings | `10` |
| mg per Serving | `25` |
| Available for Shipping | ✅ Checked |

---

### Product 2: Cheesecake Bliss Gummies

**Navigate to:** Dashboard → Products → New Product

| Field | Value |
|-------|-------|
| Product Name | `Cheesecake Bliss Gummies` |
| Description | `Experience dessert-inspired bliss with our Cheesecake Gummies. Crafted with premium hemp-derived CBD and Delta-8, each gummy delivers 15mg of cannabinoids in a creamy, tangy cheesecake flavor. A guilt-free treat for any time of day.` |
| Category | `Edibles` |
| Base Price | `29.99` |
| Image URL | `[ENGINEER: Add product image URL here]` |
| Image Hint | `cheesecake gummy hemp edible candy` |
| Featured | ✅ Checked |
| Sort Order | `2` |

**Hemp/Edibles Details:**
| Field | Value |
|-------|-------|
| Weight (g) | `75` |
| Servings | `15` |
| mg per Serving | `15` |
| Available for Shipping | ✅ Checked |

---

## Part 2: Test Brand Menu (Public Page)

Navigate to: **https://bakedbot.ai/ecstaticedibles**

### 2.1 Top Bar Verification

**Current (BROKEN):**
```
Lab Tested Products | Order Online, Pickup at Dispensary | 500+ Retail Partners
```

**Expected (FIXED):**
```
Lab Tested Products | Free Shipping on Orders $50+ | Ships Nationwide
```

**Test Checklist:**
- [ ] "Order Online, Pickup at Dispensary" is **NOT** visible
- [ ] "500+ Retail Partners" is **NOT** visible
- [ ] "Ships Nationwide" **IS** visible
- [ ] "Free Shipping" messaging **IS** visible

---

### 2.2 Header Navigation

**Current (BROKEN):**
```
[Search] | Products | About | Find Near Me | [Cart] | [User]
```

**Expected (FIXED):**
```
[Search] | Products | About | [Cart] | [User]
```

**Test Checklist:**
- [ ] "Find Near Me" nav link is **NOT** visible
- [ ] Products link works
- [ ] About link works
- [ ] Search bar placeholder shows "Search Ecstatic Edibles products..."
- [ ] Cart icon shows item count when items added

---

### 2.3 Hero Section

**Current (BROKEN):**
```
Discover undefined's collection of premium cannabis products.
Order online and pick up at a dispensary near you.

[Find Near Me] [Shop Products]

Order Online → Pick Up at a Dispensary → Near You
```

**Expected (FIXED):**
```
Discover Ecstatic Edibles's collection of premium products.
Shop online and get them shipped directly to your door.

[Shop Products] [View All Products]

Ships Nationwide → Free Shipping → Delivered to Your Door
```

**Test Checklist:**
- [ ] Brand name "Ecstatic Edibles" appears (not "undefined")
- [ ] Description mentions "shipped to your door" (not "dispensary")
- [ ] "Find Near Me" button is **NOT** visible
- [ ] "Shop Products" button **IS** visible
- [ ] Right side panel shows shipping messaging (not dispensary)
- [ ] "Ships Nationwide" badge visible if `shipsNationwide: true`
- [ ] Theme colors: Red (#DC2626) primary

---

### 2.4 Shop by Category Section

**Current (BROKEN - Shows all cannabis categories):**
```
Flower (156) | Pre-Rolls (89) | Vapes (124) | Edibles (78) | Concentrates (67) | Tinctures (34) | Topicals (45) | Accessories (52)
```

**Expected (FIXED - Hemp-relevant categories):**
For online_only hemp brands, categories should reflect actual products:

```
Edibles (2) | [Other categories based on actual product count]
```

**Test Checklist:**
- [ ] Category counts match actual product inventory
- [ ] Clicking "Edibles" filters to show Snickerdoodle Bites and Cheesecake Bliss Gummies
- [ ] Categories with 0 products are hidden or show "0 items"

---

### 2.5 Product Display

**Test Checklist:**
- [ ] "Snickerdoodle Bites" appears with correct price ($24.99)
- [ ] "Cheesecake Bliss Gummies" appears with correct price ($29.99)
- [ ] Product images load correctly
- [ ] "Add to Cart" button works
- [ ] Featured products appear prominently
- [ ] Clicking product opens detail modal

**Product Detail Modal:**
- [ ] Shows full description
- [ ] Shows serving info (10 servings, 25mg each)
- [ ] Shows weight
- [ ] "Add to Cart" button in modal works

---

### 2.6 Footer Section

**Current (BROKEN):**
```
Contact:
420 Cannabis Ave
San Francisco, CA 94102
(555) 420-0420
hello@bakedbot.ai
```

**Expected (FIXED):**
```
Contact:
25690 Frampton Ave #422
Harbor City, CA 90710
ecstaticedibles@bakedbot.ai
```

**Test Checklist:**
- [ ] Shipping address shows "25690 Frampton Ave #422"
- [ ] City shows "Harbor City, CA 90710"
- [ ] Email shows "ecstaticedibles@bakedbot.ai"
- [ ] Footer links appropriate for online brand (no "Locations" link)
- [ ] Trust badge shows "Free Shipping" (not "Fast Delivery")

---

## Part 3: Test Checkout Flow

### 3.1 Add Items to Cart

1. Click "Add to Cart" on Snickerdoodle Bites
2. Click "Add to Cart" on Cheesecake Bliss Gummies
3. Open cart slide-over

**Test Checklist:**
- [ ] Cart shows 2 items
- [ ] Cart total: $54.98 ($24.99 + $29.99)
- [ ] Can update quantities
- [ ] Can remove items

### 3.2 Checkout Flow

Click "Checkout" in cart.

**For Online Only Brands:**
- [ ] Should route to **Shipping Checkout Flow** (not dispensary locator)
- [ ] No dispensary selection step
- [ ] Should collect shipping address
- [ ] Should show shipping options

**Test Checklist:**
- [ ] Checkout does NOT show "Select a Dispensary"
- [ ] Checkout collects shipping address
- [ ] Order summary shows correct totals

---

## Part 4: Test AI Carousel Generator

Navigate to: **Dashboard → Creative Center → Hero Carousel tab**
**URL:** https://bakedbot.ai/dashboard/brand/creative

### 4.1 Carousel Generator UI

**Test Checklist:**
- [ ] "Hero Carousel" tab is visible in Creative Center
- [ ] Carousel Generator component loads
- [ ] Brand name pre-filled or editable
- [ ] Prompt input field available
- [ ] Slide count selector (2-5 slides)
- [ ] Image quality tier selector (Free: Gemini 2.5 Flash, Premium: Gemini 3)

### 4.2 Generate Carousel Copy

1. Enter prompt: `Celebrate hemp wellness with delicious edibles`
2. Set slide count: 3
3. Select quality: Free (Gemini 2.5 Flash)
4. Click "Generate"

**Expected Output (JSON):**
```json
{
  "slides": [
    {
      "headline": "Discover Hemp Happiness",
      "subheadline": "Premium edibles crafted for your wellness journey",
      "ctaText": "Shop Now"
    },
    {
      "headline": "Taste the Bliss",
      "subheadline": "Snickerdoodle Bites and Cheesecake Gummies await",
      "ctaText": "Explore Edibles"
    },
    {
      "headline": "Ships Nationwide",
      "subheadline": "Free shipping on orders over $50",
      "ctaText": "Order Today"
    }
  ]
}
```

**Test Checklist:**
- [ ] Generate button triggers API call
- [ ] Loading state shown during generation
- [ ] Generated slides display in preview
- [ ] Headline, subheadline, CTA text populated
- [ ] Can regenerate with different prompt
- [ ] Error handling if API fails

### 4.3 Carousel Preview

- [ ] Preview shows generated slides
- [ ] Color palette matches brand theme (red/black/white)
- [ ] Slides can be cycled through
- [ ] Copy can be edited manually after generation

---

## Part 5: Smokey AI Chatbot

### 5.1 Chatbot Availability

- [ ] Chat bubble appears on brand menu page
- [ ] Chatbot name is "Eddie" (configured in brand chatbotConfig)
- [ ] Welcome message appears on open

**Expected Welcome Message:**
```
Hey! I'm Eddie from Ecstatic Edibles. Looking for premium hemp edibles?
I can help you find the perfect treat!
```

### 5.2 Chatbot Interaction

Test questions:
1. "What products do you have?"
2. "Tell me about the Snickerdoodle Bites"
3. "Do you ship to California?"
4. "What's the difference between CBD and Delta-8?"

**Test Checklist:**
- [ ] Eddie responds with product information
- [ ] Eddie mentions shipping (not pickup)
- [ ] Tone matches: "friendly, knowledgeable, enthusiastic"
- [ ] Can recommend products based on preferences

---

## Part 6: Mobile Responsiveness

Test all above scenarios on:
- [ ] iPhone (Safari)
- [ ] Android (Chrome)
- [ ] Tablet (iPad)

**Mobile-Specific Checks:**
- [ ] Hamburger menu works
- [ ] Mobile menu hides "Find Near Me" for online_only
- [ ] Cart slide-over works on mobile
- [ ] Product grid responsive
- [ ] Checkout flow usable on mobile

---

## Part 7: Unit Tests Verification

Run the test suite to verify all components:

```bash
npm test -- --testPathPattern="(brand-hero|brand-menu-header|demo-footer|carousel-generator|generate-carousel)" --no-coverage
```

**Expected Results:**
```
Test Suites: 5 passed, 5 total
Tests:       78 passed, 78 total
```

**Test Files:**
- `src/components/demo/__tests__/brand-hero.test.tsx` - 15 tests
- `src/components/demo/__tests__/brand-menu-header.test.tsx` - 14 tests
- `src/components/demo/__tests__/demo-footer.test.tsx` - 18 tests
- `src/components/brand/creative/__tests__/carousel-generator.test.tsx` - 16 tests
- `src/app/api/creative/generate-carousel/__tests__/route.test.ts` - 15 tests

---

## Bug Report Template

If you find issues, report using this format:

```markdown
### Bug: [Short Description]

**URL:** [Page URL]
**Component:** [Component name]
**Expected:** [What should happen]
**Actual:** [What actually happens]
**Screenshot:** [Attach screenshot]
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Severity:** Critical / High / Medium / Low
```

---

## Production Readiness Checklist

Before launch, verify:

- [ ] All "undefined" text replaced with brand name
- [ ] No dispensary-related UI for online_only brands
- [ ] Shipping checkout flow complete
- [ ] Products display correctly with images
- [ ] Cart and checkout functional
- [ ] AI carousel generator working
- [ ] Chatbot responds appropriately
- [ ] Mobile experience polished
- [ ] All unit tests passing
- [ ] Type check passes (`npm run check:types`)
- [ ] No console errors
- [ ] Performance acceptable (< 3s page load)

---

## Support Contacts

- **Engineering:** Linus (Claude Agent)
- **Issues:** https://github.com/admin-baked/bakedbot-for-brands/issues
- **Pilot Customer Email:** ecstaticedibles@bakedbot.ai

---

*Last Updated: January 2026*
