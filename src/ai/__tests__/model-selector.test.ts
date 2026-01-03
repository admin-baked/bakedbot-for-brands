/**
 * Unit tests for AI Model Selector
 * Tests model configuration, tier access, and generate options
 */

import { 
    ThinkingLevel, 
    ModelConfig, 
    MODEL_CONFIGS, 
    DEFAULT_MODEL_BY_TIER,
    getModelConfig, 
    getAvailableModels, 
    getGenerateOptions 
} from '../model-selector';

describe('Model Selector', () => {
    describe('MODEL_CONFIGS', () => {
        it('should have all expected thinking levels', () => {
            const expectedLevels: ThinkingLevel[] = ['lite', 'standard', 'advanced', 'expert', 'genius', 'deep_research'];
            expectedLevels.forEach(level => {
                expect(MODEL_CONFIGS[level]).toBeDefined();
            });
        });

        it('should have lite tier as free', () => {
            expect(MODEL_CONFIGS.lite.tier).toBe('free');
            expect(MODEL_CONFIGS.lite.model).toBe('googleai/gemini-2.5-flash-lite');
        });

        it('should have standard and advanced as paid', () => {
            expect(MODEL_CONFIGS.standard.tier).toBe('paid');
            expect(MODEL_CONFIGS.advanced.tier).toBe('paid');
        });

        it('should have expert and genius as super', () => {
            expect(MODEL_CONFIGS.expert.tier).toBe('super');
            expect(MODEL_CONFIGS.genius.tier).toBe('super');
        });

        it('should have thinking levels configured for expert and genius', () => {
            expect(MODEL_CONFIGS.expert.thinkingLevel).toBe('high');
            expect(MODEL_CONFIGS.genius.thinkingLevel).toBe('high');
        });

        it('should have deep_research configured as super tier with max thinking', () => {
            expect(MODEL_CONFIGS.deep_research).toBeDefined();
            expect(MODEL_CONFIGS.deep_research.tier).toBe('super');
            expect(MODEL_CONFIGS.deep_research.thinkingLevel).toBe('high');
            expect(MODEL_CONFIGS.deep_research.model).toBe('googleai/gemini-3-pro-preview');
        });

        it('should not have thinking levels for lite, standard, advanced', () => {
            expect(MODEL_CONFIGS.lite.thinkingLevel).toBeUndefined();
            expect(MODEL_CONFIGS.standard.thinkingLevel).toBeUndefined();
            expect(MODEL_CONFIGS.advanced.thinkingLevel).toBeUndefined();
        });
    });

    describe('DEFAULT_MODEL_BY_TIER', () => {
        it('should default free users to lite', () => {
            expect(DEFAULT_MODEL_BY_TIER.free).toBe('lite');
        });

        it('should default paid users to standard', () => {
            expect(DEFAULT_MODEL_BY_TIER.paid).toBe('standard');
        });

        it('should default super users to genius', () => {
            expect(DEFAULT_MODEL_BY_TIER.super).toBe('genius');
        });
    });

    describe('getModelConfig', () => {
        it('should return correct config for valid levels', () => {
            expect(getModelConfig('lite').model).toBe('googleai/gemini-2.5-flash-lite');
            expect(getModelConfig('standard').model).toBe('googleai/gemini-3-flash-preview');
            expect(getModelConfig('advanced').model).toBe('googleai/gemini-3-pro-preview');
            expect(getModelConfig('expert').model).toBe('googleai/gemini-3-pro-preview');
            expect(getModelConfig('genius').model).toBe('googleai/gemini-3-pro-preview');
        });

        it('should fallback to lite for invalid levels', () => {
            expect(getModelConfig('invalid').model).toBe('googleai/gemini-2.5-flash-lite');
            expect(getModelConfig(undefined).model).toBe('googleai/gemini-2.5-flash-lite');
            expect(getModelConfig('').model).toBe('googleai/gemini-2.5-flash-lite');
        });
    });

    describe('getAvailableModels', () => {
        it('should return only lite for free users', () => {
            const models = getAvailableModels('free');
            expect(models).toContain('lite');
            expect(models).not.toContain('standard');
            expect(models).not.toContain('advanced');
            expect(models).not.toContain('expert');
            expect(models).not.toContain('genius');
        });

        it('should return lite, standard, advanced for paid users', () => {
            const models = getAvailableModels('paid');
            expect(models).toContain('lite');
            expect(models).toContain('standard');
            expect(models).toContain('advanced');
            expect(models).not.toContain('expert');
            expect(models).not.toContain('genius');
        });

        it('should return all models for super users', () => {
            const models = getAvailableModels('super');
            expect(models).toContain('lite');
            expect(models).toContain('standard');
            expect(models).toContain('advanced');
            expect(models).toContain('expert');
            expect(models).toContain('genius');
            expect(models).toContain('deep_research');
        });
    });

    describe('getGenerateOptions', () => {
        it('should return model without thinking config for lite', () => {
            const options = getGenerateOptions('lite');
            expect(options.model).toBe('googleai/gemini-2.5-flash-lite');
            expect(options.config).toBeUndefined();
        });

        it('should return model without thinking config for standard', () => {
            const options = getGenerateOptions('standard');
            expect(options.model).toBe('googleai/gemini-3-flash-preview');
            expect(options.config).toBeUndefined();
        });

        it('should include thinking config for expert', () => {
            const options = getGenerateOptions('expert');
            expect(options.model).toBe('googleai/gemini-3-pro-preview');
            expect(options.config).toBeDefined();
            expect(options.config?.thinkingConfig?.thinkingLevel).toBe('high');
        });

        it('should include max thinking config for genius', () => {
            const options = getGenerateOptions('genius');
            expect(options.model).toBe('googleai/gemini-3-pro-preview');
            expect(options.config).toBeDefined();
            expect(options.config?.thinkingConfig?.thinkingLevel).toBe('high');
        });

        it('should include max thinking config for deep_research', () => {
            const options = getGenerateOptions('deep_research');
            expect(options.model).toBe('googleai/gemini-3-pro-preview');
            expect(options.config).toBeDefined();
            expect(options.config?.thinkingConfig?.thinkingLevel).toBe('high');
        });
    });
});
