/**
 * Brand Guide Enricher
 *
 * Runs an async AI enrichment pass after a brand guide is saved.
 * Generates everything that the extractor can't get from HTML scraping:
 *
 *   1. Voice samples  — 3 social posts + 2 email hooks in the brand's voice
 *   2. Cannabis vocab — preferred terms (flower/bud, cannabis/marijuana, etc.)
 *   3. Target audience — 2-3 audience segments from the brand's messaging
 *   4. Sub-tones      — different tone for social vs email vs customer service
 *   5. Brand archetype — Jungian classification (The Sage, The Caregiver, etc.)
 *   6. Compliance     — auto-populate from detected state + dispensaryType
 *
 * Non-blocking: called via setImmediate() — the user never waits for this.
 * Idempotent: safe to run multiple times; won't overwrite user edits.
 */

import { callClaude } from '@/ai/claude';
import { getAdminFirestore } from '@/firebase/admin';
import { makeBrandGuideRepo } from '@/server/repos/brandGuideRepo';
import { logger } from '@/lib/logger';
import type { BrandGuide, BrandVoiceSample, USState } from '@/types/brand-guide';

// ---------------------------------------------------------------------------
// State → disclaimer / compliance mapping
// ---------------------------------------------------------------------------

const STATE_COMPLIANCE: Record<string, {
    ageDisclaimer: string;
    medicalClaims: 'none' | 'limited' | 'supported';
    restrictions: string[];
}> = {
    NY: {
        ageDisclaimer: 'Must be 21+ to purchase. Keep out of reach of children.',
        medicalClaims: 'none',
        restrictions: [
            'No health or wellness claims permitted',
            'No cartoon characters or imagery appealing to minors',
            'No claims that cannabis is safe or risk-free',
        ],
    },
    CA: {
        ageDisclaimer: 'For adults 21+ only. Keep out of reach of children.',
        medicalClaims: 'limited',
        restrictions: [
            'No medical claims without supporting clinical evidence',
            'No depictions of minors or imagery targeting minors',
            'Must include OCM/CDTFA-required warnings on packaging references',
        ],
    },
    CO: {
        ageDisclaimer: 'Adults 21+ only. Keep out of reach of children and pets.',
        medicalClaims: 'limited',
        restrictions: [
            'No unsubstantiated health claims',
            'No content primarily targeting minors',
        ],
    },
    MA: {
        ageDisclaimer: 'For adults 21 years of age or older only.',
        medicalClaims: 'none',
        restrictions: [
            'No health benefit claims',
            'No imagery likely to appeal to minors',
        ],
    },
    IL: {
        ageDisclaimer: '21+ only. Not for use by persons under 21.',
        medicalClaims: 'none',
        restrictions: [
            'No deceptive or misleading claims',
            'No packaging or advertising that could appeal to minors',
        ],
    },
    NJ: {
        ageDisclaimer: 'For use only by adults 21 and older.',
        medicalClaims: 'none',
        restrictions: ['No claims of medical benefit for adult-use products'],
    },
    WA: {
        ageDisclaimer: 'For adults 21+ only. Keep out of reach of children.',
        medicalClaims: 'limited',
        restrictions: [
            'No health/medical claims in advertising',
            'No product mascots or cartoon characters',
        ],
    },
    OR: {
        ageDisclaimer: 'Age 21 and over only.',
        medicalClaims: 'none',
        restrictions: ['No claims that cannabis is non-addictive or safe'],
    },
    MI: {
        ageDisclaimer: 'For adults 21+. Keep out of reach of children.',
        medicalClaims: 'limited',
        restrictions: ['No targeted advertising to minors'],
    },
};

// Generic fallback for all other states
const FALLBACK_COMPLIANCE = {
    ageDisclaimer: 'For adults 21+ only. Keep out of reach of children.',
    medicalClaims: 'none' as const,
    restrictions: ['No medical claims', 'No content targeting minors'],
};

// ---------------------------------------------------------------------------
// Main enrichment entry point
// ---------------------------------------------------------------------------

/**
 * Run all enrichment steps for a brand guide. Called after save — non-blocking.
 */
export async function enrichBrandGuide(brandId: string): Promise<void> {
    try {
        const firestore = getAdminFirestore();
        const repo = makeBrandGuideRepo(firestore);

        // Load current guide
        const guide = await repo.getById(brandId);
        if (!guide) {
            logger.warn('[BrandGuideEnricher] Brand guide not found', { brandId });
            return;
        }

        logger.info('[BrandGuideEnricher] Starting enrichment', { brandId, brandName: guide.brandName });

        // Collect updates — each step adds to this object
        const updates: Partial<BrandGuide> = {};

        // Run enrichment steps in parallel where possible
        const [voiceUpdate, audienceUpdate, archetypeUpdate] = await Promise.allSettled([
            enrichVoice(guide),
            enrichTargetAudience(guide),
            enrichBrandArchetype(guide),
        ]);

        if (voiceUpdate.status === 'fulfilled' && voiceUpdate.value) {
            updates.voice = { ...guide.voice, ...voiceUpdate.value } as any;
        }
        if (audienceUpdate.status === 'fulfilled' && audienceUpdate.value) {
            updates.messaging = { ...guide.messaging, ...audienceUpdate.value } as any;
        }
        // Archetype stored on voice object
        if (archetypeUpdate.status === 'fulfilled' && archetypeUpdate.value) {
            updates.voice = {
                ...(updates.voice || guide.voice),
                archetype: archetypeUpdate.value,
            } as any;
        }

        // Compliance (fast — no AI needed, just state lookup)
        const complianceUpdate = buildComplianceFromState(guide);
        if (complianceUpdate) {
            updates.compliance = complianceUpdate as any;
        }

        // Only write if we have something
        if (Object.keys(updates).length === 0) {
            logger.info('[BrandGuideEnricher] Nothing to update', { brandId });
            return;
        }

        await repo.update(brandId, updates);
        logger.info('[BrandGuideEnricher] Enrichment complete', { brandId, updatedFields: Object.keys(updates) });

    } catch (error) {
        // Non-fatal — enrichment failure doesn't break anything
        logger.error('[BrandGuideEnricher] Enrichment failed', {
            brandId,
            error: error instanceof Error ? error.message : String(error),
        });
    }
}

// ---------------------------------------------------------------------------
// Step 1: Voice — samples, sub-tones, cannabis vocabulary
// ---------------------------------------------------------------------------

async function enrichVoice(guide: BrandGuide): Promise<Partial<BrandGuide['voice']> | null> {
    // Only enrich if we have enough source data
    const hasVoice = guide.voice?.tone && guide.voice?.personality?.length;
    const hasMessaging = guide.messaging?.positioning || guide.messaging?.tagline;
    if (!hasVoice && !hasMessaging) return null;

    // Skip if already has samples (user might have edited them)
    const hasSamples = (guide.voice?.sampleContent?.length ?? 0) >= 3;
    const hasVocab = (guide.voice?.vocabulary?.preferred?.length ?? 0) >= 3;
    const hasSubTones = !!guide.voice?.subTones?.social;

    if (hasSamples && hasVocab && hasSubTones) return null; // Already enriched

    const brandName = guide.brandName || 'the brand';
    const tone = guide.voice?.tone || 'professional';
    const personality = guide.voice?.personality?.join(', ') || 'Professional, Trustworthy';
    const tagline = guide.messaging?.tagline || '';
    const positioning = guide.messaging?.positioning || '';
    const dispensaryType = (guide.messaging as any)?.dispensaryType || 'recreational';
    const city = (guide.messaging as any)?.city || '';

    const prompt = `You are a cannabis brand voice expert. Generate voice enrichment data for this brand.

BRAND INFO:
- Name: ${brandName}
- Tagline: "${tagline}"
- Positioning: "${positioning}"
- Tone: ${tone}
- Personality: ${personality}
- Type: ${dispensaryType} dispensary${city ? ` in ${city}` : ''}

Generate ONLY valid JSON with this structure (no markdown, no code blocks):
{
  "sampleContent": [
    {
      "type": "social_post",
      "content": "A 1-3 sentence Instagram caption in this exact brand voice. Include relevant hashtags at the end.",
      "audience": "New customers",
      "aiGenerated": true
    },
    {
      "type": "social_post",
      "content": "A second Instagram post with a different angle — product highlight or educational.",
      "audience": "Regular customers",
      "aiGenerated": true
    },
    {
      "type": "email",
      "content": "Email subject line and first 2 sentences of body copy. Format: SUBJECT: [subject line]\\nHEADER: [first line]\\nBODY: [second line]",
      "audience": "Loyalty members",
      "aiGenerated": true
    }
  ],
  "subTones": {
    "social": "casual|professional|playful|sophisticated|educational|empathetic|authoritative",
    "email": "casual|professional|playful|sophisticated|educational|empathetic|authoritative",
    "customer_service": "casual|professional|playful|sophisticated|educational|empathetic|authoritative",
    "educational": "casual|professional|playful|sophisticated|educational|empathetic|authoritative"
  },
  "vocabulary": {
    "preferred": [
      { "term": "cannabis", "instead": "marijuana", "context": "Our preferred term for the plant" },
      { "term": "flower", "instead": "bud", "context": "For dried flower products" },
      { "term": "explore", "instead": "get high", "context": "Describe the customer journey" }
    ],
    "avoid": [
      { "term": "weed", "reason": "Too casual for our brand voice" },
      { "term": "pot", "reason": "Outdated slang" }
    ],
    "cannabisTerms": [
      { "term": "terpenes", "definition": "Aromatic compounds that give cannabis its flavor and effect profile", "audience": "all" },
      { "term": "cannabinoids", "definition": "Active compounds including THC, CBD, and CBG", "audience": "all" },
      { "term": "entourage effect", "definition": "The synergistic interaction of cannabinoids and terpenes", "audience": "advanced" }
    ]
  }
}

Rules:
- Sample content must actually sound like ${brandName} — use their personality and tone
- Cannabis vocabulary should reflect how THIS brand actually talks (${tone} tone, ${personality})
- Sub-tones: social is usually more casual than email; customer_service is always empathetic
- If the brand is ${dispensaryType}, vocabulary should match (medical brands avoid recreational slang)
- Preferred terms: pick 4-6 that reflect this brand's voice (not generic placeholders)`;

    try {
        const response = await callClaude({
            userMessage: prompt,
            systemPrompt: 'You are a cannabis brand voice expert. Return ONLY valid JSON, no markdown.',
            maxTokens: 2000,
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (!match) return null;

        const enriched = JSON.parse(match[0]);

        // Merge with existing (don't overwrite user-edited samples)
        const result: Partial<BrandGuide['voice']> = {};

        if (!hasSamples && enriched.sampleContent?.length) {
            result.sampleContent = enriched.sampleContent as BrandVoiceSample[];
        }
        if (!hasSubTones && enriched.subTones) {
            result.subTones = enriched.subTones;
        }
        if (!hasVocab && enriched.vocabulary) {
            result.vocabulary = {
                ...(guide.voice?.vocabulary || {}),
                ...enriched.vocabulary,
            };
        }

        return result;
    } catch (error) {
        logger.warn('[BrandGuideEnricher] Voice enrichment failed', { error: (error as Error).message });
        return null;
    }
}

// ---------------------------------------------------------------------------
// Step 2: Target Audience
// ---------------------------------------------------------------------------

async function enrichTargetAudience(guide: BrandGuide): Promise<Partial<BrandGuide['messaging']> | null> {
    // Skip if already has audience data
    if ((guide.messaging as any)?.targetAudience?.primary) return null;

    const hasMessaging = guide.messaging?.positioning || guide.messaging?.valuePropositions?.length;
    if (!hasMessaging) return null;

    const prompt = `Based on this cannabis dispensary's brand messaging, identify their target audience.

Brand: ${guide.brandName || 'Cannabis Dispensary'}
Type: ${(guide.messaging as any)?.dispensaryType || 'recreational'}
City: ${(guide.messaging as any)?.city || ''}
Positioning: ${guide.messaging?.positioning || ''}
Value Propositions: ${guide.messaging?.valuePropositions?.slice(0, 3).join('; ') || ''}
Mission: ${guide.messaging?.missionStatement || ''}

Return ONLY valid JSON:
{
  "targetAudience": {
    "primary": "1-sentence description of primary customer (age range, lifestyle, needs)",
    "secondary": "1-sentence description of secondary customer segment",
    "segments": [
      {
        "segment": "Segment name",
        "description": "Who they are and what they need",
        "characteristics": ["Characteristic 1", "Characteristic 2"]
      }
    ]
  },
  "elevatorPitch": "One compelling 30-second pitch sentence for this dispensary"
}`;

    try {
        const response = await callClaude({
            userMessage: prompt,
            systemPrompt: 'You are a cannabis market researcher. Return ONLY valid JSON.',
            maxTokens: 800,
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (!match) return null;

        const parsed = JSON.parse(match[0]);
        return {
            targetAudience: parsed.targetAudience,
            elevatorPitch: parsed.elevatorPitch || guide.messaging?.elevatorPitch,
        } as any;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Step 3: Brand Archetype
// ---------------------------------------------------------------------------

const ARCHETYPES = [
    'The Sage',          // Knowledge-driven, educational, research-backed
    'The Caregiver',     // Wellness-focused, medical, compassionate
    'The Everyman',      // Accessible, approachable, community-focused
    'The Explorer',      // Adventure, variety, discovering new experiences
    'The Rebel',         // Counter-culture, bold, breaking conventions
    'The Creator',       // Craft, artisan, unique products and experiences
    'The Lover',         // Sensory experience, pleasure, indulgence
    'The Ruler',         // Premium, exclusive, top-shelf quality
    'The Hero',          // Empowering, strength, overcoming challenges
    'The Jester',        // Fun, humor, playful community
    'The Magician',      // Transformative, effects-focused, journey
    'The Innocent',      // Pure, natural, clean products
] as const;

async function enrichBrandArchetype(guide: BrandGuide): Promise<string | null> {
    // Skip if already set
    if ((guide.voice as any)?.archetype) return null;
    if (!guide.messaging?.positioning && !guide.voice?.personality?.length) return null;

    const prompt = `Classify this cannabis brand into ONE of these Jungian brand archetypes:
${ARCHETYPES.map((a, i) => `${i + 1}. ${a}`).join('\n')}

Brand: ${guide.brandName}
Tone: ${guide.voice?.tone || 'professional'}
Personality: ${guide.voice?.personality?.join(', ') || ''}
Positioning: ${guide.messaging?.positioning || ''}
Tagline: ${guide.messaging?.tagline || ''}
Type: ${(guide.messaging as any)?.dispensaryType || 'recreational'}

Return ONLY a valid JSON object: { "archetype": "The Sage" }
Pick the single best fit based on their actual voice and positioning.`;

    try {
        const response = await callClaude({
            userMessage: prompt,
            systemPrompt: 'Return ONLY valid JSON with one field: archetype.',
            maxTokens: 100,
        });

        const match = response.match(/\{[\s\S]*\}/);
        if (!match) return null;

        const parsed = JSON.parse(match[0]);
        const archetype = parsed.archetype as string;

        // Validate it's one of our known archetypes
        if (ARCHETYPES.some(a => a === archetype)) return archetype;
        return null;
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Step 4: Compliance (no AI needed — lookup table)
// ---------------------------------------------------------------------------

function buildComplianceFromState(guide: BrandGuide): Partial<BrandGuide['compliance']> | null {
    // Skip if already has compliance data
    if (guide.compliance?.primaryState && guide.compliance?.requiredDisclaimers?.age) return null;

    // Extract state from messaging (set by the extractor)
    const state = (guide.messaging as any)?.state as string | undefined;
    const dispensaryType = (guide.messaging as any)?.dispensaryType as string | undefined;

    // Convert full state name to abbreviation
    const STATE_ABBREVS: Record<string, string> = {
        'New York': 'NY', 'California': 'CA', 'Colorado': 'CO', 'Massachusetts': 'MA',
        'Illinois': 'IL', 'New Jersey': 'NJ', 'Washington': 'WA', 'Oregon': 'OR',
        'Michigan': 'MI', 'Nevada': 'NV', 'Arizona': 'AZ', 'Connecticut': 'CT',
        'Vermont': 'VT', 'Maine': 'ME', 'Montana': 'MT', 'New Mexico': 'NM',
        'Virginia': 'VA', 'Rhode Island': 'RI', 'Maryland': 'MD', 'Missouri': 'MO',
        'Alaska': 'AK', 'Oklahoma': 'OK', 'Pennsylvania': 'PA',
    };

    const stateAbbrev = state ? (STATE_ABBREVS[state] || state.toUpperCase().slice(0, 2)) : null;
    if (!stateAbbrev) return null;

    const rules = STATE_COMPLIANCE[stateAbbrev] || FALLBACK_COMPLIANCE;

    // Adjust medical claims based on dispensary type
    const medicalClaims = dispensaryType === 'medical'
        ? 'limited'
        : rules.medicalClaims;

    return {
        primaryState: stateAbbrev as USState,
        operatingStates: [stateAbbrev as USState],
        requiredDisclaimers: {
            age: rules.ageDisclaimer,
        },
        ageGateLanguage: `You must be 21 years of age or older to enter this site. Please verify your age.`,
        medicalClaims,
        contentRestrictions: rules.restrictions.map(r => ({
            restriction: r,
            reason: 'State cannabis marketing regulation',
        })),
        stateSpecificRules: [],
    } as any;
}
