'use server';

/**
 * Hero Banner AI Suggestions
 *
 * Generates hero banner variations based on brand guide data and business model.
 * Similar to carousel-suggestions.ts but for hero banners.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Hero, HeroStyle, HeroPurchaseModel, HeroCtaAction } from '@/types/heroes';
import { createHero } from '@/app/actions/heroes';
import { getBrandGuide } from '@/server/actions/brand-guide';
import { ai } from '@/ai/genkit';
import { logger } from '@/lib/logger';

export interface HeroSuggestion {
    brandName: string;
    tagline: string;
    description: string;
    primaryColor: string;
    style: HeroStyle;
    purchaseModel: HeroPurchaseModel;
    primaryCta: {
        label: string;
        action: HeroCtaAction;
    };
    rationale: string;
    source: 'brand_guide' | 'ai';
    priority: 'high' | 'medium' | 'low';
}

/**
 * Fetch brand guide for an organization
 */
async function fetchBrandGuide(orgId: string) {
    const db = getAdminFirestore();
    try {
        const brandGuideDoc = await db.collection('brand_guides').doc(orgId).get();
        if (brandGuideDoc.exists) {
            return brandGuideDoc.data() as any;
        }
        return null;
    } catch (error) {
        logger.error('Error fetching brand guide:', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

/**
 * Fetch organization data
 */
async function fetchOrgData(orgId: string) {
    const db = getAdminFirestore();

    try {
        // Try as brand first
        let orgDoc = await db.collection('brands').doc(orgId).get();
        if (orgDoc.exists) {
            return { type: 'brand' as const, data: orgDoc.data() };
        }

        // Try as dispensary
        orgDoc = await db.collection('dispensaries').doc(orgId).get();
        if (orgDoc.exists) {
            return { type: 'dispensary' as const, data: orgDoc.data() };
        }

        // Try organizations collection
        orgDoc = await db.collection('organizations').doc(orgId).get();
        if (orgDoc.exists) {
            return { type: 'organization' as const, data: orgDoc.data() };
        }

        return null;
    } catch (error) {
        logger.error('Error fetching org data:', error instanceof Error ? error : new Error(String(error)));
        return null;
    }
}

/**
 * Generate AI-suggested hero banners based on brand guide and business model
 */
export async function generateAIHeroSuggestions(orgId: string): Promise<{ success: boolean; suggestions?: HeroSuggestion[]; error?: string }> {
    try {
        const [brandGuide, orgData] = await Promise.all([
            fetchBrandGuide(orgId),
            fetchOrgData(orgId)
        ]);

        if (!brandGuide && !orgData) {
            return {
                success: false,
                error: 'No brand guide or organization data found. Set up your brand guide first.'
            };
        }

        const suggestions: HeroSuggestion[] = [];

        // Extract brand info
        const brandName = (brandGuide as any)?.messaging?.brandName || (orgData?.data as any)?.name || 'Your Brand';
        const primaryColor = (brandGuide as any)?.visualIdentity?.colors?.primary?.hex || '#16a34a';
        const tagline = (brandGuide as any)?.messaging?.tagline || '';
        const alternateTaglines = (brandGuide as any)?.messaging?.alternateTaglines || [];
        const allTaglines = [tagline, ...alternateTaglines].filter(Boolean);
        const description = (brandGuide as any)?.messaging?.elevatorPitch || '';

        // Suggestion 1: Default - Brand Guide Based
        if (brandGuide) {
            suggestions.push({
                brandName,
                tagline: allTaglines[0] || 'Premium Cannabis Products',
                description: description.slice(0, 150) || 'Discover our premium selection',
                primaryColor,
                style: 'professional',
                purchaseModel: 'local_pickup',
                primaryCta: {
                    label: 'Find Near Me',
                    action: 'find_near_me',
                },
                rationale: 'Professional hero using your brand guide colors and messaging',
                source: 'brand_guide',
                priority: 'high',
            });
        }

        // Suggestion 2: Bold/Vibrant Style
        suggestions.push({
            brandName,
            tagline: allTaglines[1] || allTaglines[0] || 'Experience Premium Quality',
            description: 'Discover our carefully curated selection',
            primaryColor,
            style: 'bold',
            purchaseModel: 'local_pickup',
            primaryCta: {
                label: 'Shop Now',
                action: 'shop_now',
            },
            rationale: 'Bold, attention-grabbing hero with strong visual impact',
            source: 'ai',
            priority: 'high',
        });

        // Suggestion 3: Minimal/Clean Style
        suggestions.push({
            brandName,
            tagline: allTaglines[2] || 'Quality You Can Trust',
            description: 'Premium cannabis products for the discerning customer',
            primaryColor,
            style: 'minimal',
            purchaseModel: 'hybrid',
            primaryCta: {
                label: 'Explore Products',
                action: 'shop_now',
            },
            rationale: 'Clean, minimal design that lets your brand speak for itself',
            source: 'ai',
            priority: 'medium',
        });

        // Suggestion 4: Online-First Model
        if (orgData?.type === 'brand') {
            suggestions.push({
                brandName,
                tagline: allTaglines[0] || 'Available Nationwide',
                description: 'Shop our full catalog online and find a local retailer',
                primaryColor,
                style: 'default',
                purchaseModel: 'online_only',
                primaryCta: {
                    label: 'Shop Online',
                    action: 'shop_now',
                },
                rationale: 'Optimized for online shopping and nationwide distribution',
                source: 'ai',
                priority: 'medium',
            });
        }

        // Suggestion 5: Local Focus
        if (orgData?.type === 'dispensary') {
            suggestions.push({
                brandName,
                tagline: 'Your Local Cannabis Destination',
                description: 'Visit us in-store or order for pickup',
                primaryColor,
                style: 'professional',
                purchaseModel: 'local_pickup',
                primaryCta: {
                    label: 'Visit Us Today',
                    action: 'find_near_me',
                },
                rationale: 'Emphasizes local presence and in-store experience',
                source: 'ai',
                priority: 'high',
            });
        }

        return { success: true, suggestions: suggestions.slice(0, 5) };
    } catch (error) {
        logger.error('Error generating hero suggestions:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to generate suggestions' };
    }
}

/**
 * Create a hero from a suggestion
 */
export async function createHeroFromSuggestion(
    orgId: string,
    suggestion: HeroSuggestion
): Promise<{ success: boolean; data?: Hero; error?: string }> {
    try {
        const result = await createHero({
            orgId,
            brandName: suggestion.brandName,
            tagline: suggestion.tagline,
            description: suggestion.description,
            primaryColor: suggestion.primaryColor,
            style: suggestion.style,
            purchaseModel: suggestion.purchaseModel,
            primaryCta: suggestion.primaryCta,
            verified: true,
            displayOrder: 0,
            active: false, // Created as draft
        });

        return result;
    } catch (error) {
        logger.error('Error creating hero from suggestion:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to create hero banner' };
    }
}

/**
 * Get smart preset prompts based on brand guide
 */
export async function getHeroPresets(orgId: string): Promise<{
    success: boolean;
    presets?: Array<{
        label: string;
        prompt: string;
        icon: string;
        available: boolean;
        source: 'brand_guide' | 'ai';
        reason?: string;
    }>;
    error?: string;
}> {
    try {
        const [brandGuide, orgData] = await Promise.all([
            fetchBrandGuide(orgId),
            fetchOrgData(orgId)
        ]);

        const presets: Array<{
            label: string;
            prompt: string;
            icon: string;
            available: boolean;
            source: 'brand_guide' | 'ai';
            reason?: string;
        }> = [];

        // Brand Guide Based Preset
        if (brandGuide) {
            presets.push({
                label: 'From Brand Guide',
                prompt: 'Create a hero banner using my brand guide colors and messaging',
                icon: 'sparkles',
                available: true,
                source: 'brand_guide',
            });
        } else {
            presets.push({
                label: 'Brand Guide Hero',
                prompt: 'Create from brand guide',
                icon: 'sparkles',
                available: false,
                source: 'brand_guide',
                reason: 'Set up your brand guide first to unlock this preset',
            });
        }

        // Style-based presets
        presets.push({
            label: 'Bold & Vibrant',
            prompt: 'Create a bold, eye-catching hero with strong visual impact',
            icon: 'star',
            available: true,
            source: 'ai',
        });

        presets.push({
            label: 'Clean & Minimal',
            prompt: 'Create a minimal, professional hero with clean design',
            icon: 'layers',
            available: true,
            source: 'ai',
        });

        presets.push({
            label: 'Premium Luxury',
            prompt: 'Create a premium, high-end hero for luxury branding',
            icon: 'crown',
            available: true,
            source: 'ai',
        });

        // Business model presets
        if (orgData?.type === 'brand') {
            presets.push({
                label: 'Nationwide Brand',
                prompt: 'Create a hero for nationwide online shopping',
                icon: 'target',
                available: true,
                source: 'ai',
            });
        }

        if (orgData?.type === 'dispensary') {
            presets.push({
                label: 'Local Dispensary',
                prompt: 'Create a hero emphasizing local in-store experience',
                icon: 'sun',
                available: true,
                source: 'ai',
            });
        }

        return { success: true, presets };
    } catch (error) {
        logger.error('Error generating hero presets:', error instanceof Error ? error : new Error(String(error)));
        return { success: false, error: 'Failed to generate presets' };
    }
}

/**
 * Parse natural language to create a hero banner
 * Examples:
 * - "Create a hero for my premium flower brand with green colors"
 * - "Make a bold hero for local pickup customers"
 */
export async function parseNaturalLanguageHero(
    orgId: string,
    naturalLanguageRule: string
): Promise<{ success: boolean; suggestion?: HeroSuggestion; error?: string }> {
    try {
        if (!orgId) throw new Error('Organization ID is required');
        if (!naturalLanguageRule.trim()) throw new Error('Please describe your hero banner');

        const [brandGuide, orgData] = await Promise.all([
            fetchBrandGuide(orgId),
            fetchOrgData(orgId)
        ]);

        const brandName = (brandGuide as any)?.messaging?.brandName || (orgData?.data as any)?.name || 'Your Brand';
        const primaryColor = (brandGuide as any)?.visualIdentity?.colors?.primary?.hex || '#16a34a';
        const tagline = (brandGuide as any)?.messaging?.tagline || '';

        const systemPrompt = `You are a hero banner designer for cannabis brands.
Parse the user's request and generate hero banner content.

Respond with ONLY valid JSON in this exact format:
{
  "tagline": "Short compelling tagline (max 60 chars)",
  "description": "Brief description (max 150 chars)",
  "style": "default" | "minimal" | "bold" | "professional",
  "purchaseModel": "online_only" | "local_pickup" | "hybrid",
  "ctaLabel": "Button text (e.g., Shop Now, Find Near Me)",
  "ctaAction": "find_near_me" | "shop_now"
}`;

        const userPrompt = `Create a hero banner based on: "${naturalLanguageRule}"

Brand context:
- Brand name: ${brandName}
- Primary color: ${primaryColor}
${tagline ? `- Current tagline: ${tagline}` : ''}
${orgData?.type ? `- Business type: ${orgData.type}` : ''}`;

        const { text: responseText } = await ai.generate({
            model: 'googleai/gemini-2.5-flash-lite',
            system: systemPrompt,
            prompt: userPrompt,
        });

        // Parse AI response
        let parsedConfig;
        try {
            const jsonMatch = responseText.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                throw new Error('No valid JSON found in response');
            }
            parsedConfig = JSON.parse(jsonMatch[0]);
        } catch (parseError) {
            logger.error('Failed to parse AI response:', parseError instanceof Error ? parseError : new Error(String(parseError)));
            return { success: false, error: 'Could not understand your request. Please try rephrasing.' };
        }

        return {
            success: true,
            suggestion: {
                brandName,
                tagline: parsedConfig.tagline || 'Premium Cannabis Products',
                description: parsedConfig.description || '',
                primaryColor,
                style: parsedConfig.style || 'default',
                purchaseModel: parsedConfig.purchaseModel || 'local_pickup',
                primaryCta: {
                    label: parsedConfig.ctaLabel || 'Shop Now',
                    action: parsedConfig.ctaAction || 'shop_now',
                },
                rationale: `AI-generated based on: "${naturalLanguageRule}"`,
                source: 'ai',
                priority: 'medium',
            }
        };
    } catch (error) {
        logger.error('Error parsing natural language hero:', error instanceof Error ? error : new Error(String(error)));
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to process your request'
        };
    }
}
