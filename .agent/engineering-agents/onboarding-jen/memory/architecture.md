# Onboarding Jen — System Architecture

---

## OrgProfile: The Unified Data Model

```
org_profiles/{orgId}
├── brand (OrgProfileBrand)
│   ├── name, city, state, dispensaryType
│   ├── visualIdentity { colors, logo, favicon }
│   ├── voice { tone, personality, vocabulary }
│   ├── messaging { tagline, valuePropositions[], keyMessages[], aboutText }
│   ├── compliance { state, licenseType, licenseNumber, notes }
│   └── assets { heroImage, productBackground, ambientImage, textureImage }
└── intent (OrgProfileIntent)
    ├── strategicFoundation { archetype, description }
    ├── valueHierarchies { complianceVsUpsell, formalVsCasual, ... } (0.0-1.0)
    ├── agentConfigs { smokey: SmokeyIntentConfig, craig: CraigIntentConfig }
    ├── hardBoundaries { prohibitedTopics[], prohibitedClaims[] }
    └── feedbackConfig { autoLearn, requireApproval }

org_profiles/{orgId}/history/{versionId}  ← change log
```

### Completion Scoring
```
calculateOrgProfileCompletion(profile)
  Brand layer (40 pts max):
    name (10) + colors (5) + logo (5) + voice (10) + messaging (10)
  Intent layer (60 pts max):
    archetype (20) + valueHierarchies (20) + agentConfigs (10) + hardBoundaries (10)

getOrgProfileWithFallback(orgId)
  1. Try org_profiles/{orgId}          ← new unified
  2. Fallback: brands/{orgId} + org_intent_profiles/{orgId}
  3. getOrgProfileFromLegacy() maps both into unified shape
  → Zero breaking change for existing orgs
```

---

## Brand Guide Extraction Pipeline

```
User enters website URL
  ↓
discoverUrl(url) [RTRVR primary, Firecrawl fallback]
  ↓
scrapeSubpages(rootUrl) [parallel Promise.allSettled]
  tries: /, /about-us, /about-us/, /about, /about/, /our-story, ...
  filters: < 100 chars → skip
  preserves: root og:image, title, favicon
  ↓
AI extraction prompt (Gemini Flash):
  extracts: name, tagline, primaryColor, secondaryColor, accentColor,
            logoUrl, ogImageUrl, tone, personality[], vocabulary{},
            targetAudienceSegments[], dispensaryType, city, state,
            instagramHandle, facebookHandle
  content window: 5,000 chars of merged page text
  ↓
cleanExtractedValue() filters AI placeholders:
  "Unknown", "Unable to extract", "N/A", "Not found" → ''
  "No [field] found" → ''
  Placeholder detection is in src/lib/brand-guide-utils.ts (testable)
  ↓
Brand guide dialog pre-fills with extracted data
  useEffect([open, initialData]) using 'fieldName' in initialData check
  (NOT truthiness check — empty strings must propagate)
```

---

## Brand Guide Enricher (Post-Save, Non-Blocking)

```
After createBrandGuide() or updateBrandGuide():
  → setImmediate(() => enrichBrandGuide(brandId))

enrichBrandGuide(brandId)
  → loads current guide from Firestore
  → idempotency checks (skip if already populated):
      hasSamples: voice samples array non-empty
      hasVocab: vocabulary fields non-empty
      hasSubTones: subTones map non-empty
  → if !hasSamples: generate 3 social posts + 2 email hooks (Claude Sonnet)
  → if !hasVocab: normalize cannabis vocabulary (flower/bud, cannabis/marijuana)
  → if !hasVocab: identify target audience segments
  → classify brand archetype (12 Jungian types)
  → set sub-tones per channel (social/email/CS)
  → auto-populate BrandCompliance from detected state:
      STATE_ABBREVS maps full name → 2-letter code
      loads state rule pack metadata
  → saves back to Firestore
```

---

## 7-Step Wizard State Machine

```
Step 1: Core identity
  Fields: name, website, city, state, dispensaryType, about, tagline
  "Re-scan Website" → extractBrandGuideFromUrl(url) → pre-fills initialData
  Smart defaults: dispensaryType selection auto-fills Step 3 voice defaults

Step 2: Visual identity
  Fields: primaryColor, secondaryColor, accentColor, logoUrl
  OG image preview: if scan detected ogImageUrl → "Use This Logo" button
  Logo upload: direct Firebase Storage upload

Steps 3-4: Voice + Messaging
  Step 3 smart defaults (from dispensaryType):
    medical → Professional/Educational/Trustworthy/Empathetic
    recreational → Casual/Playful/Friendly/Authentic

Steps 5-7: Agent Intent (OrgProfile intent layer)
  Step 5: Archetype picker (5 options)
  Step 6: 6 value sliders (0.0-1.0 float each)
  Step 7: Hard boundaries textarea

Final submit:
  → upsertOrgProfile(orgId, fullProfile)
  → legacy: createBrandGuide() / updateBrandGuide()
  → setImmediate: enrichBrandGuide() + generateBrandImagesForNewAccount()
```

---

## Settings Page Architecture

```
/dashboard/settings
  Tabs:
    Brand          → basic org info
    Embeds         → menu widget embed code
    Theming        → color customization → BrandThemeProvider CSS vars
    Chatbot        → Smokey greeting config
    Domain         → slug reservation
    Team           → member management + invitations
    Billing        → plan + subscription
    Loyalty        → tiers + redemption + menu info bar
    Brand & Agent Profile → /settings/profile (unified OrgProfile accordion)
    Integrations   → Gmail, Sheets, Drive OAuth connection cards
    Alleaves       → POS connection status

/dashboard/settings/profile  (10-section accordion)
  1. Brand Identity (name, city, state, type)
  2. Visual Identity (colors, logo)
  3. Voice & Tone
  4. Messaging
  5. Compliance
  6. Brand Archetype
  7. Agent Behavior
  8. Smokey Config
  9. Craig Config
  10. Hard Limits

Completion bar: calculateOrgProfileCompletion() → 0-100%
Sticky save: saves to org_profiles/{orgId} via updateOrgProfileAction()
```

---

## Agent Context Block Builders

Called in each agent's `initialize()` — injects org-specific context into system prompt:

```typescript
// All in src/server/services/org-profile.ts

buildSmokeyContextBlock(profile)
  → product recommendation style, vocabulary preferences, upsell aggressiveness

buildCraigContextBlock(profile)
  → campaign tone, voice samples, compliance hard limits, key messages

buildPopsContextBlock(profile)
  → analytics focus areas, KPI priorities

buildEzalContextBlock(profile)
  → competitive stance (aggressive/neutral/defensive), monitoring focus

buildMoneyMikeContextBlock(profile)
  → pricing philosophy, margin targets, cost sensitivity

buildMrsParkerContextBlock(profile)
  → retention voice, loyalty tier messaging, win-back approach
```

Usage in agents:
```typescript
// Non-blocking, non-fatal pattern used by all 6 agents:
const profile = await getOrgProfileWithFallback(orgId).catch(() => null);
if (profile) {
  const block = buildSmokeyContextBlock(profile);
  systemPrompt += '\n\n' + block;
}
```
