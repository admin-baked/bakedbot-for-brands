/**
 * Unit Tests: AI Model Selector
 *
 * Tests for the intelligence level to model mapping utility.
 * Verifies correct model and thinking_level assignments for each intelligence tier.
 */

import { 
    getModelConfig, 
    getGenerateOptions, 
    MODEL_CONFIGS,
    ThinkingLevel 
} from '@/ai/model-selector';

describe('Model Selector', () => {
    describe('MODEL_CONFIGS', () => {
        it('should define all intelligence levels including lite', () => {
            const levels: ThinkingLevel[] = ['lite', 'standard', 'advanced', 'expert', 'genius'];
            levels.forEach(level => {
                expect(MODEL_CONFIGS[level]).toBeDefined();
                expect(MODEL_CONFIGS[level].model).toBeTruthy();
                expect(MODEL_CONFIGS[level].description).toBeTruthy();
            });
        });

        it('should use Flash Lite for lite tier (most cost-efficient)', () => {
            expect(MODEL_CONFIGS.lite.model).toBe('googleai/gemini-2.5-flash-lite');
            expect(MODEL_CONFIGS.lite.thinkingLevel).toBeUndefined();
            expect(MODEL_CONFIGS.lite.tier).toBe('free');
        });

        it('should use Flash for standard (cost-efficient)', () => {
            expect(MODEL_CONFIGS.standard.model).toBe('googleai/gemini-3-flash-preview');
            expect(MODEL_CONFIGS.standard.thinkingLevel).toBeUndefined();
        });

        it('should use Pro for advanced (complex logic)', () => {
            expect(MODEL_CONFIGS.advanced.model).toBe('googleai/gemini-3-pro-preview');
            expect(MODEL_CONFIGS.advanced.thinkingLevel).toBeUndefined();
        });

        it('should use Pro with high thinking for expert (reasoning)', () => {
            expect(MODEL_CONFIGS.expert.model).toBe('googleai/gemini-3-pro-preview');
            expect(MODEL_CONFIGS.expert.thinkingLevel).toBe('high');
        });

        it('should use Pro with max thinking for genius (maximum intelligence)', () => {
            expect(MODEL_CONFIGS.genius.model).toBe('googleai/gemini-3-pro-preview');
            expect(MODEL_CONFIGS.genius.thinkingLevel).toBe('max');
        });
    });

    describe('getModelConfig', () => {
        it('should return correct config for each level', () => {
            expect(getModelConfig('standard').model).toContain('flash');
            expect(getModelConfig('advanced').model).toContain('pro');
            expect(getModelConfig('expert').thinkingLevel).toBe('high');
            expect(getModelConfig('genius').thinkingLevel).toBe('max');
        });

        it('should fallback to lite for invalid level', () => {
            expect(getModelConfig('invalid')).toEqual(MODEL_CONFIGS.lite);
            expect(getModelConfig(undefined)).toEqual(MODEL_CONFIGS.lite);
            expect(getModelConfig('')).toEqual(MODEL_CONFIGS.lite);
        });
    });

    describe('getGenerateOptions', () => {
        it('should return only model for standard/advanced (no thinking)', () => {
            const standardOptions = getGenerateOptions('standard');
            expect(standardOptions.model).toBe('googleai/gemini-3-flash-preview');
            expect(standardOptions.config).toBeUndefined();

            const advancedOptions = getGenerateOptions('advanced');
            expect(advancedOptions.model).toBe('googleai/gemini-3-pro-preview');
            expect(advancedOptions.config).toBeUndefined();
        });

        it('should include thinkingConfig for expert/genius', () => {
            const expertOptions = getGenerateOptions('expert');
            expect(expertOptions.model).toBe('googleai/gemini-3-pro-preview');
            expect(expertOptions.config).toEqual({
                thinkingConfig: {
                    thinkingLevel: 'high',
                },
            });

            const geniusOptions = getGenerateOptions('genius');
            expect(geniusOptions.model).toBe('googleai/gemini-3-pro-preview');
            expect(geniusOptions.config).toEqual({
                thinkingConfig: {
                    thinkingLevel: 'max',
                },
            });
        });

        it('should be spreadable into ai.generate options', () => {
            // Simulating how it's used in runAgentChat
            const options = getGenerateOptions('expert');
            const generateCall = {
                ...options,
                prompt: 'Test prompt',
            };

            expect(generateCall.model).toBe('googleai/gemini-3-pro-preview');
            expect(generateCall.config?.thinkingConfig?.thinkingLevel).toBe('high');
            expect(generateCall.prompt).toBe('Test prompt');
        });
    });
});

describe('Cost Optimization Strategy', () => {
    it('should use cheaper Flash model for standard tier', () => {
        const standard = getGenerateOptions('standard');
        expect(standard.model).toContain('flash');
    });

    it('should reserve Pro model for advanced+ tiers', () => {
        const advanced = getGenerateOptions('advanced');
        const expert = getGenerateOptions('expert');
        const genius = getGenerateOptions('genius');

        expect(advanced.model).toContain('pro');
        expect(expert.model).toContain('pro');
        expect(genius.model).toContain('pro');
    });

    it('should enable thinking only for paid tiers (expert/genius)', () => {
        // Standard and Advanced should not have thinking (faster, cheaper)
        expect(getGenerateOptions('standard').config).toBeUndefined();
        expect(getGenerateOptions('advanced').config).toBeUndefined();

        // Expert and Genius should have thinking (test-time compute)
        expect(getGenerateOptions('expert').config?.thinkingConfig).toBeDefined();
        expect(getGenerateOptions('genius').config?.thinkingConfig).toBeDefined();
    });
});
