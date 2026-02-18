# Vibe Builder - Visual Website Builder

**Status:** ✅ Week 3 Complete + ✅ Testing Complete (150 Unit Tests)
**Date:** 2026-02-11
**Last Updated:** 2026-02-18 (Test Suite Added)

## Implementation Status

| Feature | Status | Tests | Key Files |
|---------|--------|-------|-----------|
| GrapesJS Visual Editor | ✅ Complete | N/A | `src/app/vibe/builder/editor/page.tsx` |
| Project Management | ✅ Complete | 26 | `src/server/actions/vibe-projects.ts` |
| Template Marketplace | ✅ Complete | N/A | `src/app/vibe/templates/page.tsx`, `src/server/actions/template-marketplace.ts` |
| Template Admin (Approval) | ✅ Complete | N/A | `src/app/dashboard/admin/templates/page.tsx`, `src/server/actions/template-admin.ts` |
| Publishing System | ✅ Complete | 50 | `src/server/actions/vibe-publish.ts`, `src/app/vibe/builder/publish/page.tsx` |
| Site Serving | ✅ Complete | N/A | `src/app/api/site/[subdomain]/route.ts`, `src/app/api/vibe/site/[projectId]/route.ts` |
| Unified Domain Management | ✅ Complete | 22 | `src/app/dashboard/domains/page.tsx`, `src/server/actions/domain-management.ts` |
| Next.js Middleware (Domain Routing) | ✅ Complete | 28 | `src/middleware.custom-domain.ts` |
| Domain Routing Utils | ✅ Complete | 24 | `src/lib/domain-routing.ts` |
| Vibe Backend Generator | ✅ Complete | N/A | `src/server/services/vibe-backend-generator.ts` |
| GitHub Integration (Vibe) | ✅ Complete | N/A | `src/server/services/vibe-github.ts` |

## Architecture

```
Vibe Studio (/vibe) → Theme Generation → Lead Capture
       ↓
Vibe Builder (/vibe/builder) → GrapesJS Editor → Project Management
       ↓                                              ↓
Template Marketplace (/vibe/templates)           Publishing
       ↓                                              ↓
Browse/Search/Install                    *.bakedbot.site (subdomain)
                                                      ↓
                                         Custom Domains (/dashboard/domains)
                                                      ↓
                                         menu | vibe_site | hybrid routing
```

## Firestore Collections

| Collection | Purpose |
|------------|---------|
| `vibe_projects` | User projects (HTML, CSS, components, styles) |
| `vibe_published_sites` | Published sites with subdomain, analytics |
| `vibe_templates` | Community templates with approval workflow |
| `domain_mappings/{domain}` | Unified domain → target routing |
| `tenants/{id}/domains/{domain}` | Per-tenant domain subcollection |

---

## 🎯 Purpose

**Vibe Builder** is the middle tier between simple theme generation and full code editing. It targets **non-technical dispensary owners** who want to build professional websites without coding.

**User Persona:**
- Name: Sarah, Dispensary Owner
- Tech level: "I can use Squarespace"
- Goal: "Launch my menu site this weekend"
- Budget: $99/month
- Pain point: "I don't know React/Next.js"

---

## 🎨 UI/UX Design

### Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│ Top Bar: [Logo] My Dispensary [Save] [Preview] [Publish]    │
├───────┬─────────────────────────────────────────┬───────────┤
│       │                                         │           │
│ Block │         Canvas                          │ Settings  │
│ Panel │         (Page Editor)                   │ Panel     │
│       │                                         │           │
│ [+]   │  ┌───────────────────────┐              │ Element:  │
│ Hero  │  │ [Hero Block]          │              │ Button    │
│ Text  │  │ "Welcome to..."       │              │           │
│ Image │  │                       │              │ Text: ... │
│ Menu  │  └───────────────────────┘              │ Color: □  │
│ Form  │                                         │ Size: ▼   │
│ Cart  │  ┌───────────────────────┐              │           │
│ ───   │  │ [Product Grid]        │              │           │
│ Save  │  │ [🌿] [🌿] [🌿]        │              │           │
│ ───   │  │                       │              │           │
│ Cust  │  └───────────────────────┘              │           │
│       │                                         │           │
│       │  ┌───────────────────────┐              │           │
│       │  │ [Contact Form]        │              │           │
│       │  └───────────────────────┘              │           │
│       │                                         │           │
└───────┴─────────────────────────────────────────┴───────────┘
```

### Top Bar (Fixed)

| Element | Function | Notes |
|---------|----------|-------|
| **Logo** | BakedBot Vibe Builder | Links to /vibe |
| **Project Name** | "My Dispensary" (editable) | Click to rename |
| **Undo/Redo** | ↶ ↷ | Standard edit history |
| **Device Toggle** | 💻 📱 | Desktop/mobile preview |
| **Save** | 💾 Auto-saves | Shows "Saving..." indicator |
| **Preview** | 👁️ Opens in new tab | Live site preview |
| **Publish** | 🚀 Primary CTA | Deploy to *.bakedbot.ai |

### Left Sidebar: Block Library

**Categories:**
1. **Layout** - Containers, sections, columns
2. **Content** - Text, images, videos, icons
3. **Cannabis** - Product grids, menus, strain cards
4. **Forms** - Contact, newsletter, age gate
5. **E-commerce** - Cart, checkout, loyalty signup
6. **Social** - Instagram feed, reviews, maps

**Each Block Card:**
- Thumbnail preview
- Block name
- Drag handle icon
- Hover: "Click or drag to add"

### Center Canvas: Page Editor

**Features:**
- **Drag-and-drop** blocks from sidebar
- **Click to select** - highlights with blue border
- **Hover indicators** - show drop zones
- **Live editing** - double-click text to edit inline
- **Reordering** - drag blocks up/down
- **Nesting** - drag blocks into containers
- **Responsive** - toggle between desktop/tablet/mobile
- **Grid overlay** - optional grid lines for alignment

**Interactions:**
- Single click: Select element → show properties
- Double click: Edit text inline
- Drag: Move or reorder
- Right click: Context menu (duplicate, delete, lock)
- Delete key: Remove selected element
- Ctrl+C/V: Copy/paste
- Ctrl+Z: Undo

### Right Sidebar: Properties Panel

**Dynamic based on selection:**

#### No Selection
- Shows page settings
  - Page title
  - SEO metadata
  - Background color/image
  - Custom CSS (advanced)

#### Block Selected
- **Layout**
  - Width (full/contained/custom)
  - Padding/margins (slider)
  - Alignment (left/center/right)
- **Style**
  - Background (color/gradient/image)
  - Border (width, radius, color)
  - Shadow (preset or custom)
- **Advanced**
  - Custom CSS class
  - Visibility conditions
  - Animation (fade in, slide up, etc.)

#### Product Grid Selected
- **Data Source**
  - All products
  - Category filter (Flower, Edibles, etc.)
  - Tag filter
  - Featured only
- **Layout**
  - Columns (2/3/4)
  - Card style (minimal/detailed/modern)
  - Sort by (name/price/popularity)
- **Display**
  - Show price
  - Show THC/CBD
  - Show add to cart
  - Show quick view

#### Text Block Selected
- **Content**
  - Rich text editor
  - Heading level (H1-H6)
  - Link (URL, email, phone)
- **Typography**
  - Font family (dropdown)
  - Size (slider or px)
  - Weight (light/regular/bold)
  - Color (color picker)
  - Alignment
- **Effects**
  - Text shadow
  - Letter spacing
  - Line height

#### Button Selected
- **Content**
  - Button text
  - Icon (optional)
- **Action**
  - Link to page
  - Open modal
  - Add to cart
  - Submit form
- **Style**
  - Variant (primary/secondary/outline/ghost)
  - Size (sm/md/lg)
  - Full width toggle
  - Color overrides

---

## 🧩 Block Library Details

### 1. Hero Blocks

#### Hero with Image
- Full-width background image
- Overlaid heading + subheading
- CTA button
- Optional: Video background

#### Hero with Split
- Left: Image
- Right: Text + CTA
- Responsive: Stacks on mobile

#### Hero Minimal
- Centered text
- No image
- Clean typography

### 2. Product Blocks

#### Product Grid
- Fetches live products from POS
- Filterable by category/tag
- Configurable columns (2-4)
- Card variants:
  - **Minimal:** Image + name + price
  - **Detailed:** + description + THC% + effects
  - **Modern:** Large image + hover effects

#### Product Carousel
- Horizontal scrolling
- Arrow navigation
- Auto-play option

#### Featured Product
- Single product spotlight
- Large image
- Full description
- Add to cart CTA

#### Product Categories
- Grid of category cards
- Click to filter

### 3. Form Blocks

#### Contact Form
- Name, email, message
- Configurable fields
- Email notification setup
- Spam protection (reCAPTCHA)

#### Newsletter Signup
- Email only
- Connects to Mailjet
- Success message customizable

#### Age Verification
- Required for cannabis sites
- "Are you 21+" prompt
- Remembers with cookie
- Redirects if declined

#### Custom Form
- Build your own
- Drag-drop form fields
- Conditional logic
- Integrations: Firestore, Google Sheets, Zapier

### 4. E-commerce Blocks

#### Shopping Cart
- Slide-out drawer
- Mini cart icon (badge count)
- Update quantities
- Remove items
- Subtotal/tax display

#### Checkout Form
- Shipping info
- Payment method selector
- Order summary
- Smokey Pay integration

#### Loyalty Signup
- BakedBot loyalty program
- Points display
- Rewards catalog

### 5. Content Blocks

#### Text Block
- Rich text editor
- Markdown support
- Multiple paragraphs
- Lists, bold, italic, links

#### Image Block
- Upload or URL
- Alt text for SEO
- Link target
- Caption

#### Video Block
- YouTube/Vimeo embed
- Auto-play toggle
- Controls toggle

#### Spacer
- Adjustable height
- For vertical spacing

#### Divider
- Horizontal line
- Customizable style/color

### 6. Layout Blocks

#### Container
- Max-width wrapper
- Centers content
- Padding control

#### Section
- Full-width background
- Contains multiple blocks
- Padding/margin

#### Columns
- 2, 3, or 4 columns
- Responsive stacking
- Adjustable widths

#### Grid
- Custom rows/columns
- Drag blocks into cells

### 7. Social Blocks

#### Instagram Feed
- Pull latest posts
- Requires IG API key
- Grid or carousel layout

#### Reviews
- Google Reviews integration
- Star rating display
- Testimonial carousel

#### Google Map
- Embed dispensary location
- Custom marker
- Directions link

#### Social Links
- Icon row (IG, Twitter, FB)
- Customizable colors
- Opens in new tab

---

## 🔌 POS Integration

### Supported POS Systems
1. **Alleaves** (fully integrated)
2. **Dutchie** (API available)
3. **Treez** (API available)
4. **Manual CSV** (fallback)

### Product Data Flow

```
┌─────────────┐       ┌─────────────┐       ┌─────────────┐
│ POS System  │──────►│ BakedBot    │──────►│ Builder     │
│ (Alleaves)  │ API   │ Sync        │ Cache │ (Products)  │
└─────────────┘       └─────────────┘       └─────────────┘
```

**Sync Frequency:**
- Real-time: Inventory checks on page load
- Hourly: Full product catalog sync
- Manual: "Refresh Products" button

**Product Fields Available:**
- Name, description, category, brand
- Price (regular + sale)
- THC%, CBD%, effects
- Images (up to 5)
- Inventory count
- Variants (sizes, strains)

### Product Grid Configuration

**In Builder:**
1. Drag "Product Grid" block to canvas
2. Click block → Properties panel
3. **Data Source:**
   - Radio: "All Products" / "Specific Category" / "Tagged Items"
   - If category: Dropdown of categories from POS
   - If tags: Multi-select tags
4. **Display:**
   - Columns: Slider 2-4
   - Card style: Dropdown with previews
   - Show price: Toggle
   - Show THC/CBD: Toggle
   - Add to cart: Toggle (requires checkout)
5. **Advanced:**
   - Max products: Number input (default 20)
   - Sort by: Dropdown (name, price, popularity, newest)
   - Filter bar: Toggle (let customers filter)

**Generated Output:**
- Creates Next.js component
- Fetches from `/api/products` endpoint
- Client-side filtering/sorting
- Lazy loading for performance

---

## 💳 Payment & Checkout

### Payment Provider Selection

**In Builder Settings:**
- Navigate to: Settings → Payments
- Choose provider:
  - [ ] Authorize.net (cannabis-friendly)
  - [ ] Stripe (CBD only)
  - [ ] Square CBD (cannabis)
  - [ ] Cash on Delivery

**For each provider:**
- API credentials form
- Test mode toggle
- Transaction fee display
- Setup wizard

### Checkout Flow

**Auto-generated pages:**
1. `/cart` - Shopping cart
2. `/checkout` - Checkout form
3. `/checkout/confirmation` - Order success

**Customization Options:**
- Colors/branding
- Required fields
- Shipping options
- Tax calculation (manual or API)
- Email notifications (templates)

---

## 🚀 Deployment

### Publish Wizard

**Step 1: Preview**
- "Your site is ready to publish!"
- Preview URL: `{brandSlug}-preview.bakedbot.ai`
- "Test your site before going live"

**Step 2: Domain**
- Choose subdomain: `{brandSlug}.bakedbot.ai`
- Or connect custom domain: `yourdispensary.com`
  - DNS instructions
  - Verification (TXT record)

**Step 3: Settings**
- Site name
- SEO title & description
- Favicon upload
- Analytics (GA4 optional)

**Step 4: Go Live**
- [Publish Site] button
- Progress bar: "Building... Deploying... Done!"
- Success: "Your site is live at {url}"
- Share links (Twitter, Facebook, Email)

### Behind the Scenes

**Build Process:**
1. Convert GrapesJS JSON to Next.js components
2. Generate API routes for products/cart
3. Set up Firebase Auth
4. Configure Smokey Pay
5. Deploy to Firebase App Hosting
6. Update DNS (if custom domain)
7. Send confirmation email

**Build Time:** ~2-3 minutes

---

## 🎓 Onboarding Flow

### First-Time Builder Experience

**Step 1: Welcome Modal**
- "Welcome to Vibe Builder!"
- "Build a professional site in minutes"
- [Start Tour] or [Skip]

**Step 2: Template Selection**
- "Start from a template or blank canvas?"
- Shows 6 templates (dispensary/delivery focused)
- Hover: Live preview
- Click: "Use this template"

**Step 3: Quick Customize**
- "Let's personalize your site"
- Form:
  - Business name
  - Primary color (color picker with brand examples)
  - Logo upload (optional)
- [Continue]

**Step 4: Product Connection**
- "Connect your product catalog"
- Options:
  - [ ] Connect POS (Alleaves/Dutchie/Treez)
  - [ ] Upload CSV
  - [ ] Start with sample products
- [Connect] button

**Step 5: Landing in Builder**
- Template loaded with their branding
- Tooltips point to key areas:
  - "Add blocks here"
  - "Edit text by double-clicking"
  - "Publish when ready"
- [Got it!]

**Total time:** ~3 minutes

---

## 🧠 AI Features

### AI Block Generator

**Trigger:** "+ AI Block" button in block library

**Flow:**
1. User clicks "+ AI Block"
2. Modal: "What do you want to add?"
3. Text input: "Create a hero section for a luxury dispensary with dark tones"
4. [Generate] → 10 seconds
5. Previews 3 AI-generated blocks
6. User selects one
7. Block added to canvas

**Implementation:**
- Use Claude to generate GrapesJS JSON
- Provide context: Current page structure, brand colors, existing content
- Generate 3 variants for A/B testing

### AI Copywriting

**Trigger:** "Write with AI" button in text editor

**Flow:**
1. User selects text block
2. Properties panel: [✨ Write with AI]
3. Prompt: "Rewrite this section to be more welcoming"
4. AI generates 3 options
5. User picks one or edits

**Use Cases:**
- Product descriptions
- Hero headlines
- About page copy
- Meta descriptions (SEO)

### AI Image Generation

**Trigger:** "Generate Image" in image block

**Flow:**
1. User adds image block
2. Instead of upload, clicks "Generate with AI"
3. Prompt: "Cannabis leaf in neon green on dark background"
4. Generates via Gemini Imagen
5. User selects or regenerates

---

## 📊 Analytics Dashboard

**Built-in Analytics Page:**
- `/builder/analytics` (inside Builder UI)

**Metrics:**
- Page views (7/30/90 days)
- Top pages
- Traffic sources
- Conversion funnel:
  - Homepage → Products → Cart → Checkout → Success
- Revenue (if e-commerce enabled)
- Cart abandonment rate

**Exports:**
- CSV download
- Connect to Google Analytics 4
- Webhook to BigQuery

---

## 💰 Pricing & Limits

### Free Tier (NOT AVAILABLE)
- Builder requires paid plan

### Builder Tier - $99/month
- Visual builder (full access)
- 1 custom domain OR *.bakedbot.ai subdomain
- POS integration (1 location)
- Up to 500 products
- 10,000 page views/month
- Smokey Pay (1% transaction fee)
- Email support

### IDE Tier - $249/month
- Everything in Builder +
- Code editor access
- Unlimited domains
- Multi-location POS sync
- Unlimited products
- Unlimited page views
- Real-time collaboration (5 seats)
- VS Code extension
- 0% transaction fee (BYO merchant account)
- Priority support

**Add-ons:**
- +$50/mo: 5 extra collaboration seats
- +$100/mo: Whitelabel (remove BakedBot branding)
- +$50/mo: Advanced analytics (heatmaps, session recordings)

---

## 🔧 Technical Architecture

### Frontend

```typescript
// Tech stack
- Next.js 15 (App Router)
- GrapesJS (visual editor core)
- @grapesjs/react (React wrapper)
- React Hook Form (forms)
- Zustand (state management)
- Tailwind CSS (styling)
- ShadCN UI (components)
```

### Backend

```typescript
// API Routes
/api/builder/
  - POST /save-project
  - POST /deploy
  - GET /templates
  - POST /generate-block (AI)

/api/products/
  - GET / (fetch from POS)
  - GET /:id
  - POST /sync (manual refresh)

/api/cart/
  - GET /
  - POST /add
  - PUT /update
  - DELETE /remove

/api/checkout/
  - POST /create-order
  - POST /process-payment
```

### Data Models

```typescript
// Builder Project
interface BuilderProject {
  id: string;
  userId: string;
  name: string;
  brandSlug: string; // URL-safe name
  grapesConfig: object; // GrapesJS JSON
  settings: {
    primaryColor: string;
    logo: string;
    favicon: string;
    seo: SEOSettings;
    payments: PaymentSettings;
    pos: POSSettings;
  };
  pages: BuilderPage[]; // Multiple pages support
  deployedUrl?: string;
  status: 'draft' | 'published';
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
}

// Builder Page
interface BuilderPage {
  id: string;
  projectId: string;
  path: string; // e.g., "/", "/about", "/products"
  title: string;
  grapesConfig: object; // Page-specific config
  seo: SEOSettings;
}

// POS Settings
interface POSSettings {
  provider: 'alleaves' | 'dutchie' | 'treez' | 'manual';
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    locationId?: string;
  };
  syncFrequency: 'realtime' | 'hourly' | 'manual';
  lastSyncAt?: string;
}
```

---

## 🎯 Success Metrics

**6-Month Goals:**
- 500 Builder tier customers ($49,500 MRR)
- 50 sites deployed and live
- 90% of sites connect POS integration
- 4.5+ star rating in help center

**Key Performance Indicators:**
- Time to first publish: <30 minutes (target)
- Builder session length: 45+ minutes
- Blocks per project: 15+ (indicates engagement)
- Publish rate: 70% of projects get published
- Retention: 85% month-over-month

---

## 📝 Next Steps

1. **Finalize Design (Week 1)**
   - Create Figma mockups
   - User test with 5 dispensary owners
   - Iterate based on feedback

2. **Technical Spike (Week 1)**
   - Evaluate GrapesJS vs Builder.io vs Craft.js
   - Prototype product grid block
   - Test POS integration flow

3. **Phase 1 Build (Week 2)**
   - Set up GrapesJS
   - Build 10 core blocks
   - Implement save/load
   - Basic deployment

4. **Phase 2 Build (Week 3)**
   - Add 20 more blocks
   - POS integration
   - Payment setup
   - Analytics dashboard

5. **Beta Launch (Week 4)**
   - Invite 20 pilot customers
   - Collect feedback
   - Fix bugs
   - Document workflows

6. **Public Launch (Week 5)**
   - Marketing campaign
   - Help center docs
   - Video tutorials
   - Success stories

**Questions?** Tag @team in Slack or add to [GitHub Discussion #124]
