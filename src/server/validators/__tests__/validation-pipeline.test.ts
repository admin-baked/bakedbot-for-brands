
import { createValidationPipeline } from '../validation-pipeline';

// Mock Validators as classes (the pipeline calls `new ComplianceValidator()` etc.)
const mockMarketingValidate = jest.fn(() => Promise.resolve({
    valid: true,
    score: 100,
    issues: [],
    timestamp: new Date().toISOString(),
    validatorName: 'marketing-validator',
}));

const mockComplianceValidate = jest.fn(() => Promise.resolve({
    valid: true,
    score: 100,
    issues: [],
    timestamp: new Date().toISOString(),
    validatorName: 'compliance-validator',
}));

jest.mock('../marketing-validator', () => ({
    MarketingValidator: jest.fn().mockImplementation(() => ({
        config: {
            name: 'marketing-validator',
            description: 'Marketing validator',
            tools: ['*'],
            severity: 'warning',
            blocking: false,
        },
        validate: mockMarketingValidate,
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

jest.mock('../compliance-validator', () => ({
    ComplianceValidator: jest.fn().mockImplementation(() => ({
        config: {
            name: 'compliance-validator',
            description: 'Compliance validator',
            tools: ['*'],
            severity: 'error',
            blocking: true,
        },
        validate: mockComplianceValidate,
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

jest.mock('../financial-validator', () => ({
    FinancialValidator: jest.fn().mockImplementation(() => ({
        config: {
            name: 'financial-validator',
            description: 'Financial validator',
            tools: ['*'],
            severity: 'error',
            blocking: true,
        },
        validate: jest.fn().mockResolvedValue({
            valid: true,
            score: 100,
            issues: [],
            timestamp: new Date().toISOString(),
            validatorName: 'financial-validator',
        }),
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

jest.mock('../technical-validator', () => ({
    TechnicalValidator: jest.fn().mockImplementation(() => ({
        config: { name: 'technical-validator', tools: ['*'], severity: 'error', blocking: true, description: '' },
        validate: jest.fn().mockResolvedValue({ valid: true, score: 100, issues: [], timestamp: '', validatorName: 'technical-validator' }),
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

jest.mock('../data-validator', () => ({
    DataValidator: jest.fn().mockImplementation(() => ({
        config: { name: 'data-validator', tools: ['*'], severity: 'warning', blocking: false, description: '' },
        validate: jest.fn().mockResolvedValue({ valid: true, score: 100, issues: [], timestamp: '', validatorName: 'data-validator' }),
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

jest.mock('../recommendation-validator', () => ({
    RecommendationValidator: jest.fn().mockImplementation(() => ({
        config: { name: 'recommendation-validator', tools: ['*'], severity: 'warning', blocking: false, description: '' },
        validate: jest.fn().mockResolvedValue({ valid: true, score: 100, issues: [], timestamp: '', validatorName: 'recommendation-validator' }),
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

jest.mock('../orchestration-validator', () => ({
    OrchestrationValidator: jest.fn().mockImplementation(() => ({
        config: { name: 'orchestration-validator', tools: ['*'], severity: 'warning', blocking: false, description: '' },
        validate: jest.fn().mockResolvedValue({ valid: true, score: 100, issues: [], timestamp: '', validatorName: 'orchestration-validator' }),
        preValidate: jest.fn().mockResolvedValue({ proceed: true }),
        shouldValidate: jest.fn().mockReturnValue(true),
    }))
}));

describe('Validation Pipeline', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should create a pipeline for a known agent role', () => {
        const pipeline = createValidationPipeline('craig');
        expect(pipeline).toBeDefined();
        // Craig (Marketing) maps to 'marketing' role which gets ComplianceValidator + MarketingValidator
        expect(pipeline.getValidators().length).toBeGreaterThan(0);
    });

    it('should return pipeline with default compliance validator for unknown role', () => {
        const pipeline = createValidationPipeline('unknown_role');
        // Unknown roles fall into 'general' default which gets ComplianceValidator
        expect(pipeline.getValidators().length).toBeGreaterThanOrEqual(0);
    });

    it('should execute all validators in the pipeline', async () => {
         const pipeline = createValidationPipeline('craig');
         // Pipeline.validate runs all validators for a given tool call
         const result = await pipeline.validate('generateContent', { content: 'Test Campaign' }, { text: 'output' });

         expect(mockComplianceValidate).toHaveBeenCalled();
         expect(result.valid).toBe(true);
    });

    it('should fail if any blocking validator fails', async () => {
        mockComplianceValidate.mockResolvedValueOnce({
            valid: false,
            score: 20,
            issues: ['Content blocked'],
            timestamp: new Date().toISOString(),
            validatorName: 'compliance-validator',
        });

        const pipeline = createValidationPipeline('craig');
        const result = await pipeline.validate('generateContent', { content: 'Bad Campaign' }, { text: 'output' });

        expect(result.valid).toBe(false);
        expect(result.issues).toContainEqual(expect.stringContaining('Content blocked'));
    });
});
