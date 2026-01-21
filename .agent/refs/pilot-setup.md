# Pilot Setup Reference

Quick provisioning system for onboarding new dispensaries and hemp brands.

---

## Overview

The Pilot Setup feature allows super users (CEO/admin) to rapidly create fully configured pilot customers without manual database setup. It creates all necessary Firestore documents, Firebase Auth users, and configures the menu page in one action.

---

## Location

| Component | Path |
|-----------|------|
| **Server Action** | `src/server/actions/pilot-setup.ts` |
| **UI Component** | `src/app/dashboard/ceo/components/pilot-setup-tab.tsx` |
| **Dashboard Tab** | CEO Dashboard → Pilot Setup |

---

## Features

### 1. Quick Pilot Creation
- Creates Firebase Auth user with verified email
- Creates Brand document with theme, chatbot config
- Creates Organization with Empire plan (free pilot)
- Creates User profile with full permissions
- Sets custom claims for role-based access
- Generates menu URL at `bakedbot.ai/{slug}`

### 2. Two Pilot Types

#### Dispensary Pilot
- Local pickup model
- Physical address, phone, license number
- ZIP code SEO pages for local search
- Dispensary-style menu (hero carousel, featured brands)
- Fields: `type: 'dispensary'`, `menuDesign: 'dispensary'`

#### Brand Pilot (Hemp/E-Commerce)
- Online-only or hybrid purchase model
- Ships nationwide option
- Shipping address for returns
- Brand-style menu (brand hero, dispensary locator)
- Fields: `type: 'brand'`, `menuDesign: 'brand'`

### 3. URL Import
Import real products from dispensary/brand websites:
- **Fallback chain**: Website → Weedmaps → Leafly
- Auto-populates: name, colors, address, phone
- Imports products with images, THC%, prices
- Uses existing `/api/demo/import-menu` API (Firecrawl)

---

## TypeScript Interfaces

```typescript
// Brand Pilot Configuration
interface BrandPilotConfig {
    type: 'brand';
    email: string;
    password: string;
    brandName: string;
    brandSlug: string;
    tagline?: string;
    description?: string;
    website?: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor?: string;
    purchaseModel: 'online_only' | 'local_pickup' | 'hybrid';
    shipsNationwide: boolean;
    shippingAddress?: {
        street: string;
        city: string;
        state: string;
        zip: string;
    };
    contactEmail?: string;
    contactPhone?: string;
    chatbotEnabled: boolean;
    chatbotName?: string;
    chatbotWelcome?: string;
}

// Dispensary Pilot Configuration
interface DispensaryPilotConfig {
    type: 'dispensary';
    email: string;
    password: string;
    dispensaryName: string;
    dispensarySlug: string;
    tagline?: string;
    description?: string;
    website?: string;
    primaryColor: string;
    secondaryColor: string;
    address: string;
    city: string;
    state: string;
    zip: string;
    phone?: string;
    licenseNumber?: string;
    coordinates?: { lat: number; lng: number };
    hours?: Record<string, string>;
    chatbotEnabled: boolean;
    chatbotName?: string;
    chatbotWelcome?: string;
    zipCodes?: string[];  // For SEO pages
}

// Import Result
interface ImportedMenuData {
    dispensary: {
        name: string;
        tagline?: string;
        description?: string;
        logoUrl?: string;
        primaryColor?: string;
        secondaryColor?: string;
        phone?: string;
        address?: string;
        city?: string;
        state?: string;
    };
    products: Array<{
        name: string;
        brand?: string;
        category: string;
        price: number | null;
        thcPercent?: number | null;
        cbdPercent?: number | null;
        strainType?: string;
        description?: string;
        imageUrl?: string;
        effects?: string[];
        weight?: string;
    }>;
}
```

---

## Server Actions

### `setupPilotCustomer(config: PilotConfig)`
Creates all documents for a pilot customer.

**Creates:**
- `brands/{brand_slug}` - Brand/dispensary document
- `organizations/{org_slug}` - Organization with Empire plan
- `users/{uid}` - User profile with permissions
- `locations/{loc_slug}` - Location (dispensary only)
- `zip_pages/{pageId}` - SEO pages (dispensary only)

**Returns:**
```typescript
{
    success: boolean;
    message: string;
    data?: {
        userId: string;
        brandId: string;
        orgId: string;
        locationId?: string;
        menuUrl: string;
    };
    error?: string;
}
```

### `addPilotProducts(brandId, products)`
Adds products to a pilot brand.

### `importMenuFromUrl(url)`
Imports menu data from website/Weedmaps/Leafly.

---

## Firestore Document Structure

### Brand Document
```javascript
{
    id: 'brand_slug',
    name: 'Brand Name',
    slug: 'brandslug',
    type: 'brand' | 'dispensary',
    menuDesign: 'brand' | 'dispensary',
    verified: true,
    ownerId: 'uid',
    theme: {
        primaryColor: '#16a34a',
        secondaryColor: '#000000',
        accentColor: '#FFFFFF'
    },
    chatbotConfig: {
        enabled: true,
        botName: 'Smokey',
        welcomeMessage: '...'
    },
    purchaseModel: 'online_only' | 'local_pickup' | 'hybrid',
    shipsNationwide: true | false,
    // ... location fields for dispensaries
}
```

### Organization Document
```javascript
{
    id: 'org_slug',
    name: 'Brand Name',
    type: 'brand' | 'dispensary',
    ownerId: 'uid',
    brandId: 'brand_slug',
    billing: {
        subscriptionStatus: 'active',
        planId: 'empire',
        planName: 'Empire (Pilot)',
        monthlyPrice: 0
    }
}
```

---

## UI Components

### Success View
After successful creation, shows:
- Login credentials (email, password with copy buttons)
- Menu URL with external link
- User/Brand IDs for reference
- "Create Another Pilot" button

### Import Section
- URL input with Globe icon
- Import button with loading state
- Error alert for failures
- Success badge showing product count
- Product preview badges (first 5 + count)

---

## Related Files

| File | Purpose |
|------|---------|
| `src/types/products.ts` | Brand type with purchaseModel, menuDesign |
| `src/app/[brand]/brand-menu-client.tsx` | Menu rendering (brand vs dispensary mode) |
| `src/app/[brand]/layout.tsx` | Brand page layout |
| `src/components/demo/demo-header.tsx` | Dispensary menu header |
| `src/components/demo/brand-menu-header.tsx` | Brand menu header |
| `dev/update-thrive-syracuse.ts` | Example update script |

---

## Example: Thrive Syracuse Setup

```typescript
const config: DispensaryPilotConfig = {
    type: 'dispensary',
    email: 'thrivesyracuse@bakedbot.ai',
    password: 'Smokey123!!@@',
    dispensaryName: 'Thrive Syracuse',
    dispensarySlug: 'thrivesyracuse',
    primaryColor: '#27c0dd',  // Teal
    secondaryColor: '#f1b200', // Gold
    address: '123 Main St',
    city: 'Syracuse',
    state: 'NY',
    zip: '13210',
    chatbotEnabled: true,
    chatbotName: 'Thrive Bot',
    zipCodes: ['13210', '13214', '13215']
};
```

---

## Menu Design Modes

The `menuDesign` field controls which layout renders:

### Dispensary Mode (`menuDesign: 'dispensary'`)
- `DemoHeader` - Full nav with deals ticker
- `HeroCarousel` - Promotional slides
- `FeaturedBrandsCarousel` - Brand logos
- Category sections with carousels

### Brand Mode (`menuDesign: 'brand'`)
- `BrandMenuHeader` - Simplified header
- `BrandHero` - Hero with stats/CTAs
- Product grid with filters
- Dispensary locator flow (for local_pickup)
- Shipping checkout (for online_only)

---

*Last updated: January 2026*
