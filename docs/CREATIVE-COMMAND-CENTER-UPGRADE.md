# Creative Command Center - Upgrade Implementation Plan

**Goal:** Transform the Creative page into an intuitive, on-brand, AI-powered design studio that leverages Brand Guide, Memory, Heartbeat, and role-specific features.

**Target URL:** `/dashboard/creative`

---

## 📊 Current State Analysis

### Existing Features ✅
- ✅ **The Grid** - Published/scheduled content gallery
- ✅ **Platform Switching** - Instagram, TikTok, Facebook support
- ✅ **Approval Chain** - Multi-level content approval workflow
- ✅ **Engagement Analytics** - Performance tracking
- ✅ **Real-time Updates** - Live content sync
- ✅ **Gauntlet Compliance** - Automated compliance checking (feature flagged)

### Existing Hooks & Services
- `useCreativeContent` - Content fetching with real-time updates
- `approveAtLevel`, `rejectAtLevel` - Approval actions
- `generateContent` - Content generation (backend)

### Current Limitations ❌
- ❌ **No Brand Guide Integration** - Doesn't pull colors/fonts/voice
- ❌ **No Template Library** - No pre-built asset types
- ❌ **No Memory System** - Doesn't learn user preferences
- ❌ **No Proactive Suggestions** - Relies on manual generation
- ❌ **No Role-Specific UI** - Same view for all users
- ❌ **Limited Canvas Experience** - No live preview/editing

---

## 🎯 Upgrade Vision

Transform Creative into a **Vibe Studio** - an AI-powered creative canvas that:
1. **Feels like Canva** but powered by BakedBot's AI agents
2. **Knows your brand** from the Brand Guide
3. **Learns your preferences** via Memory (Letta)
4. **Suggests proactively** via Heartbeat
5. **Adapts to your role** (Brand vs. Dispensary)
6. **Generates in seconds** with "Magic Generate"

---

## 🏗️ Architecture Upgrades

### 1. New Component Structure

```
src/app/dashboard/creative/
├── page.tsx                          # Server component (auth, data fetching)
├── creative-command-center.tsx       # Main client component
├── components/
│   ├── vibe-studio/
│   │   ├── canvas-workspace.tsx      # Live design canvas
│   │   ├── platform-selector.tsx     # IG Feed / TikTok / Story tabs
│   │   ├── magic-generate-button.tsx # AI generation CTA
│   │   ├── asset-library-rail.tsx    # Left sidebar with brand assets
│   │   └── compliance-hud.tsx        # Real-time compliance shield
│   ├── template-browser/
│   │   ├── template-grid.tsx         # Browse asset templates
│   │   ├── template-card.tsx         # Individual template card
│   │   └── category-filter.tsx       # Filter by asset category
│   ├── memory-panel/
│   │   ├── preference-insights.tsx   # Learned preferences display
│   │   ├── style-suggestions.tsx     # AI-suggested styles
│   │   └── quick-actions.tsx         # One-click frequent tasks
│   ├── heartbeat-widget/
│   │   ├── content-suggestions.tsx   # Proactive campaign ideas
│   │   ├── performance-alerts.tsx    # Low-engagement warnings
│   │   └── trending-topics.tsx       # What's trending in cannabis
│   └── role-dashboards/
│       ├── brand-creative-view.tsx   # Brand-specific features
│       └── dispensary-creative-view.tsx # Dispensary-specific features
└── hooks/
    ├── use-brand-guide.ts            # Fetch brand guide data
    ├── use-creative-memory.ts        # Letta memory integration
    ├── use-heartbeat-creative.ts     # Creative-specific heartbeat checks
    └── use-template-library.ts       # Asset template fetching
```

### 2. New Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│  User Action: "Magic Generate" for Instagram Feed          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  1. Fetch Brand Guide (colors, fonts, voice, compliance)    │
│     - src/server/actions/brand-guide.ts: getBrandGuide()    │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  2. Check Memory for User Preferences                       │
│     - Letta: letta_search_memory("creative_preferences")    │
│     - Past styles, colors, products used                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  3. Get Template from Creative Library                      │
│     - ASSET_TEMPLATES['instagram_feed_post']                │
│     - Platform specs (1080x1080, aspect ratio, compliance)  │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  4. Generate with Craig (Marketer Agent)                    │
│     - Prompt includes: brand voice, template, memory prefs  │
│     - Uses Gemini Flash/Pro for image generation            │
│     - Applies brand colors automatically                    │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  5. Run Compliance Check (Deebo)                            │
│     - State-specific disclaimers                            │
│     - Age gate requirements                                 │
│     - Platform-specific rules (Weedmaps, Meta)              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────────────────────────┐
│  6. Display on Canvas + Save to Memory                      │
│     - Show live preview in workspace                        │
│     - letta_save_fact("user preferred blue gradient")       │
│     - Track generation cost                                 │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎨 UI/UX Upgrades

### Header Redesign

**Current:** Simple tab bar with platform icons
**New:** Professional creative toolbar

```tsx
<Header>
  {/* Left Side */}
  <div>
    <Badge variant="outline" className="text-baked-green">
      Vibe Studio
    </Badge>
    <h2>Campaign: {campaignName || "Weekend Flash Sale"}</h2>
  </div>

  {/* Center */}
  <PlatformTabs>
    <Tab platform="ig-feed" icon={<Instagram />} />
    <Tab platform="tiktok" icon={<TikTok />} />
    <Tab platform="ig-story" icon={<MobileScreen />} />
  </PlatformTabs>

  {/* Right Side */}
  <MagicGenerateButton brandGuide={brandGuide} />
</Header>
```

### Canvas Workspace (Center Stage)

**Current:** Static grid of generated content
**New:** Live design canvas with real-time editing

```tsx
<CanvasWorkspace platform={selectedPlatform}>
  {/* Dynamic aspect ratio container */}
  <div className={cn(
    "canvas-shadow rounded-sm overflow-hidden transition-all",
    platform === 'ig-feed' && "aspect-square w-[450px]",
    platform === 'tiktok' && "aspect-[9/16] w-[300px]",
    platform === 'ig-story' && "aspect-[9/16] w-[300px]"
  )}>
    {/* Live preview of generated content */}
    {generatedAsset ? (
      <AssetPreview asset={generatedAsset} brandGuide={brandGuide} />
    ) : (
      <EmptyCanvas onGenerate={handleMagicGenerate} />
    )}
  </div>

  {/* Compliance HUD (Bottom Right Overlay) */}
  <ComplianceHUD
    complianceStatus={complianceCheck}
    state={brandGuide.compliance.primaryState}
    disclaimers={requiredDisclaimers}
  />
</CanvasWorkspace>
```

### Asset Library Rail (Left Sidebar)

**Current:** None
**New:** Brand assets + Suggested elements

```tsx
<AssetLibraryRail brandId={brandId}>
  {/* User's uploaded brand assets */}
  <Section title="Your Brand Assets">
    <AssetGrid>
      {brandAssets.map(asset => (
        <AssetThumbnail
          key={asset.id}
          asset={asset}
          onDragToCanvas={handleDrop}
        />
      ))}
      <UploadButton />
    </AssetGrid>
  </Section>

  {/* AI-suggested stock photos */}
  <Section title="Suggested Elements">
    <SuggestedAssets
      brandVibe={brandGuide.voice.tone}
      productCategory={currentProduct?.category}
    />
  </Section>

  {/* Recent products from menu */}
  <Section title="Featured Products">
    <ProductList
      products={menuProducts}
      onSelect={handleProductSelect}
    />
  </Section>
</AssetLibraryRail>
```

### Memory Panel (Bottom Drawer)

**Current:** None
**New:** Learned preferences & quick actions

```tsx
<MemoryPanel>
  <Tabs>
    <Tab name="Preferences">
      <PreferenceInsights>
        <Insight>
          ✨ You use <span className="text-baked-green">bold gradients</span> 70% of the time
        </Insight>
        <Insight>
          🎨 Favorite color combo: {brandGuide.colors.primary.hex} + {mostUsedSecondary}
        </Insight>
        <Insight>
          📸 Most engaged posts feature <strong>lifestyle shots</strong>
        </Insight>
      </PreferenceInsights>
    </Tab>

    <Tab name="Quick Actions">
      <QuickActionGrid>
        <QuickAction
          label="Recreate last winner"
          onClick={() => regenerateTopPost()}
        />
        <QuickAction
          label="Weekly deal graphic"
          onClick={() => generateTemplate('weekly_deals')}
        />
        <QuickAction
          label="Product spotlight"
          onClick={() => openProductSelector()}
        />
      </QuickActionGrid>
    </Tab>

    <Tab name="History">
      <GenerationHistory limit={10} />
    </Tab>
  </Tabs>
</MemoryPanel>
```

### Heartbeat Widget (Top Right Corner)

**Current:** None
**New:** Proactive suggestions from Heartbeat system

```tsx
<HeartbeatWidget>
  {heartbeatSuggestions.map(suggestion => (
    <Alert key={suggestion.id} variant="info">
      <AlertIcon icon={suggestion.icon} />
      <AlertTitle>{suggestion.title}</AlertTitle>
      <AlertDescription>{suggestion.description}</AlertDescription>
      <AlertAction onClick={() => handleSuggestion(suggestion)}>
        Generate Now
      </AlertAction>
    </Alert>
  ))}
</HeartbeatWidget>

{/* Example Suggestions: */}
// ⚡ "Flash sale ends in 2 hours - create urgency post?"
// 📈 "Your 'OG Kush' posts get 3x engagement - feature it again?"
// 🎂 "124 customers have birthdays this week - create birthday promo?"
// 📊 "Instagram engagement down 12% - try video content?"
```

---

## 🔧 Feature Implementation

### Feature 1: Brand Guide Integration

**Files to Modify:**
- `src/app/dashboard/creative/page.tsx` - Add getBrandGuide() call
- `src/hooks/use-brand-guide.ts` - NEW: Custom hook for brand data

**Implementation:**

```typescript
// hooks/use-brand-guide.ts
export function useBrandGuide(brandId: string) {
  const [brandGuide, setBrandGuide] = useState<BrandGuide | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBrandGuide() {
      const result = await getBrandGuide(brandId);
      if (result.success && result.brandGuide) {
        setBrandGuide(result.brandGuide);
      }
      setLoading(false);
    }
    fetchBrandGuide();
  }, [brandId]);

  return { brandGuide, loading };
}

// Usage in creative page:
const { brandGuide } = useBrandGuide(brandId);

// Apply to generation:
const generateRequest = {
  platform: 'instagram',
  brandColors: [
    brandGuide.visualIdentity.colors.primary.hex,
    brandGuide.visualIdentity.colors.secondary.hex,
  ],
  brandVoice: brandGuide.voice.tone,
  brandFonts: [
    brandGuide.visualIdentity.typography.headingFont.family,
    brandGuide.visualIdentity.typography.bodyFont.family,
  ],
  complianceState: brandGuide.compliance.primaryState,
};
```

### Feature 2: Template Library Integration

**Files to Create:**
- `src/hooks/use-template-library.ts` - Template fetching hook
- `src/app/dashboard/creative/components/template-browser.tsx` - Template grid UI

**Implementation:**

```typescript
// hooks/use-template-library.ts
export function useTemplateLibrary(filters?: AssetFilter) {
  const templates = useMemo(() => {
    let results = Object.entries(ASSET_TEMPLATES).map(([id, t]) => ({ id, ...t }));

    if (filters?.category) {
      results = results.filter(t => t.category === filters.category);
    }
    if (filters?.platform) {
      results = results.filter(t => t.platforms?.includes(filters.platform));
    }

    return results;
  }, [filters]);

  return { templates };
}

// Usage:
const { templates } = useTemplateLibrary({ platform: 'instagram_feed' });

<TemplateBrowser>
  {templates.map(template => (
    <TemplateCard
      key={template.id}
      template={template}
      onClick={() => handleGenerateFromTemplate(template)}
    />
  ))}
</TemplateBrowser>
```

### Feature 3: Memory Integration (Letta)

**Files to Create:**
- `src/hooks/use-creative-memory.ts` - Memory hook
- `src/server/services/creative-memory.ts` - Memory service layer

**Implementation:**

```typescript
// hooks/use-creative-memory.ts
export function useCreativeMemory(userId: string) {
  const [preferences, setPreferences] = useState<CreativePreferences | null>(null);

  useEffect(() => {
    async function fetchPreferences() {
      // Search Letta memory for creative preferences
      const memory = await letta_search_memory({
        userId,
        query: "creative design preferences style colors fonts",
        limit: 10,
      });

      // Parse memory into preferences
      const prefs = parseCreativePreferences(memory);
      setPreferences(prefs);
    }
    fetchPreferences();
  }, [userId]);

  const savePreference = async (key: string, value: any) => {
    await letta_save_fact({
      userId,
      fact: `User prefers ${key}: ${value} in creative designs`,
    });
    // Update local state
    setPreferences(prev => ({ ...prev, [key]: value }));
  };

  return { preferences, savePreference };
}

// Usage:
const { preferences, savePreference } = useCreativeMemory(userId);

// On generation:
if (preferences?.favoriteStyle) {
  generateRequest.style = preferences.favoriteStyle;
}

// After successful generation:
await savePreference('lastUsedColors', [primaryColor, secondaryColor]);
await savePreference('favoriteTemplate', 'instagram_feed_post');
```

### Feature 4: Heartbeat Proactive Suggestions

**Files to Create:**
- `src/hooks/use-heartbeat-creative.ts` - Creative-specific heartbeat hook
- `src/server/services/heartbeat/checks/creative.ts` - Creative heartbeat checks

**Implementation:**

```typescript
// server/services/heartbeat/checks/creative.ts
export async function runCreativeHeartbeatChecks(
  tenantId: string,
  role: string
): Promise<HeartbeatNotification[]> {
  const notifications: HeartbeatNotification[] = [];

  // Check 1: Low engagement warning
  const recentPosts = await getRecentCreativeContent(tenantId, 7); // Last 7 days
  const avgEngagement = calculateAverageEngagement(recentPosts);
  if (avgEngagement < 2.5) { // Below industry benchmark
    notifications.push({
      type: 'performance_alert',
      priority: 'medium',
      title: 'Engagement Below Average',
      message: `Your posts averaged ${avgEngagement.toFixed(1)}% engagement this week. Try video content or lifestyle shots.`,
      actionLabel: 'Generate High-Engagement Post',
      actionUrl: '/dashboard/creative?template=instagram_reel',
    });
  }

  // Check 2: Trending product opportunity
  const trendingProducts = await getTop TrendingProducts(tenantId, 5);
  if (trendingProducts.length > 0) {
    const topProduct = trendingProducts[0];
    notifications.push({
      type: 'content_suggestion',
      priority: 'medium',
      title: `"${topProduct.name}" is Trending`,
      message: `This product has 3x more views this week. Feature it in your next post.`,
      actionLabel: 'Create Product Spotlight',
      actionUrl: `/dashboard/creative?product=${topProduct.id}`,
    });
  }

  // Check 3: Upcoming events/holidays
  const upcomingEvents = getUpcomingCannabisHolidays(14); // Next 2 weeks
  if (upcomingEvents.length > 0) {
    const nextEvent = upcomingEvents[0];
    notifications.push({
      type: 'content_suggestion',
      priority: 'high',
      title: `${nextEvent.name} in ${nextEvent.daysAway} days`,
      message: `Plan your ${nextEvent.name} campaign now. Create graphics, deals, and social posts.`,
      actionLabel: 'Start Campaign',
      actionUrl: `/dashboard/creative?campaign=${nextEvent.slug}`,
    });
  }

  // Check 4: Brand guide incomplete
  const brandGuide = await getBrandGuide(tenantId);
  if (!brandGuide || brandGuide.completenessScore < 70) {
    notifications.push({
      type: 'setup_required',
      priority: 'low',
      title: 'Complete Your Brand Guide',
      message: 'AI generates better content with a complete brand guide. Add colors, fonts, and voice.',
      actionLabel: 'Update Brand Guide',
      actionUrl: '/dashboard/settings/brand-guide',
    });
  }

  return notifications;
}

// hooks/use-heartbeat-creative.ts
export function useHeartbeatCreative(tenantId: string) {
  const [suggestions, setSuggestions] = useState<HeartbeatNotification[]>([]);

  useEffect(() => {
    async function fetchSuggestions() {
      const result = await getHeartbeatNotifications(tenantId, 'creative');
      setSuggestions(result);
    }

    fetchSuggestions();
    const interval = setInterval(fetchSuggestions, 5 * 60 * 1000); // Every 5 mins

    return () => clearInterval(interval);
  }, [tenantId]);

  return { suggestions };
}
```

### Feature 5: Role-Specific Views

**Files to Create:**
- `src/app/dashboard/creative/components/role-dashboards/brand-creative-view.tsx`
- `src/app/dashboard/creative/components/role-dashboards/dispensary-creative-view.tsx`

**Brand View Features:**
- Retailer performance by location
- Wholesale sell sheet generator
- Multi-location campaign rollout
- Partner co-marketing templates

**Dispensary View Features:**
- Menu product photography
- Daily deal graphics
- In-store digital signage
- Loyalty program graphics
- Birthday/event promos

**Implementation:**

```typescript
// creative-command-center.tsx
export function CreativeCommandCenter({ brandId, userRole }: Props) {
  const { brandGuide } = useBrandGuide(brandId);
  const { preferences } = useCreativeMemory(userId);
  const { suggestions } = useHeartbeatCreative(brandId);

  if (userRole === 'brand' || userRole === 'brand_admin') {
    return (
      <BrandCreativeView
        brandId={brandId}
        brandGuide={brandGuide}
        preferences={preferences}
        suggestions={suggestions}
      />
    );
  }

  if (userRole === 'dispensary' || userRole === 'dispensary_admin') {
    return (
      <DispensaryCreativeView
        brandId={brandId}
        brandGuide={brandGuide}
        preferences={preferences}
        suggestions={suggestions}
      />
    );
  }

  // Default view
  return <GenericCreativeView {...props} />;
}
```

### Feature 6: Magic Generate Button

**Files to Create:**
- `src/app/dashboard/creative/components/magic-generate-button.tsx`
- `src/app/dashboard/creative/components/magic-generate-dialog.tsx`

**Implementation:**

```typescript
// magic-generate-button.tsx
export function MagicGenerateButton({ brandGuide, preferences }: Props) {
  const [open, setOpen] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleMagicGenerate = async () => {
    setGenerating(true);

    try {
      // Combine brand guide + memory + template
      const request = {
        brandId: brandGuide.brandId,
        platform: selectedPlatform,
        template: selectedTemplate.id,
        brandColors: [
          brandGuide.visualIdentity.colors.primary.hex,
          brandGuide.visualIdentity.colors.secondary.hex,
        ],
        brandVoice: brandGuide.voice.tone,
        stylePreference: preferences?.favoriteStyle || 'modern',
        products: selectedProducts,
        dealText: promotionText,
      };

      const result = await generateCreativeAsset(request);

      if (result.success) {
        // Show on canvas
        setGeneratedAsset(result.asset);

        // Save to memory
        await savePreference('lastGenerated', result.asset.id);
        await trackMediaGeneration({
          orgId: brandGuide.brandId,
          model: selectedTemplate.aiModel,
          mediaType: selectedTemplate.format === 'video' ? 'video' : 'image',
          cost: selectedTemplate.estimatedCost,
        });

        toast.success('Asset generated successfully!');
      }
    } catch (error) {
      toast.error('Generation failed: ' + error.message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <>
      <Button
        size="lg"
        onClick={() => setOpen(true)}
        className="bg-baked-green hover:bg-baked-green/90 text-white font-black rounded-full shadow-lg"
      >
        <Wand2 className="w-4 h-4 mr-2" />
        MAGIC GENERATE
        <Badge variant="secondary" className="ml-3 bg-white/20">
          PULLING FROM BRAND GUIDE
        </Badge>
      </Button>

      <MagicGenerateDialog
        open={open}
        onOpenChange={setOpen}
        onGenerate={handleMagicGenerate}
        generating={generating}
        brandGuide={brandGuide}
      />
    </>
  );
}
```

---

## 📅 Implementation Timeline

### Phase 1: Foundation (Week 1)
- ✅ Create new component structure
- ✅ Implement `useBrandGuide()` hook
- ✅ Implement `useTemplateLibrary()` hook
- ✅ Build Canvas Workspace component
- ✅ Build Platform Selector component

### Phase 2: Core Features (Week 2)
- ✅ Integrate Brand Guide into generation
- ✅ Build Asset Library Rail
- ✅ Implement Memory hook (`useCreativeMemory`)
- ✅ Build Template Browser
- ✅ Create Magic Generate dialog

### Phase 3: Intelligence (Week 3)
- ✅ Implement Heartbeat creative checks
- ✅ Build Heartbeat Widget UI
- ✅ Add proactive suggestions
- ✅ Implement preference learning
- ✅ Build Memory Panel

### Phase 4: Polish & Roles (Week 4)
- ✅ Build role-specific views
- ✅ Add Compliance HUD
- ✅ Implement canvas editing
- ✅ Add performance tracking
- ✅ Polish animations & UX
- ✅ Write tests

---

## 🎯 Success Metrics

### User Experience
- **Generation Time** < 10 seconds (average)
- **Clicks to Generate** ≤ 2 (Magic Generate)
- **Brand Guide Usage** > 80% of generations
- **Memory Accuracy** > 85% preference prediction

### Business Impact
- **Content Creation Speed** 5x faster
- **Approval Rate** > 90% (fewer rejections)
- **Engagement Rate** +25% (better content)
- **Cost Per Asset** < $0.10 average

### Technical Performance
- **Page Load** < 2 seconds
- **Canvas Render** < 500ms
- **API Response** < 5 seconds (generation)
- **Memory Lookup** < 200ms

---

## 🚀 Quick Start (For Developers)

```bash
# 1. Install dependencies (if any new ones)
npm install

# 2. Create new component files
mkdir -p src/app/dashboard/creative/components/{vibe-studio,template-browser,memory-panel,heartbeat-widget,role-dashboards}

# 3. Create new hooks
mkdir -p src/hooks

# 4. Run type check
npm run check:types

# 5. Start dev server
npm run dev

# 6. Navigate to:
# http://localhost:3000/dashboard/creative
```

---

## 📝 Notes

- **Backward Compatibility:** Keep existing "The Grid" feature for published content
- **Feature Flags:** Use flags for gradual rollout (MAGIC_GENERATE_ENABLED, etc.)
- **Performance:** Lazy load heavy components (canvas, template browser)
- **Mobile:** Responsive canvas that adapts to screen size
- **Accessibility:** Keyboard shortcuts for power users (Cmd+G for generate, etc.)

---

**Document Version:** 1.0
**Last Updated:** 2026-02-11
**Owner:** BakedBot Engineering
**Status:** Ready for Implementation
