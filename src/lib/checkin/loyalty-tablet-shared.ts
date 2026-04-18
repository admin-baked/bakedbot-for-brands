/**
 * Shared loyalty tablet constants and types used by both client components
 * and server actions.
 */

export const SMOKEY_FALLBACK_IMAGE = '/assets/agents/smokey-main.png';

export const TABLET_MOODS = [
    { id: 'relaxed', emoji: '😌', label: 'Relaxed & Calm', context: 'indica dominant, CBD-heavy, body relaxation, stress relief, couch-friendly' },
    { id: 'energized', emoji: '⚡', label: 'Energized & Creative', context: 'sativa dominant, uplifting, creative boost, clear-headed, daytime use' },
    { id: 'sleep', emoji: '😴', label: 'Need Sleep', context: 'high indica, heavy sedation, sleep aid, nighttime, body high' },
    { id: 'anxious', emoji: '😰', label: 'Stressed / Anxious', context: 'high CBD low THC, calming, anxiety relief, gentle, non-intoxicating' },
    { id: 'social', emoji: '🎉', label: 'Social & Happy', context: 'hybrid balanced, euphoric, mood-lift, social, giggly, fun' },
    { id: 'pain', emoji: '😣', label: 'Pain / Discomfort', context: 'high THC, topicals, pain relief, anti-inflammatory, muscle soreness' },
    { id: 'new', emoji: '🌱', label: 'New to Cannabis', context: 'low dose, microdose, beginner friendly, CBD dominant, gentle onset, forgiving' },
] as const;

export type TabletMood = (typeof TABLET_MOODS)[number];
export type TabletMoodId = TabletMood['id'];

/** Emoji lookup keyed by mood id — derived from TABLET_MOODS. */
export const MOOD_EMOJI: Record<string, string> = Object.fromEntries(
    TABLET_MOODS.map(m => [m.id, m.emoji])
);

export type ProductTier = 'budget' | 'mid' | 'premium';

export interface TabletProduct {
    productId: string;
    name: string;
    price: number;
    category: string;
    brandName?: string;
    imageUrl?: string;
    reason: string;
    thcPercent?: number;
    cbdPercent?: number;
    strainType?: string;
    effects?: string[];
    tier?: ProductTier;
    description?: string;
    terpenes?: string[];
}

export interface TabletBundle {
    name: string;
    tagline: string;
    products: TabletProduct[];
    totalPrice: number;
}

export interface MoodRecommendationsResult {
    success: boolean;
    products?: TabletProduct[];
    bundle?: TabletBundle;
    videoUrl?: string; // Remotion-on-AWS generated video
    error?: string;
    /** Set when the result is a best-effort fallback rather than a precise mood match. */
    fallbackMode?: 'inventory_unavailable' | 'mood_no_match';
    /** Human-readable message to surface in the tablet UI alongside fallback results. */
    fallbackMessage?: string;
}

export interface TabletSearchRecommendationsResult extends MoodRecommendationsResult {
    query?: string;
    summary?: string;
}

export function getTabletMoodById(moodId: string | null | undefined): TabletMood | null {
    if (!moodId) {
        return null;
    }

    return TABLET_MOODS.find((mood) => mood.id === moodId) ?? null;
}
