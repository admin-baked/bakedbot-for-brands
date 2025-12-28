/**
 * Unit Tests: Project Types
 * 
 * Tests for project type definitions and Zod schemas.
 */

import { 
    CreateProjectSchema, 
    UpdateProjectSchema,
    AddProjectDocumentSchema,
    PROJECT_LIMITS,
    PROJECT_COLORS,
    PROJECT_ICONS,
} from '@/types/project';

describe('Project Schemas', () => {
    describe('CreateProjectSchema', () => {
        it('should validate a valid project creation input', () => {
            const input = {
                name: 'My Project',
                description: 'A test project',
                systemInstructions: 'You are a helpful assistant.',
                color: '#10b981',
            };

            const result = CreateProjectSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should require name', () => {
            const input = {
                description: 'No name provided',
            };

            const result = CreateProjectSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should reject empty name', () => {
            const input = {
                name: '',
            };

            const result = CreateProjectSchema.safeParse(input);
            expect(result.success).toBe(false);
        });

        it('should validate color format', () => {
            const validColor = { name: 'Test', color: '#ff5500' };
            const invalidColor = { name: 'Test', color: 'red' };

            expect(CreateProjectSchema.safeParse(validColor).success).toBe(true);
            expect(CreateProjectSchema.safeParse(invalidColor).success).toBe(false);
        });

        it('should accept optional fields', () => {
            const minimalInput = { name: 'Minimal Project' };
            const result = CreateProjectSchema.safeParse(minimalInput);
            expect(result.success).toBe(true);
        });
    });

    describe('UpdateProjectSchema', () => {
        it('should validate a valid update input', () => {
            const input = {
                projectId: 'project-123',
                name: 'Updated Name',
            };

            const result = UpdateProjectSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should require projectId', () => {
            const input = {
                name: 'Updated Name',
            };

            const result = UpdateProjectSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });

    describe('AddProjectDocumentSchema', () => {
        it('should validate a valid document input', () => {
            const input = {
                projectId: 'project-123',
                type: 'text',
                title: 'My Document',
                content: 'Some content here',
            };

            const result = AddProjectDocumentSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should validate URL for link type', () => {
            const input = {
                projectId: 'project-123',
                type: 'link',
                title: 'External Link',
                content: 'Content from URL',
                sourceUrl: 'https://example.com',
            };

            const result = AddProjectDocumentSchema.safeParse(input);
            expect(result.success).toBe(true);
        });

        it('should reject invalid document type', () => {
            const input = {
                projectId: 'project-123',
                type: 'invalid',
                title: 'Test',
                content: 'Content',
            };

            const result = AddProjectDocumentSchema.safeParse(input);
            expect(result.success).toBe(false);
        });
    });
});

describe('Project Limits', () => {
    it('should have defined limits for all plans', () => {
        const plans = ['free', 'claim_pro', 'starter', 'growth', 'scale', 'enterprise'];
        
        plans.forEach(plan => {
            expect(PROJECT_LIMITS[plan]).toBeDefined();
            expect(PROJECT_LIMITS[plan].maxProjects).toBeDefined();
            expect(PROJECT_LIMITS[plan].maxDocsPerProject).toBeDefined();
        });
    });

    it('should have increasing limits for higher plans', () => {
        expect(PROJECT_LIMITS.free.maxProjects).toBeLessThan(PROJECT_LIMITS.claim_pro.maxProjects);
        expect(PROJECT_LIMITS.claim_pro.maxProjects).toBeLessThan(PROJECT_LIMITS.starter.maxProjects);
        expect(PROJECT_LIMITS.starter.maxProjects).toBeLessThan(PROJECT_LIMITS.growth.maxProjects);
    });

    it('should have unlimited projects for enterprise', () => {
        expect(PROJECT_LIMITS.enterprise.maxProjects).toBe(Infinity);
        expect(PROJECT_LIMITS.enterprise.maxDocsPerProject).toBe(Infinity);
    });
});

describe('Project Constants', () => {
    it('should have valid project colors', () => {
        expect(PROJECT_COLORS.length).toBeGreaterThan(0);
        PROJECT_COLORS.forEach(color => {
            expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
        });
    });

    it('should have valid project icons', () => {
        expect(PROJECT_ICONS.length).toBeGreaterThan(0);
        PROJECT_ICONS.forEach(icon => {
            expect(typeof icon).toBe('string');
            expect(icon.length).toBeGreaterThan(0);
        });
    });
});
