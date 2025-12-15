
/**
 * Preference Passport: A unified user profile for cannabis preferences.
 * This travels with the user across the platform (Consumer -> Pro).
 */

export type ExperienceLevel = 'novice' | 'intermediate' | 'expert';

export type DesiredEffect =
    | 'sleep'
    | 'pain_relief'
    | 'anxiety_relief'
    | 'focus'
    | 'creative'
    | 'social'
    | 'energy';

export type ConsumptionMethod =
    | 'flower'
    | 'preroll'
    | 'vape'
    | 'edible'
    | 'concentrate'
    | 'tincture'
    | 'topical';

export type FlavorProfile =
    | 'citrus'
    | 'berry'
    | 'earthy'
    | 'pine'
    | 'diesel'
    | 'sweet'
    | 'spicy';

export interface PreferencePassport {
    id: string; // usually same as userId
    userId: string;

    // Core Identity
    displayName?: string; // "BakedBot User"
    experienceLevel: ExperienceLevel;

    // Preferences
    desiredEffects: DesiredEffect[];
    preferredMethods: ConsumptionMethod[];
    avoidedMethods?: ConsumptionMethod[]; // e.g. "I don't smoke"

    // Advanced (Optional)
    favoriteFlavors?: FlavorProfile[];
    toleranceLevel?: 'low' | 'medium' | 'high';

    // System
    createdAt: Date;
    updatedAt: Date;
}

export const DEFAULT_PASSPORT: Omit<PreferencePassport, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
    experienceLevel: 'novice',
    desiredEffects: [],
    preferredMethods: [],
    avoidedMethods: [],
    favoriteFlavors: [],
    toleranceLevel: 'low'
};
