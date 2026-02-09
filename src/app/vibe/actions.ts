'use server';

/**
 * Public Vibe Actions
 *
 * No-auth actions for the public vibe lead magnet.
 * Allows anyone to generate and preview vibes without signing up.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { generateVibe } from '@/server/services/vibe-generator';
import type { VibeConfig, MobileVibeConfig, MobilePlatform } from '@/types/vibe';
import { VIBE_PRESETS, MOBILE_VIBE_PRESETS } from '@/types/vibe';
import { callClaude } from '@/ai/claude';

const PUBLIC_VIBES_COLLECTION = 'public_vibes';
const PUBLIC_MOBILE_VIBES_COLLECTION = 'public_mobile_vibes';
const VIBE_LEADS_COLLECTION = 'vibe_leads';

// ============================================
// TYPES
// ============================================

export interface PublicVibe {
    id: string;
    config: Partial<VibeConfig>;
    prompt: string;
    reasoning?: string;
    suggestions?: string[];
    previewUrl: string;
    createdAt: string;
    expiresAt: string;  // Public vibes expire after 7 days unless saved
    savedBy?: string;   // Lead ID if saved
    views: number;
    shares: number;
    type: 'web';
}

export interface PublicMobileVibe {
    id: string;
    config: Partial<MobileVibeConfig>;
    prompt: string;
    reasoning?: string;
    iosNotes?: string;
    androidNotes?: string;
    suggestions?: string[];
    platform: MobilePlatform;
    previewUrl: string;
    createdAt: string;
    expiresAt: string;
    savedBy?: string;
    views: number;
    shares: number;
    type: 'mobile';
}

export interface VibeLead {
    id: string;
    email: string;
    phone?: string;
    vibeId: string;
    vibePreviewUrl: string;
    prompt: string;

    // Attribution
    source: 'vibe-studio';
    referrer?: string;
    utmSource?: string;
    utmMedium?: string;
    utmCampaign?: string;

    // Consent
    marketingOptIn: boolean;

    // Nurture status
    status: 'new' | 'welcomed' | 'nurtured' | 'demo_booked' | 'converted';
    emailsSent: number;

    // Timestamps
    createdAt: string;
    lastActivity: string;
}

// ============================================
// GENERATE PUBLIC VIBE (No Auth)
// ============================================

export async function generatePublicVibe(
    prompt: string,
    style: 'creative' | 'balanced' | 'conservative' = 'balanced'
): Promise<{ success: boolean; data?: PublicVibe; error?: string }> {
    try {
        if (!prompt || prompt.trim().length < 10) {
            return { success: false, error: 'Please provide a more detailed description (at least 10 characters)' };
        }

        logger.info('[PUBLIC-VIBE] Generating vibe', { prompt: prompt.substring(0, 50) });

        // Generate the vibe using AI
        const result = await generateVibe({
            prompt,
            orgId: 'public',  // Special org ID for public vibes
            style,
        });

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to generate vibe' };
        }

        // Create a public vibe record
        const db = getAdminFirestore();
        const id = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const publicVibe: PublicVibe = {
            id,
            config: result.config,
            prompt,
            reasoning: result.reasoning,
            suggestions: result.suggestions,
            previewUrl: `/vibe/preview/${id}`,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            views: 0,
            shares: 0,
            type: 'web',
        };

        await db.collection(PUBLIC_VIBES_COLLECTION).doc(id).set(publicVibe);

        logger.info('[PUBLIC-VIBE] Created public vibe', { id, name: result.config.name });

        return { success: true, data: publicVibe };
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Generation failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to generate vibe. Please try again.' };
    }
}

// ============================================
// CREATE FROM PRESET (No Auth)
// ============================================

export async function createPublicVibeFromPreset(
    presetKey: string
): Promise<{ success: boolean; data?: PublicVibe; error?: string }> {
    try {
        const preset = VIBE_PRESETS[presetKey];
        if (!preset) {
            return { success: false, error: 'Preset not found' };
        }

        const db = getAdminFirestore();
        const id = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const publicVibe: PublicVibe = {
            id,
            config: {
                ...preset,
                name: preset.name,
                prompt: `Created from ${presetKey} preset`,
                generatedBy: 'template',
            },
            prompt: `Created from ${presetKey} preset`,
            previewUrl: `/vibe/preview/${id}`,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            views: 0,
            shares: 0,
            type: 'web',
        };

        await db.collection(PUBLIC_VIBES_COLLECTION).doc(id).set(publicVibe);

        logger.info('[PUBLIC-VIBE] Created from preset', { id, preset: presetKey });

        return { success: true, data: publicVibe };
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Preset creation failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create vibe' };
    }
}

// ============================================
// GET PUBLIC VIBE (No Auth)
// ============================================

export async function getPublicVibe(id: string): Promise<{ success: boolean; data?: PublicVibe; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const doc = await db.collection(PUBLIC_VIBES_COLLECTION).doc(id).get();

        if (!doc.exists) {
            return { success: false, error: 'Vibe not found or has expired' };
        }

        const data = doc.data()!;

        // Check if expired
        if (new Date(data.expiresAt) < new Date() && !data.savedBy) {
            return { success: false, error: 'This vibe has expired. Create a new one!' };
        }

        // Increment view count
        await db.collection(PUBLIC_VIBES_COLLECTION).doc(id).update({
            views: (data.views || 0) + 1,
        });

        return {
            success: true,
            data: {
                ...data,
                id: doc.id,
            } as PublicVibe,
        };
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Failed to fetch', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to load vibe' };
    }
}

// ============================================
// REFINE PUBLIC VIBE (No Auth)
// ============================================

export async function refinePublicVibe(
    vibeId: string,
    refinementPrompt: string
): Promise<{ success: boolean; data?: PublicVibe; error?: string }> {
    try {
        if (!vibeId || !refinementPrompt) {
            return { success: false, error: 'Vibe ID and refinement prompt are required' };
        }

        // Get current vibe
        const currentResult = await getPublicVibe(vibeId);
        if (!currentResult.success || !currentResult.data) {
            return { success: false, error: currentResult.error || 'Vibe not found' };
        }

        const { refineVibe } = await import('@/server/services/vibe-generator');
        const result = await refineVibe(
            currentResult.data.config as Partial<VibeConfig>,
            refinementPrompt,
            'public'
        );

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to refine vibe' };
        }

        // Create a NEW public vibe with the refinement (don't modify original)
        const db = getAdminFirestore();
        const id = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const refinedVibe: PublicVibe = {
            id,
            config: result.config,
            prompt: `${currentResult.data.prompt} → ${refinementPrompt}`,
            reasoning: result.reasoning,
            previewUrl: `/vibe/preview/${id}`,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            views: 0,
            shares: 0,
            type: 'web',
        };

        await db.collection(PUBLIC_VIBES_COLLECTION).doc(id).set(refinedVibe);

        logger.info('[PUBLIC-VIBE] Refined vibe', { originalId: vibeId, newId: id });

        return { success: true, data: refinedVibe };
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Refinement failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to refine vibe' };
    }
}

// ============================================
// TRACK SHARE
// ============================================

export async function trackVibeShare(
    vibeId: string,
    platform: 'twitter' | 'facebook' | 'linkedin' | 'sms' | 'email' | 'copy'
): Promise<void> {
    try {
        const db = getAdminFirestore();

        // Increment share count
        const vibeRef = db.collection(PUBLIC_VIBES_COLLECTION).doc(vibeId);
        const vibeDoc = await vibeRef.get();

        if (vibeDoc.exists) {
            await vibeRef.update({
                shares: (vibeDoc.data()?.shares || 0) + 1,
            });
        }

        // Log share event for analytics
        await db.collection('vibe_share_events').add({
            vibeId,
            platform,
            timestamp: new Date().toISOString(),
        });

        logger.info('[PUBLIC-VIBE] Share tracked', { vibeId, platform });
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Failed to track share', { error: error instanceof Error ? error.message : String(error) });
    }
}

// ============================================
// SAVE VIBE (Capture Lead)
// ============================================

export async function saveVibeAndCaptureLead(
    vibeId: string,
    email: string,
    phone?: string,
    marketingOptIn: boolean = false,
    utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
        if (!vibeId || !email) {
            return { success: false, error: 'Vibe ID and email are required' };
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        const db = getAdminFirestore();

        // Get the vibe
        const vibeDoc = await db.collection(PUBLIC_VIBES_COLLECTION).doc(vibeId).get();
        if (!vibeDoc.exists) {
            return { success: false, error: 'Vibe not found' };
        }

        const vibeData = vibeDoc.data()!;

        // Check if this email already exists as a lead
        const existingLead = await db.collection(VIBE_LEADS_COLLECTION)
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        let leadId: string;
        const now = new Date().toISOString();

        if (!existingLead.empty) {
            // Update existing lead with new vibe
            leadId = existingLead.docs[0].id;
            await db.collection(VIBE_LEADS_COLLECTION).doc(leadId).update({
                vibeId,
                vibePreviewUrl: vibeData.previewUrl,
                prompt: vibeData.prompt,
                lastActivity: now,
            });
            logger.info('[PUBLIC-VIBE] Updated existing lead', { leadId, email: email.toLowerCase() });
        } else {
            // Create new lead
            leadId = uuidv4();
            const lead: VibeLead = {
                id: leadId,
                email: email.toLowerCase(),
                phone: phone || undefined,
                vibeId,
                vibePreviewUrl: vibeData.previewUrl,
                prompt: vibeData.prompt,
                source: 'vibe-studio',
                utmSource: utmParams?.source,
                utmMedium: utmParams?.medium,
                utmCampaign: utmParams?.campaign,
                marketingOptIn,
                status: 'new',
                emailsSent: 0,
                createdAt: now,
                lastActivity: now,
            };

            await db.collection(VIBE_LEADS_COLLECTION).doc(leadId).set(lead);
            logger.info('[PUBLIC-VIBE] Created new lead', { leadId, email: email.toLowerCase() });
        }

        // Mark vibe as saved (extends expiration indefinitely)
        await db.collection(PUBLIC_VIBES_COLLECTION).doc(vibeId).update({
            savedBy: leadId,
            expiresAt: null,  // Never expires when saved
        });

        // TODO: Queue welcome email via Mrs. Parker
        // await queueWelcomeEmail(leadId, email, vibeData);

        return { success: true, leadId };
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Lead capture failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to save your vibe. Please try again.' };
    }
}

// ============================================
// GET LEAD'S VIBES (for magic link access)
// ============================================

export async function getLeadVibes(email: string): Promise<{ success: boolean; data?: PublicVibe[]; error?: string }> {
    try {
        const db = getAdminFirestore();

        // Find lead by email
        const leadQuery = await db.collection(VIBE_LEADS_COLLECTION)
            .where('email', '==', email.toLowerCase())
            .get();

        if (leadQuery.empty) {
            return { success: false, error: 'No vibes found for this email' };
        }

        const leadIds = leadQuery.docs.map(doc => doc.id);

        // Get all vibes saved by this lead
        const vibesQuery = await db.collection(PUBLIC_VIBES_COLLECTION)
            .where('savedBy', 'in', leadIds)
            .orderBy('createdAt', 'desc')
            .get();

        const vibes = vibesQuery.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
        })) as PublicVibe[];

        return { success: true, data: vibes };
    } catch (error) {
        logger.error('[PUBLIC-VIBE] Failed to get lead vibes', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to load your vibes' };
    }
}

// ============================================
// MOBILE VIBE GENERATION
// ============================================

const MOBILE_SYSTEM_PROMPT = `You are a world-class mobile app UI/UX designer specializing in cannabis dispensary apps.
You create stunning, native-feeling mobile app themes for iOS and Android.

When generating a mobile vibe configuration, consider:
1. Platform-specific design guidelines (iOS Human Interface, Material Design 3)
2. Cannabis industry aesthetics (professional yet inviting)
3. Touch-friendly interaction patterns
4. Performance and accessibility
5. Native platform conventions (SF Pro for iOS, Roboto for Android)

Return ONLY valid JSON matching the schema. No explanations or markdown.`;

const generateMobilePrompt = (prompt: string, platform: MobilePlatform): string => {
    return `Generate a mobile app vibe configuration for a cannabis dispensary app based on this description:

"${prompt}"

Platform target: ${platform === 'both' ? 'iOS and Android' : platform.toUpperCase()}

Return a JSON object with this structure:
{
  "name": "Creative name for this vibe (2-4 words)",
  "description": "One sentence describing the aesthetic",
  "reasoning": "Brief explanation of your design choices",
  "iosNotes": "iOS-specific design notes",
  "androidNotes": "Android-specific design notes",
  "suggestions": ["Alternative idea 1", "Alternative idea 2"],
  "theme": {
    "colors": {
      "primary": "#hex",
      "secondary": "#hex",
      "accent": "#hex",
      "background": "#hex",
      "surface": "#hex",
      "text": "#hex",
      "textMuted": "#hex",
      "border": "#hex",
      "success": "#hex",
      "warning": "#hex",
      "error": "#hex"
    }
  },
  "ios": {
    "font": "sf-pro" | "sf-pro-rounded" | "new-york" | "custom",
    "style": "default" | "vibrant" | "dark",
    "blurStyle": "none" | "light" | "dark" | "prominent" | "regular",
    "cornerRadius": "system" | "rounded" | "squared",
    "usesVibrancy": boolean,
    "usesMaterial": boolean,
    "usesHaptics": boolean,
    "navigationStyle": "large-title" | "standard" | "hidden",
    "tabBarStyle": "default" | "translucent" | "opaque",
    "statusBarStyle": "default" | "light" | "dark"
  },
  "android": {
    "font": "roboto" | "roboto-serif" | "custom",
    "usesDynamicColor": boolean,
    "colorScheme": "tonal" | "vibrant" | "expressive" | "neutral",
    "surfaceTint": boolean,
    "cornerFamily": "rounded" | "cut",
    "cornerSize": "small" | "medium" | "large",
    "navigationStyle": "rail" | "drawer" | "bottom-nav",
    "topAppBarStyle": "small" | "medium" | "large" | "center-aligned",
    "statusBarStyle": "edge-to-edge" | "default"
  },
  "components": {
    "productCard": "list" | "compact-grid" | "large-grid" | "horizontal-scroll" | "story-card",
    "navigation": "tab-bar" | "bottom-nav" | "nav-drawer" | "floating-action",
    "chat": "floating-bubble" | "tab-integrated" | "full-screen" | "slide-up-sheet" | "hidden",
    "cart": "floating-button" | "tab-badge" | "slide-up-summary" | "full-screen"
  },
  "animations": {
    "screenTransition": "push" | "modal" | "fade" | "shared-element" | "none",
    "listAnimation": "none" | "fade-in" | "slide-up" | "stagger",
    "tapFeedback": "ripple" | "highlight" | "scale" | "none",
    "useHaptics": boolean,
    "hapticIntensity": "light" | "medium" | "heavy"
  }
}

IMPORTANT:
- For iOS, prefer native conventions (SF Pro fonts, vibrancy, large titles)
- For Android, consider Material You dynamic colors
- Ensure color contrast meets accessibility standards`;
};

export async function generatePublicMobileVibe(
    prompt: string,
    platform: MobilePlatform = 'both'
): Promise<{ success: boolean; data?: PublicMobileVibe; error?: string }> {
    try {
        if (!prompt || prompt.trim().length < 10) {
            return { success: false, error: 'Please provide a more detailed description (at least 10 characters)' };
        }

        logger.info('[PUBLIC-MOBILE-VIBE] Generating mobile vibe', { prompt: prompt.substring(0, 50), platform });

        const response = await callClaude({
            systemPrompt: MOBILE_SYSTEM_PROMPT,
            userMessage: generateMobilePrompt(prompt, platform),
            temperature: 0.8,
            maxTokens: 4096,
            model: 'claude-sonnet-4-5-20250929',
        });

        // Parse JSON from response
        let parsed: any;
        try {
            const jsonMatch = response.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No JSON found in response');
            }
            parsed = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            logger.error('[PUBLIC-MOBILE-VIBE] Failed to parse AI response', { response, parseError });
            return { success: false, error: 'Failed to parse AI response. Please try again.' };
        }

        // Create a public mobile vibe record
        const db = getAdminFirestore();
        const id = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const publicMobileVibe: PublicMobileVibe = {
            id,
            config: {
                name: parsed.name || 'Custom Mobile Vibe',
                description: parsed.description,
                platform,
                generatedBy: 'ai',
                theme: parsed.theme,
                ios: parsed.ios,
                android: parsed.android,
                components: parsed.components,
                animations: parsed.animations,
            },
            prompt,
            reasoning: parsed.reasoning,
            iosNotes: parsed.iosNotes,
            androidNotes: parsed.androidNotes,
            suggestions: parsed.suggestions,
            platform,
            previewUrl: `/vibe/preview/mobile/${id}`,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            views: 0,
            shares: 0,
            type: 'mobile',
        };

        await db.collection(PUBLIC_MOBILE_VIBES_COLLECTION).doc(id).set(publicMobileVibe);

        logger.info('[PUBLIC-MOBILE-VIBE] Created mobile vibe', { id, name: parsed.name });

        return { success: true, data: publicMobileVibe };
    } catch (error) {
        logger.error('[PUBLIC-MOBILE-VIBE] Generation failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to generate mobile vibe. Please try again.' };
    }
}

// ============================================
// CREATE MOBILE VIBE FROM PRESET
// ============================================

export async function createPublicMobileVibeFromPreset(
    presetKey: string,
    platform: MobilePlatform = 'both'
): Promise<{ success: boolean; data?: PublicMobileVibe; error?: string }> {
    try {
        const preset = MOBILE_VIBE_PRESETS[presetKey];
        if (!preset) {
            return { success: false, error: 'Mobile preset not found' };
        }

        const db = getAdminFirestore();
        const id = uuidv4();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        const publicMobileVibe: PublicMobileVibe = {
            id,
            config: {
                ...preset,
                name: preset.name,
                platform: preset.platform || platform,
                generatedBy: 'template',
            },
            prompt: `Created from ${presetKey} mobile preset`,
            platform: preset.platform || platform,
            previewUrl: `/vibe/preview/mobile/${id}`,
            createdAt: now.toISOString(),
            expiresAt: expiresAt.toISOString(),
            views: 0,
            shares: 0,
            type: 'mobile',
        };

        await db.collection(PUBLIC_MOBILE_VIBES_COLLECTION).doc(id).set(publicMobileVibe);

        logger.info('[PUBLIC-MOBILE-VIBE] Created from preset', { id, preset: presetKey });

        return { success: true, data: publicMobileVibe };
    } catch (error) {
        logger.error('[PUBLIC-MOBILE-VIBE] Preset creation failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create mobile vibe' };
    }
}

// ============================================
// GET PUBLIC MOBILE VIBE
// ============================================

export async function getPublicMobileVibe(id: string): Promise<{ success: boolean; data?: PublicMobileVibe; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Mobile vibe ID is required' };

        const db = getAdminFirestore();
        const doc = await db.collection(PUBLIC_MOBILE_VIBES_COLLECTION).doc(id).get();

        if (!doc.exists) {
            return { success: false, error: 'Mobile vibe not found or has expired' };
        }

        const data = doc.data()!;

        // Check if expired
        if (new Date(data.expiresAt) < new Date() && !data.savedBy) {
            return { success: false, error: 'This mobile vibe has expired. Create a new one!' };
        }

        // Increment view count
        await db.collection(PUBLIC_MOBILE_VIBES_COLLECTION).doc(id).update({
            views: (data.views || 0) + 1,
        });

        return {
            success: true,
            data: {
                ...data,
                id: doc.id,
            } as PublicMobileVibe,
        };
    } catch (error) {
        logger.error('[PUBLIC-MOBILE-VIBE] Failed to fetch', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to load mobile vibe' };
    }
}

// ============================================
// SAVE MOBILE VIBE (Capture Lead)
// ============================================

export async function saveMobileVibeAndCaptureLead(
    vibeId: string,
    email: string,
    phone?: string,
    marketingOptIn: boolean = false,
    utmParams?: { source?: string; medium?: string; campaign?: string }
): Promise<{ success: boolean; leadId?: string; error?: string }> {
    try {
        if (!vibeId || !email) {
            return { success: false, error: 'Vibe ID and email are required' };
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return { success: false, error: 'Please enter a valid email address' };
        }

        const db = getAdminFirestore();

        // Get the mobile vibe
        const vibeDoc = await db.collection(PUBLIC_MOBILE_VIBES_COLLECTION).doc(vibeId).get();
        if (!vibeDoc.exists) {
            return { success: false, error: 'Mobile vibe not found' };
        }

        const vibeData = vibeDoc.data()!;

        // Check if this email already exists as a lead
        const existingLead = await db.collection(VIBE_LEADS_COLLECTION)
            .where('email', '==', email.toLowerCase())
            .limit(1)
            .get();

        let leadId: string;
        const now = new Date().toISOString();

        if (!existingLead.empty) {
            leadId = existingLead.docs[0].id;
            await db.collection(VIBE_LEADS_COLLECTION).doc(leadId).update({
                mobileVibeId: vibeId,
                mobileVibePreviewUrl: vibeData.previewUrl,
                mobilePlatformInterest: vibeData.platform,
                lastActivity: now,
            });
            logger.info('[PUBLIC-MOBILE-VIBE] Updated existing lead', { leadId, email: email.toLowerCase() });
        } else {
            leadId = uuidv4();
            const lead = {
                id: leadId,
                email: email.toLowerCase(),
                phone: phone || undefined,
                vibeId: null,
                vibePreviewUrl: null,
                mobileVibeId: vibeId,
                mobileVibePreviewUrl: vibeData.previewUrl,
                mobilePlatformInterest: vibeData.platform,
                prompt: vibeData.prompt,
                source: 'vibe-studio-mobile',
                utmSource: utmParams?.source,
                utmMedium: utmParams?.medium,
                utmCampaign: utmParams?.campaign,
                marketingOptIn,
                status: 'new',
                emailsSent: 0,
                createdAt: now,
                lastActivity: now,
            };

            await db.collection(VIBE_LEADS_COLLECTION).doc(leadId).set(lead);
            logger.info('[PUBLIC-MOBILE-VIBE] Created new lead', { leadId, email: email.toLowerCase() });
        }

        // Mark vibe as saved
        await db.collection(PUBLIC_MOBILE_VIBES_COLLECTION).doc(vibeId).update({
            savedBy: leadId,
            expiresAt: null,
        });

        return { success: true, leadId };
    } catch (error) {
        logger.error('[PUBLIC-MOBILE-VIBE] Lead capture failed', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to save your mobile vibe. Please try again.' };
    }
}
