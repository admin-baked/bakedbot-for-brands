
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createValidationPipeline } from '../validation-pipeline';

// Mock Validators
vi.mock('../marketing-validator', () => ({
    marketingValidator: { validate: vi.fn(() => Promise.resolve({ isValid: true, errors: [] })) }
}));
vi.mock('../compliance-validator', () => ({
     complianceValidator: { validate: vi.fn(() => Promise.resolve({ isValid: true, errors: [] })) }
}));
vi.mock('../financial-validator', () => ({
    financialValidator: { validate: vi.fn(() => Promise.resolve({ isValid: true, errors: [] })) }
}));

describe('Validation Pipeline', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should create a pipeline for a known agent role', () => {
        const pipeline = createValidationPipeline('craig');
        expect(pipeline).toBeDefined();
        // Craig (Marketing) should have marketing and compliance validators
        expect(pipeline.validators.length).toBeGreaterThan(0);
    });

    it('should return empty pipeline for unknown role', () => {
        const pipeline = createValidationPipeline('unknown_role');
        expect(pipeline.validators).toHaveLength(0);
    });

    it('should execute all validators in the pipeline', async () => {
         const { marketingValidator } = await import('../marketing-validator');
         
         const pipeline = createValidationPipeline('craig');
         const result = await pipeline.run({ content: 'Test Campaign' });

         expect(marketingValidator.validate).toHaveBeenCalled();
         expect(result.isValid).toBe(true);
    });

    it('should fail if any validator fails', async () => {
        const { marketingValidator } = await import('../marketing-validator');
        (marketingValidator.validate as any).mockResolvedValueOnce({ isValid: false, errors: ['Content blocked'] });

        const pipeline = createValidationPipeline('craig');
        const result = await pipeline.run({ content: 'Bad Campaign' });

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Content blocked');
    });
});
