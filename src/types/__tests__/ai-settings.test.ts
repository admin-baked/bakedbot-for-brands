/**
 * AI Settings Types Tests
 *
 * Tests for Zod schemas and buildCustomInstructionsBlock utility.
 */

import {
    TenantAISettingsSchema,
    UserAISettingsSchema,
    TenantAISettings,
    UserAISettings,
    DEFAULT_TENANT_AI_SETTINGS,
    DEFAULT_USER_AI_SETTINGS,
    buildCustomInstructionsBlock,
} from '../ai-settings';

describe('AI Settings Types', () => {
    describe('TenantAISettingsSchema', () => {
        it('parses valid tenant settings', () => {
            const validSettings = {
                customInstructions: 'Always be helpful',
                tone: 'friendly',
                responseLength: 'auto',
                preferredLanguage: 'en',
                businessContext: 'We are a dispensary',
                alwaysMention: ['loyalty program'],
                avoidTopics: ['competitors'],
            };

            const result = TenantAISettingsSchema.safeParse(validSettings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.customInstructions).toBe('Always be helpful');
                expect(result.data.tone).toBe('friendly');
                expect(result.data.alwaysMention).toEqual(['loyalty program']);
            }
        });

        it('applies defaults for missing optional fields', () => {
            const minimalSettings = {};

            const result = TenantAISettingsSchema.safeParse(minimalSettings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.customInstructions).toBe('');
                expect(result.data.tone).toBe('friendly');
                expect(result.data.responseLength).toBe('auto');
                expect(result.data.preferredLanguage).toBe('en');
                expect(result.data.alwaysMention).toEqual([]);
                expect(result.data.avoidTopics).toEqual([]);
            }
        });

        it('rejects invalid tone values', () => {
            const invalidSettings = {
                tone: 'aggressive', // not in enum
            };

            const result = TenantAISettingsSchema.safeParse(invalidSettings);
            expect(result.success).toBe(false);
        });

        it('enforces max length on customInstructions', () => {
            const tooLongInstructions = {
                customInstructions: 'x'.repeat(2001), // exceeds 2000 char limit
            };

            const result = TenantAISettingsSchema.safeParse(tooLongInstructions);
            expect(result.success).toBe(false);
        });

        it('accepts valid tone values', () => {
            const tones = ['professional', 'casual', 'friendly', 'formal'];

            for (const tone of tones) {
                const result = TenantAISettingsSchema.safeParse({ tone });
                expect(result.success).toBe(true);
            }
        });

        it('parses features object with defaults', () => {
            const settings = {
                features: {
                    autoSuggestProducts: false,
                },
            };

            const result = TenantAISettingsSchema.safeParse(settings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.features.autoSuggestProducts).toBe(false);
                expect(result.data.features.includeComplianceReminders).toBe(true);
            }
        });
    });

    describe('UserAISettingsSchema', () => {
        it('parses valid user settings', () => {
            const validSettings = {
                customInstructions: 'Explain things simply',
                preferredTone: 'casual',
                responseFormat: 'bullets',
                experienceLevel: 'beginner',
            };

            const result = UserAISettingsSchema.safeParse(validSettings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.customInstructions).toBe('Explain things simply');
                expect(result.data.preferredTone).toBe('casual');
                expect(result.data.experienceLevel).toBe('beginner');
            }
        });

        it('applies defaults for missing fields', () => {
            const minimalSettings = {};

            const result = UserAISettingsSchema.safeParse(minimalSettings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.customInstructions).toBe('');
                expect(result.data.responseFormat).toBe('auto');
                expect(result.data.experienceLevel).toBe('intermediate');
                expect(result.data.preferredTone).toBeUndefined();
            }
        });

        it('enforces max length on customInstructions', () => {
            const tooLong = {
                customInstructions: 'x'.repeat(1001), // exceeds 1000 char limit
            };

            const result = UserAISettingsSchema.safeParse(tooLong);
            expect(result.success).toBe(false);
        });

        it('parses accessibility settings', () => {
            const settings = {
                accessibility: {
                    simpleLanguage: true,
                    avoidJargon: true,
                    largerText: false,
                },
            };

            const result = UserAISettingsSchema.safeParse(settings);
            expect(result.success).toBe(true);
            if (result.success) {
                expect(result.data.accessibility.simpleLanguage).toBe(true);
                expect(result.data.accessibility.avoidJargon).toBe(true);
            }
        });

        it('accepts valid experience levels', () => {
            const levels = ['beginner', 'intermediate', 'experienced'];

            for (const level of levels) {
                const result = UserAISettingsSchema.safeParse({ experienceLevel: level });
                expect(result.success).toBe(true);
            }
        });
    });

    describe('DEFAULT_TENANT_AI_SETTINGS', () => {
        it('matches schema defaults', () => {
            const result = TenantAISettingsSchema.safeParse(DEFAULT_TENANT_AI_SETTINGS);
            expect(result.success).toBe(true);
        });

        it('has expected default values', () => {
            expect(DEFAULT_TENANT_AI_SETTINGS.tone).toBe('friendly');
            expect(DEFAULT_TENANT_AI_SETTINGS.responseLength).toBe('auto');
            expect(DEFAULT_TENANT_AI_SETTINGS.features.autoSuggestProducts).toBe(true);
            expect(DEFAULT_TENANT_AI_SETTINGS.features.includeComplianceReminders).toBe(true);
        });
    });

    describe('DEFAULT_USER_AI_SETTINGS', () => {
        it('matches schema defaults', () => {
            const result = UserAISettingsSchema.safeParse(DEFAULT_USER_AI_SETTINGS);
            expect(result.success).toBe(true);
        });

        it('has expected default values', () => {
            expect(DEFAULT_USER_AI_SETTINGS.experienceLevel).toBe('intermediate');
            expect(DEFAULT_USER_AI_SETTINGS.responseFormat).toBe('auto');
            expect(DEFAULT_USER_AI_SETTINGS.accessibility.simpleLanguage).toBe(false);
        });
    });

    describe('buildCustomInstructionsBlock', () => {
        it('returns empty string when no settings provided', () => {
            const result = buildCustomInstructionsBlock(null, null);
            expect(result).toBe('');
        });

        it('returns empty string when settings are undefined', () => {
            const result = buildCustomInstructionsBlock(undefined, undefined);
            expect(result).toBe('');
        });

        it('builds tenant-only instructions block', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'Always mention our loyalty program.',
                businessContext: 'Family-owned dispensary since 2023.',
                alwaysMention: ['loyalty', 'community'],
                avoidTopics: ['competitors'],
            };

            const result = buildCustomInstructionsBlock(tenantSettings, null);

            expect(result).toContain('[ORGANIZATION PREFERENCES]');
            expect(result).toContain('Always mention our loyalty program.');
            expect(result).toContain('Business Context: Family-owned dispensary since 2023.');
            expect(result).toContain('Always mention: loyalty, community');
            expect(result).toContain('Avoid discussing: competitors');
        });

        it('builds user-only instructions block', () => {
            const userSettings: UserAISettings = {
                ...DEFAULT_USER_AI_SETTINGS,
                customInstructions: 'I am new to cannabis.',
                preferredTone: 'casual',
                responseFormat: 'bullets',
                experienceLevel: 'beginner',
            };

            const result = buildCustomInstructionsBlock(null, userSettings);

            expect(result).toContain('[USER PREFERENCES]');
            expect(result).toContain('I am new to cannabis.');
            expect(result).toContain('Preferred tone: casual');
            expect(result).toContain('Format responses as: bullets');
            expect(result).toContain('User is new to cannabis');
        });

        it('builds combined tenant and user instructions', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'We are Thrive Syracuse.',
                tone: 'professional',
            };

            const userSettings: UserAISettings = {
                ...DEFAULT_USER_AI_SETTINGS,
                customInstructions: 'Keep it brief.',
                accessibility: {
                    simpleLanguage: true,
                    avoidJargon: true,
                    largerText: false,
                },
            };

            const result = buildCustomInstructionsBlock(tenantSettings, userSettings);

            expect(result).toContain('[ORGANIZATION PREFERENCES]');
            expect(result).toContain('We are Thrive Syracuse.');
            expect(result).toContain('Communication tone: professional');
            expect(result).toContain('[USER PREFERENCES]');
            expect(result).toContain('Keep it brief.');
            expect(result).toContain('Use simple, clear language.');
            expect(result).toContain('Avoid industry jargon');
        });

        it('does not include tone if default (friendly)', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'Test instructions',
                tone: 'friendly', // default
            };

            const result = buildCustomInstructionsBlock(tenantSettings, null);

            expect(result).toContain('Test instructions');
            expect(result).not.toContain('Communication tone: friendly');
        });

        it('does not include responseLength if auto', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'Test',
                responseLength: 'auto',
            };

            const result = buildCustomInstructionsBlock(tenantSettings, null);

            expect(result).not.toContain('Response length preference:');
        });

        it('includes responseLength if not auto', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'Test',
                responseLength: 'brief',
            };

            const result = buildCustomInstructionsBlock(tenantSettings, null);

            expect(result).toContain('Response length preference: brief');
        });

        it('handles empty arrays gracefully', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'Test',
                alwaysMention: [],
                avoidTopics: [],
            };

            const result = buildCustomInstructionsBlock(tenantSettings, null);

            expect(result).not.toContain('Always mention:');
            expect(result).not.toContain('Avoid discussing:');
        });

        it('wraps result with newlines when content exists', () => {
            const tenantSettings: TenantAISettings = {
                ...DEFAULT_TENANT_AI_SETTINGS,
                customInstructions: 'Test',
            };

            const result = buildCustomInstructionsBlock(tenantSettings, null);

            expect(result.startsWith('\n\n')).toBe(true);
            expect(result.endsWith('\n\n')).toBe(true);
        });
    });
});
