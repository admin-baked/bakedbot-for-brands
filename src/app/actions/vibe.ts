'use server';

/**
 * Vibe Studio Server Actions
 *
 * CRUD operations for vibe configurations.
 * Allows brands/dispensaries to save and manage their custom themes.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import type { VibeConfig, MobileVibeConfig, MobilePlatform } from '@/types/vibe';

const VIBES_COLLECTION = 'vibes';
const MOBILE_VIBES_COLLECTION = 'mobile_vibes';

// Helper to convert Firestore Timestamps to ISO strings
const toISOString = (val: any): string | undefined => {
    if (!val) return undefined;
    if (val.toDate) return val.toDate().toISOString();
    if (val instanceof Date) return val.toISOString();
    if (typeof val === 'string') return val;
    return undefined;
};

// Helper to resolve user's orgId
async function resolveOrgId(
    firestore: FirebaseFirestore.Firestore,
    user: { uid: string; orgId?: string; brandId?: string; currentOrgId?: string }
): Promise<string | undefined> {
    const fromClaims = user.orgId || user.brandId || user.currentOrgId;
    if (fromClaims) return fromClaims;

    try {
        const userDoc = await firestore.collection('users').doc(user.uid).get();
        if (userDoc.exists) {
            const data = userDoc.data();
            return data?.orgId || data?.currentOrgId || data?.locationId || data?.dispensaryId;
        }
    } catch (e) {
        logger.warn('[VIBE] Failed to read user profile', { uid: user.uid });
    }
    return undefined;
}

// ============================================
// GET VIBES
// ============================================

export async function getVibes(): Promise<{ success: boolean; data?: VibeConfig[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const snapshot = await db.collection(VIBES_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('updatedAt', 'desc')
            .get();

        const vibes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: toISOString(data.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
                generatedAt: toISOString(data.generatedAt) || new Date().toISOString(),
                publishedAt: toISOString(data.publishedAt),
            };
        }) as unknown as VibeConfig[];

        return { success: true, data: vibes };
    } catch (error) {
        logger.error('[VIBE] Failed to fetch vibes:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch vibes' };
    }
}

export async function getVibeById(id: string): Promise<{ success: boolean; data?: VibeConfig; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const doc = await db.collection(VIBES_COLLECTION).doc(id).get();

        if (!doc.exists) {
            return { success: false, error: 'Vibe not found' };
        }

        const data = doc.data()!;
        const vibe = {
            ...data,
            id: doc.id,
            createdAt: toISOString(data.createdAt) || new Date().toISOString(),
            updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
            generatedAt: toISOString(data.generatedAt) || new Date().toISOString(),
            publishedAt: toISOString(data.publishedAt),
        } as unknown as VibeConfig;

        return { success: true, data: vibe };
    } catch (error) {
        logger.error('[VIBE] Failed to fetch vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch vibe' };
    }
}

export async function getPublishedVibe(orgId: string): Promise<{ success: boolean; data?: VibeConfig; error?: string }> {
    try {
        if (!orgId) return { success: false, error: 'Organization ID is required' };

        const db = getAdminFirestore();
        const snapshot = await db.collection(VIBES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('status', '==', 'published')
            .limit(1)
            .get();

        if (snapshot.empty) {
            return { success: false, error: 'No published vibe found' };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const vibe = {
            ...data,
            id: doc.id,
            createdAt: toISOString(data.createdAt) || new Date().toISOString(),
            updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
            generatedAt: toISOString(data.generatedAt) || new Date().toISOString(),
            publishedAt: toISOString(data.publishedAt),
        } as unknown as VibeConfig;

        return { success: true, data: vibe };
    } catch (error) {
        logger.error('[VIBE] Failed to fetch published vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch published vibe' };
    }
}

// ============================================
// CREATE VIBE
// ============================================

export async function createVibe(data: Partial<VibeConfig>): Promise<{ success: boolean; data?: VibeConfig; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const id = uuidv4();
        const now = new Date();

        const newVibe: VibeConfig = {
            // Defaults
            name: 'Untitled Vibe',
            prompt: '',
            status: 'draft',
            version: 1,
            generatedBy: 'manual',
            theme: {
                colors: {
                    primary: '#16a34a',
                    secondary: '#064e3b',
                    accent: '#22c55e',
                    background: '#ffffff',
                    surface: '#f8fafc',
                    text: '#0f172a',
                    textMuted: '#64748b',
                    border: '#e2e8f0',
                    success: '#22c55e',
                    warning: '#f59e0b',
                    error: '#ef4444',
                },
                typography: {
                    headingFont: 'Inter',
                    bodyFont: 'Inter',
                    headingWeight: 700,
                    bodyWeight: 400,
                    baseSize: 16,
                    lineHeight: 1.5,
                    letterSpacing: -0.01,
                },
                spacing: { unit: 8, compact: false },
                radius: { none: '0', sm: '4px', md: '8px', lg: '16px', xl: '24px', full: '9999px', default: 'lg' },
                shadows: { style: 'subtle' },
            },
            components: {
                hero: 'carousel',
                productCard: 'detailed',
                navigation: 'sticky-top',
                categoryGrid: 'icons',
                chatbot: 'bubble',
                footer: 'full',
            },
            animations: {
                pageTransition: 'fade',
                scrollEffects: false,
                hoverEffects: 'lift',
                loadingStyle: 'skeleton',
                microInteractions: true,
            },
            effects: {
                particles: 'none',
                backgroundPattern: 'none',
            },

            // Override with provided data
            ...data,

            // System fields (cannot be overridden)
            id,
            orgId,
            createdAt: now,
            updatedAt: now,
            generatedAt: now,
            createdBy: user.uid,
        } as VibeConfig;

        await db.collection(VIBES_COLLECTION).doc(id).set(newVibe);

        logger.info('[VIBE] Created new vibe', { id, orgId, name: newVibe.name });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true, data: newVibe };
    } catch (error) {
        logger.error('[VIBE] Failed to create vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create vibe' };
    }
}

// ============================================
// UPDATE VIBE
// ============================================

export async function updateVibe(id: string, data: Partial<VibeConfig>): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        // Verify ownership
        const existingDoc = await db.collection(VIBES_COLLECTION).doc(id).get();
        if (!existingDoc.exists) {
            return { success: false, error: 'Vibe not found' };
        }

        const existingData = existingDoc.data()!;
        const orgId = await resolveOrgId(db, user as any);

        if (existingData.orgId !== orgId && user.role !== 'super_user') {
            return { success: false, error: 'Not authorized to update this vibe' };
        }

        // Increment version
        const newVersion = (existingData.version || 0) + 1;

        await db.collection(VIBES_COLLECTION).doc(id).update({
            ...data,
            version: newVersion,
            updatedAt: new Date(),
        });

        logger.info('[VIBE] Updated vibe', { id, version: newVersion });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true };
    } catch (error) {
        logger.error('[VIBE] Failed to update vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to update vibe' };
    }
}

// ============================================
// PUBLISH VIBE
// ============================================

export async function publishVibe(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin',
            'dispensary', 'dispensary_admin',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        // Get the vibe to publish
        const vibeDoc = await db.collection(VIBES_COLLECTION).doc(id).get();
        if (!vibeDoc.exists) {
            return { success: false, error: 'Vibe not found' };
        }

        const vibeData = vibeDoc.data()!;
        if (vibeData.orgId !== orgId && user.role !== 'super_user') {
            return { success: false, error: 'Not authorized to publish this vibe' };
        }

        // Unpublish any currently published vibe for this org
        const currentlyPublished = await db.collection(VIBES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('status', '==', 'published')
            .get();

        const batch = db.batch();

        currentlyPublished.docs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'archived',
                updatedAt: new Date(),
            });
        });

        // Publish the new vibe
        batch.update(vibeDoc.ref, {
            status: 'published',
            publishedAt: new Date(),
            updatedAt: new Date(),
        });

        await batch.commit();

        logger.info('[VIBE] Published vibe', { id, orgId });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true };
    } catch (error) {
        logger.error('[VIBE] Failed to publish vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to publish vibe' };
    }
}

// ============================================
// DELETE VIBE
// ============================================

export async function deleteVibe(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin',
            'dispensary', 'dispensary_admin',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);

        // Verify ownership
        const existingDoc = await db.collection(VIBES_COLLECTION).doc(id).get();
        if (!existingDoc.exists) {
            return { success: false, error: 'Vibe not found' };
        }

        const existingData = existingDoc.data()!;
        if (existingData.orgId !== orgId && user.role !== 'super_user') {
            return { success: false, error: 'Not authorized to delete this vibe' };
        }

        await db.collection(VIBES_COLLECTION).doc(id).delete();

        logger.info('[VIBE] Deleted vibe', { id });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true };
    } catch (error) {
        logger.error('[VIBE] Failed to delete vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to delete vibe' };
    }
}

// ============================================
// DUPLICATE VIBE
// ============================================

export async function duplicateVibe(id: string): Promise<{ success: boolean; data?: VibeConfig; error?: string }> {
    try {
        const result = await getVibeById(id);
        if (!result.success || !result.data) {
            return { success: false, error: 'Vibe not found' };
        }

        const original = result.data;
        const newVibe = {
            ...original,
            name: `${original.name} (Copy)`,
            status: 'draft' as const,
        };

        // Remove fields that should be regenerated
        delete (newVibe as any).id;
        delete (newVibe as any).createdAt;
        delete (newVibe as any).updatedAt;
        delete (newVibe as any).publishedAt;
        delete (newVibe as any).version;

        return await createVibe(newVibe);
    } catch (error) {
        logger.error('[VIBE] Failed to duplicate vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to duplicate vibe' };
    }
}

// ============================================
// CREATE FROM PRESET
// ============================================

export async function createVibeFromPreset(presetKey: string, name?: string): Promise<{ success: boolean; data?: VibeConfig; error?: string }> {
    try {
        // Import presets dynamically to avoid circular dependency
        const { VIBE_PRESETS } = await import('@/types/vibe');

        const preset = VIBE_PRESETS[presetKey];
        if (!preset) {
            return { success: false, error: 'Preset not found' };
        }

        return await createVibe({
            ...preset,
            name: name || preset.name || 'New Vibe',
            prompt: `Created from ${presetKey} preset`,
            generatedBy: 'template',
        });
    } catch (error) {
        logger.error('[VIBE] Failed to create vibe from preset:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create vibe from preset' };
    }
}

// ============================================
// AI GENERATION
// ============================================

export async function generateVibeFromPrompt(
    prompt: string,
    style: 'creative' | 'balanced' | 'conservative' = 'balanced'
): Promise<{ success: boolean; data?: VibeConfig; reasoning?: string; suggestions?: string[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        // Import and call the generator
        const { generateVibe } = await import('@/server/services/vibe-generator');
        const result = await generateVibe({
            prompt,
            orgId,
            style,
        });

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to generate vibe' };
        }

        // Create the vibe with the generated config
        const createResult = await createVibe({
            ...result.config,
            prompt,
            generatedBy: 'ai',
        });

        if (!createResult.success) {
            return { success: false, error: createResult.error };
        }

        return {
            success: true,
            data: createResult.data,
            reasoning: result.reasoning,
            suggestions: result.suggestions,
        };
    } catch (error) {
        logger.error('[VIBE] AI generation failed:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to generate vibe' };
    }
}

export async function refineVibeWithPrompt(
    vibeId: string,
    refinementPrompt: string
): Promise<{ success: boolean; data?: VibeConfig; reasoning?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        // Get current vibe
        const vibeResult = await getVibeById(vibeId);
        if (!vibeResult.success || !vibeResult.data) {
            return { success: false, error: 'Vibe not found' };
        }

        // Import and call the generator with current config
        const { refineVibe } = await import('@/server/services/vibe-generator');
        const result = await refineVibe({
            prompt: refinementPrompt,
            currentConfig: vibeResult.data,
            orgId
        });

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to refine vibe' };
        }

        // Update the vibe with refined config
        const currentRefinements = vibeResult.data.refinements || [];
        await updateVibe(vibeId, {
            ...result.config,
            refinements: [...currentRefinements, refinementPrompt],
        });

        // Fetch updated vibe
        const updatedResult = await getVibeById(vibeId);

        return {
            success: true,
            data: updatedResult.data,
            reasoning: result.reasoning,
        };
    } catch (error) {
        logger.error('[VIBE] Refinement failed:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to refine vibe' };
    }
}

// ============================================
// MOBILE VIBE ACTIONS
// ============================================

export async function getMobileVibes(): Promise<{ success: boolean; data?: MobileVibeConfig[]; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const snapshot = await db.collection(MOBILE_VIBES_COLLECTION)
            .where('orgId', '==', orgId)
            .orderBy('updatedAt', 'desc')
            .get();

        const vibes = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                ...data,
                id: doc.id,
                createdAt: toISOString(data.createdAt) || new Date().toISOString(),
                updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
                generatedAt: toISOString(data.generatedAt) || new Date().toISOString(),
                publishedAt: toISOString(data.publishedAt),
            };
        }) as unknown as MobileVibeConfig[];

        return { success: true, data: vibes };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to fetch vibes:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch mobile vibes' };
    }
}

export async function getMobileVibeById(id: string): Promise<{ success: boolean; data?: MobileVibeConfig; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const doc = await db.collection(MOBILE_VIBES_COLLECTION).doc(id).get();

        if (!doc.exists) {
            return { success: false, error: 'Mobile vibe not found' };
        }

        const data = doc.data()!;
        const vibe = {
            ...data,
            id: doc.id,
            createdAt: toISOString(data.createdAt) || new Date().toISOString(),
            updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
            generatedAt: toISOString(data.generatedAt) || new Date().toISOString(),
            publishedAt: toISOString(data.publishedAt),
        } as unknown as MobileVibeConfig;

        return { success: true, data: vibe };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to fetch vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch mobile vibe' };
    }
}

export async function getPublishedMobileVibe(
    orgId: string,
    platform: MobilePlatform = 'both'
): Promise<{ success: boolean; data?: MobileVibeConfig; error?: string }> {
    try {
        if (!orgId) return { success: false, error: 'Organization ID is required' };

        const db = getAdminFirestore();
        let query = db.collection(MOBILE_VIBES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('status', '==', 'published');

        // Filter by platform if specified
        if (platform !== 'both') {
            query = query.where('platform', 'in', [platform, 'both']);
        }

        const snapshot = await query.limit(1).get();

        if (snapshot.empty) {
            return { success: false, error: 'No published mobile vibe found' };
        }

        const doc = snapshot.docs[0];
        const data = doc.data();
        const vibe = {
            ...data,
            id: doc.id,
            createdAt: toISOString(data.createdAt) || new Date().toISOString(),
            updatedAt: toISOString(data.updatedAt) || new Date().toISOString(),
            generatedAt: toISOString(data.generatedAt) || new Date().toISOString(),
            publishedAt: toISOString(data.publishedAt),
        } as unknown as MobileVibeConfig;

        return { success: true, data: vibe };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to fetch published vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to fetch published mobile vibe' };
    }
}

export async function createMobileVibe(
    data: Partial<MobileVibeConfig>
): Promise<{ success: boolean; data?: MobileVibeConfig; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const id = uuidv4();
        const now = new Date();

        // Import defaults from presets
        const { MOBILE_VIBE_PRESETS } = await import('@/types/vibe');
        const defaultPreset = MOBILE_VIBE_PRESETS['native-clean'];

        const newVibe: MobileVibeConfig = {
            // Defaults from native-clean preset
            name: 'Untitled Mobile Vibe',
            prompt: '',
            platform: 'both',
            status: 'draft',
            version: 1,
            generatedBy: 'manual',
            theme: {
                colors: {
                    primary: '#16a34a',
                    secondary: '#064e3b',
                    accent: '#22c55e',
                    background: '#ffffff',
                    surface: '#f8fafc',
                    text: '#0f172a',
                    textMuted: '#64748b',
                    border: '#e2e8f0',
                    success: '#22c55e',
                    warning: '#f59e0b',
                    error: '#ef4444',
                },
                typography: {
                    ios: defaultPreset.ios!,
                    android: defaultPreset.android!,
                },
            },
            ios: defaultPreset.ios,
            android: defaultPreset.android,
            appIcon: {
                primaryColor: '#16a34a',
                style: 'gradient',
            },
            splashScreen: {
                style: 'logo-centered',
                backgroundColor: '#ffffff',
                iosUsesStoryboard: true,
            },
            pushNotifications: {
                iosStyle: 'default',
                iosUsesRichMedia: true,
                androidStyle: 'default',
                androidChannelImportance: 'default',
            },
            components: defaultPreset.components!,
            animations: defaultPreset.animations!,

            // Override with provided data
            ...data,

            // System fields (cannot be overridden)
            id,
            orgId,
            createdAt: now,
            updatedAt: now,
            generatedAt: now,
            createdBy: user.uid,
        } as MobileVibeConfig;

        await db.collection(MOBILE_VIBES_COLLECTION).doc(id).set(newVibe);

        logger.info('[MOBILE-VIBE] Created new vibe', { id, orgId, name: newVibe.name, platform: newVibe.platform });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true, data: newVibe };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to create vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create mobile vibe' };
    }
}

export async function updateMobileVibe(
    id: string,
    data: Partial<MobileVibeConfig>
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const existingDoc = await db.collection(MOBILE_VIBES_COLLECTION).doc(id).get();
        if (!existingDoc.exists) {
            return { success: false, error: 'Mobile vibe not found' };
        }

        const existingData = existingDoc.data()!;
        const orgId = await resolveOrgId(db, user as any);

        if (existingData.orgId !== orgId && (user as any).role !== 'super_user') {
            return { success: false, error: 'Not authorized to update this vibe' };
        }

        const newVersion = (existingData.version || 0) + 1;

        await db.collection(MOBILE_VIBES_COLLECTION).doc(id).update({
            ...data,
            version: newVersion,
            updatedAt: new Date(),
        });

        logger.info('[MOBILE-VIBE] Updated vibe', { id, version: newVersion });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to update vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to update mobile vibe' };
    }
}

export async function publishMobileVibe(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin',
            'dispensary', 'dispensary_admin',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const vibeDoc = await db.collection(MOBILE_VIBES_COLLECTION).doc(id).get();
        if (!vibeDoc.exists) {
            return { success: false, error: 'Mobile vibe not found' };
        }

        const vibeData = vibeDoc.data()!;
        if (vibeData.orgId !== orgId && (user as any).role !== 'super_user') {
            return { success: false, error: 'Not authorized to publish this vibe' };
        }

        // Unpublish any currently published mobile vibe for this org + platform
        const platform = vibeData.platform;
        const currentlyPublished = await db.collection(MOBILE_VIBES_COLLECTION)
            .where('orgId', '==', orgId)
            .where('status', '==', 'published')
            .where('platform', '==', platform)
            .get();

        const batch = db.batch();

        currentlyPublished.docs.forEach(doc => {
            batch.update(doc.ref, {
                status: 'archived',
                updatedAt: new Date(),
            });
        });

        batch.update(vibeDoc.ref, {
            status: 'published',
            publishedAt: new Date(),
            updatedAt: new Date(),
        });

        await batch.commit();

        logger.info('[MOBILE-VIBE] Published vibe', { id, orgId, platform });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to publish vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to publish mobile vibe' };
    }
}

export async function deleteMobileVibe(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: 'Vibe ID is required' };

        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin',
            'dispensary', 'dispensary_admin',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);

        const existingDoc = await db.collection(MOBILE_VIBES_COLLECTION).doc(id).get();
        if (!existingDoc.exists) {
            return { success: false, error: 'Mobile vibe not found' };
        }

        const existingData = existingDoc.data()!;
        if (existingData.orgId !== orgId && (user as any).role !== 'super_user') {
            return { success: false, error: 'Not authorized to delete this vibe' };
        }

        await db.collection(MOBILE_VIBES_COLLECTION).doc(id).delete();

        logger.info('[MOBILE-VIBE] Deleted vibe', { id });
        revalidatePath('/dashboard/vibe-studio');

        return { success: true };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to delete vibe:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to delete mobile vibe' };
    }
}

export async function createMobileVibeFromPreset(
    presetKey: string,
    name?: string
): Promise<{ success: boolean; data?: MobileVibeConfig; error?: string }> {
    try {
        const { MOBILE_VIBE_PRESETS } = await import('@/types/vibe');

        const preset = MOBILE_VIBE_PRESETS[presetKey];
        if (!preset) {
            return { success: false, error: 'Mobile preset not found' };
        }

        return await createMobileVibe({
            ...preset,
            name: name || preset.name || 'New Mobile Vibe',
            prompt: `Created from ${presetKey} preset`,
            generatedBy: 'template',
        });
    } catch (error) {
        logger.error('[MOBILE-VIBE] Failed to create from preset:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to create mobile vibe from preset' };
    }
}

export async function generateMobileVibeFromPrompt(
    prompt: string,
    platform: MobilePlatform = 'both',
    style: 'native' | 'branded' | 'playful' | 'minimal' = 'branded',
    linkedWebVibeId?: string
): Promise<{
    success: boolean;
    data?: MobileVibeConfig;
    reasoning?: string;
    iosNotes?: string;
    androidNotes?: string;
    suggestions?: string[];
    error?: string;
}> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const { generateMobileVibe } = await import('@/server/services/mobile-vibe-generator');
        const result = await generateMobileVibe({
            prompt,
            orgId,
            platform,
            style,
            linkedWebVibeId,
        });

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to generate mobile vibe' };
        }

        const createResult = await createMobileVibe({
            ...result.config,
            prompt,
            platform,
            generatedBy: 'ai',
            linkedWebVibeId,
        });

        if (!createResult.success) {
            return { success: false, error: createResult.error };
        }

        return {
            success: true,
            data: createResult.data,
            reasoning: result.reasoning,
            iosNotes: result.iosNotes,
            androidNotes: result.androidNotes,
            suggestions: result.suggestions,
        };
    } catch (error) {
        logger.error('[MOBILE-VIBE] AI generation failed:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to generate mobile vibe' };
    }
}

export async function refineMobileVibeWithPrompt(
    vibeId: string,
    refinementPrompt: string
): Promise<{ success: boolean; data?: MobileVibeConfig; reasoning?: string; error?: string }> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        const vibeResult = await getMobileVibeById(vibeId);
        if (!vibeResult.success || !vibeResult.data) {
            return { success: false, error: 'Mobile vibe not found' };
        }

        const { refineMobileVibe } = await import('@/server/services/mobile-vibe-generator');
        const result = await refineMobileVibe(vibeResult.data, refinementPrompt, orgId);

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to refine mobile vibe' };
        }

        const currentRefinements = vibeResult.data.refinements || [];
        await updateMobileVibe(vibeId, {
            ...result.config,
            refinements: [...currentRefinements, refinementPrompt],
        });

        const updatedResult = await getMobileVibeById(vibeId);

        return {
            success: true,
            data: updatedResult.data,
            reasoning: result.reasoning,
        };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Refinement failed:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to refine mobile vibe' };
    }
}

export async function generateMobileVibeFromWebVibe(
    webVibeId: string,
    prompt?: string,
    platform: MobilePlatform = 'both'
): Promise<{
    success: boolean;
    data?: MobileVibeConfig;
    reasoning?: string;
    iosNotes?: string;
    androidNotes?: string;
    error?: string;
}> {
    try {
        const db = getAdminFirestore();
        const user = await requireUser([
            'brand', 'brand_admin', 'brand_member',
            'dispensary', 'dispensary_admin', 'dispensary_staff',
            'super_user'
        ]);

        const orgId = await resolveOrgId(db, user as any);
        if (!orgId) {
            return { success: false, error: 'No organization found' };
        }

        // Get the web vibe
        const webVibeResult = await getVibeById(webVibeId);
        if (!webVibeResult.success || !webVibeResult.data) {
            return { success: false, error: 'Web vibe not found' };
        }

        const webVibe = webVibeResult.data;

        const { generateMobileVibeFromWebVibe } = await import('@/server/services/mobile-vibe-generator');
        const result = await generateMobileVibeFromWebVibe(
            webVibe.theme.colors,
            prompt || `Create a mobile app that matches the "${webVibe.name}" web theme`,
            orgId,
            platform
        );

        if (!result.success || !result.config) {
            return { success: false, error: result.error || 'Failed to generate mobile vibe' };
        }

        const createResult = await createMobileVibe({
            ...result.config,
            name: `${webVibe.name} (Mobile)`,
            prompt: prompt || `Derived from web vibe: ${webVibe.name}`,
            platform,
            generatedBy: 'ai',
            linkedWebVibeId: webVibeId,
        });

        if (!createResult.success) {
            return { success: false, error: createResult.error };
        }

        return {
            success: true,
            data: createResult.data,
            reasoning: result.reasoning,
            iosNotes: result.iosNotes,
            androidNotes: result.androidNotes,
        };
    } catch (error) {
        logger.error('[MOBILE-VIBE] Generation from web vibe failed:', { error: error instanceof Error ? error.message : String(error) });
        return { success: false, error: 'Failed to generate mobile vibe from web vibe' };
    }
}
