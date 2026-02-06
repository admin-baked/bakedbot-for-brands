# Hero Banner Preset Prompts

Suggested AI prompts for common hero banner scenarios. These can be added through the Heroes dashboard AI Builder or via the preset prompts manager.

---

## 🌿 Premium Flower Brand

**Prompt:**
```
Create a hero banner for a premium flower brand with:
- Green natural colors (#22c55e)
- Professional style
- Local pickup model
- Stats: 50+ products, 4.8 rating
- Emphasis on quality and lab testing
```

**Use Case:** High-end cannabis flower brands focusing on quality and local distribution.

---

## 🏪 Local Dispensary

**Prompt:**
```
Create a hero for a neighborhood dispensary with:
- Warm, welcoming colors (#16a34a)
- Default style
- Hybrid purchase model (pickup + delivery)
- Stats: 200+ products, 25+ partner brands
- Focus on convenience and selection
```

**Use Case:** Multi-brand dispensaries serving local communities.

---

## 🎉 Event Promotion

**Prompt:**
```
Create a bold hero banner for a 420 event with:
- Vibrant purple/pink gradient (#a855f7)
- Bold style
- Event details and limited-time offers
- Strong call-to-action for tickets/registration
```

**Use Case:** Special events, sales, and limited-time promotions.

---

## 💊 Medical Focus

**Prompt:**
```
Create a professional hero for a medical dispensary with:
- Clean blue-green colors (#0891b2)
- Professional style
- Focus on medical benefits and consultation
- Stats: 10+ years experience
- Verified badge
```

**Use Case:** Medical marijuana dispensaries emphasizing healthcare.

---

## 🚀 New Product Launch

**Prompt:**
```
Create a hero for launching a new product line with:
- Modern, eye-catching colors (#8b5cf6)
- Bold style
- Featured product imagery
- "Shop Now" primary CTA
- Secondary CTA for product info
```

**Use Case:** New product releases and brand launches.

---

## 🌍 Online-Only Brand

**Prompt:**
```
Create a hero for an online cannabis brand with:
- Modern, tech-forward style
- Online-only purchase model
- Ships nationwide badge
- Strong e-commerce CTAs
- Stats: 1000+ reviews, 4.9 rating
```

**Use Case:** E-commerce brands shipping cannabis products.

---

## 🎨 Edibles Brand

**Prompt:**
```
Create a vibrant hero for a gourmet edibles brand with:
- Appetizing colors (warm oranges/reds)
- Minimal style for clean presentation
- Product photography prominent
- Focus on taste and quality
- Local pickup at partner dispensaries
```

**Use Case:** Edibles and infused products brands.

---

## 🌱 Organic/Sustainable Focus

**Prompt:**
```
Create a natural hero for an organic cannabis brand with:
- Earth tones (greens/browns #059669)
- Professional style
- Emphasize sustainability and organic growing
- Stats: 100% organic, farm-to-table
- Verified organic certification badge
```

**Use Case:** Brands focusing on organic, sustainable cultivation.

---

## 💎 Luxury/Premium

**Prompt:**
```
Create an elegant hero for a luxury cannabis brand with:
- Sophisticated purple/gold colors (#7c3aed)
- Professional style
- Premium pricing and exclusivity
- High-end product photography
- Focus on craft and artisanal quality
```

**Use Case:** High-end, luxury cannabis brands.

---

## 🎯 Deal Hunter

**Prompt:**
```
Create an energetic hero for a value-focused dispensary with:
- Attention-grabbing colors (red/yellow)
- Bold style
- Highlight daily deals and promotions
- "Shop Deals" primary CTA
- Stats: Best prices guaranteed
```

**Use Case:** Dispensaries competing on price and deals.

---

## Usage Instructions

### Adding via AI Builder
1. Navigate to `/dashboard/heroes`
2. Click "AI Builder" tab
3. Paste any of the above prompts
4. Click "Generate with AI"
5. Review and customize the suggestion
6. Save your hero banner

### Adding via Preset Manager
1. Navigate to `/dashboard/intelligence/ground-truth`
2. Go to "Preset Prompts" tab
3. Click "Add Preset"
4. Fill in:
   - **Label:** e.g., "Premium Flower Hero"
   - **Description:** Brief explanation of use case
   - **Thread Type:** `marketing`
   - **Default Agent:** `craig`
   - **Prompt Template:** Paste prompt above
   - **Category:** `marketing`
   - **Roles:** `['brand', 'dispensary']`
5. Save preset

### Customizing Prompts

All prompts support variable substitution using Mustache syntax:

```
Create a hero for {{brandName}} with:
- Primary color: {{primaryColor}}
- {{purchaseModel}} purchase model
- Tagline: {{tagline}}
```

**Available Variables:**
- `{{brandName}}` - Organization/brand name
- `{{primaryColor}}` - Hex color code
- `{{tagline}}` - Brand tagline
- `{{purchaseModel}}` - online_only, local_pickup, or hybrid
- `{{description}}` - Brand description

---

## Best Practices

1. **Colors Matter**: Choose colors that align with brand identity
   - Green: Natural, organic, traditional
   - Purple: Premium, luxury, modern
   - Blue: Medical, professional, trustworthy
   - Orange/Red: Energy, deals, excitement

2. **Style Selection**:
   - `default`: Balanced, works for most brands
   - `minimal`: Clean, modern, product-focused
   - `bold`: Attention-grabbing, events, promos
   - `professional`: Medical, corporate, serious

3. **Purchase Models**:
   - `local_pickup`: Traditional dispensaries
   - `online_only`: E-commerce brands
   - `hybrid`: Both online and in-store

4. **Stats Add Credibility**:
   - Include real numbers when possible
   - Products count, retailer partnerships, ratings
   - Years in business, certifications

5. **CTAs Drive Action**:
   - "Find Near Me" for local pickup
   - "Shop Now" for online/hybrid
   - Custom CTAs for specific campaigns

---

**Pro Tip:** Create multiple hero banners and A/B test them. Use the "Display Order" field to control which appears first, and toggle "Active" status to switch between versions.
