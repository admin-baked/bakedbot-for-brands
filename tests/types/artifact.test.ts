/**
 * Artifact Types Unit Tests
 */

import {
    ArtifactType,
    Artifact,
    ARTIFACT_TYPES,
    CreateArtifactSchema,
    UpdateArtifactSchema,
    ArtifactMetadataSchema,
    getArtifactIcon,
    getArtifactLabel,
    createArtifactId,
    isCodeArtifact,
    isDeckArtifact,
    isDiagramArtifact,
    isChartArtifact,
    parseArtifactsFromContent,
} from '@/types/artifact';

describe('Artifact Types', () => {
    describe('ARTIFACT_TYPES', () => {
        it('should have all expected artifact types', () => {
            const types = ARTIFACT_TYPES.map(t => t.type);
            expect(types).toContain('code');
            expect(types).toContain('markdown');
            expect(types).toContain('research');
            expect(types).toContain('deck');
            expect(types).toContain('diagram');
            expect(types).toContain('chart');
            expect(types).toContain('table');
            expect(types).toContain('infographic');
            expect(types).toContain('image');
        });

        it('should have labels for all types', () => {
            ARTIFACT_TYPES.forEach(type => {
                expect(type.label).toBeTruthy();
                expect(type.icon).toBeTruthy();
            });
        });
    });

    describe('Helper Functions', () => {
        it('getArtifactIcon returns correct icon for code', () => {
            expect(getArtifactIcon('code')).toBe('Code');
        });

        it('getArtifactIcon returns correct icon for deck', () => {
            expect(getArtifactIcon('deck')).toBe('Presentation');
        });

        it('getArtifactIcon returns File for unknown type', () => {
            expect(getArtifactIcon('unknown' as any)).toBe('File');
        });

        it('getArtifactLabel returns correct label', () => {
            expect(getArtifactLabel('code')).toBe('Code');
            expect(getArtifactLabel('research')).toBe('Research');
            expect(getArtifactLabel('deck')).toBe('Presentation');
        });

        it('createArtifactId generates unique IDs', () => {
            const id1 = createArtifactId();
            const id2 = createArtifactId();
            expect(id1).not.toBe(id2);
            expect(id1).toMatch(/^artifact-\d+-\w+$/);
        });
    });

    describe('Type Guards', () => {
        const makeArtifact = (type: ArtifactType): Artifact => ({
            id: 'test-1',
            type,
            title: 'Test',
            content: 'test content',
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        it('isCodeArtifact returns true for code type', () => {
            expect(isCodeArtifact(makeArtifact('code'))).toBe(true);
            expect(isCodeArtifact(makeArtifact('markdown'))).toBe(false);
        });

        it('isDeckArtifact returns true for deck type', () => {
            expect(isDeckArtifact(makeArtifact('deck'))).toBe(true);
            expect(isDeckArtifact(makeArtifact('code'))).toBe(false);
        });

        it('isDiagramArtifact returns true for diagram type', () => {
            expect(isDiagramArtifact(makeArtifact('diagram'))).toBe(true);
            expect(isDiagramArtifact(makeArtifact('chart'))).toBe(false);
        });

        it('isChartArtifact returns true for chart type', () => {
            expect(isChartArtifact(makeArtifact('chart'))).toBe(true);
            expect(isChartArtifact(makeArtifact('diagram'))).toBe(false);
        });
    });
});

describe('Zod Schemas', () => {
    describe('CreateArtifactSchema', () => {
        it('validates valid artifact creation', () => {
            const result = CreateArtifactSchema.safeParse({
                type: 'code',
                title: 'My Code',
                content: 'const x = 1;',
                language: 'typescript',
            });
            expect(result.success).toBe(true);
        });

        it('rejects empty title', () => {
            const result = CreateArtifactSchema.safeParse({
                type: 'code',
                title: '',
                content: 'test',
            });
            expect(result.success).toBe(false);
        });

        it('rejects invalid type', () => {
            const result = CreateArtifactSchema.safeParse({
                type: 'invalid',
                title: 'Test',
                content: 'test',
            });
            expect(result.success).toBe(false);
        });
    });

    describe('UpdateArtifactSchema', () => {
        it('allows partial updates', () => {
            const result = UpdateArtifactSchema.safeParse({
                title: 'Updated Title',
            });
            expect(result.success).toBe(true);
        });

        it('allows metadata updates', () => {
            const result = UpdateArtifactSchema.safeParse({
                metadata: {
                    isPublished: true,
                    shareId: 'abc123',
                },
            });
            expect(result.success).toBe(true);
        });
    });
});

describe('Artifact Parsing', () => {
    describe('parseArtifactsFromContent', () => {
        it('parses code artifacts from content', () => {
            const content = `Here is some code:
\`\`\`artifact:code:typescript
const greeting = "Hello World";
\`\`\`
That was the code.`;

            const { artifacts, cleanedContent } = parseArtifactsFromContent(content);
            
            expect(artifacts.length).toBe(1);
            expect(artifacts[0].type).toBe('code');
            expect(artifacts[0].language).toBe('typescript');
            expect(artifacts[0].content).toBe('const greeting = "Hello World";');
            expect(cleanedContent).toContain('[Code: Click to view]');
        });

        it('parses block-style artifacts', () => {
            const content = `Here is a research report:
:::artifact:research:Market Analysis Report
## Overview
The market is growing.

## Conclusions
Growth is expected.
:::
End of report.`;

            const { artifacts, cleanedContent } = parseArtifactsFromContent(content);
            
            expect(artifacts.length).toBe(1);
            expect(artifacts[0].type).toBe('research');
            expect(artifacts[0].title).toBe('Market Analysis Report');
            expect(cleanedContent).toContain('[Market Analysis Report: Click to view]');
        });

        it('parses multiple artifacts', () => {
            const content = `
\`\`\`artifact:code:python
print("hello")
\`\`\`

:::artifact:table:Sales Data
Header1,Header2
Value1,Value2
:::`;

            const { artifacts } = parseArtifactsFromContent(content);
            
            expect(artifacts.length).toBe(2);
            expect(artifacts[0].type).toBe('code');
            expect(artifacts[1].type).toBe('table');
        });

        it('returns empty array when no artifacts found', () => {
            const content = 'This is regular text with no artifacts.';
            const { artifacts, cleanedContent } = parseArtifactsFromContent(content);
            
            expect(artifacts.length).toBe(0);
            expect(cleanedContent).toBe(content);
        });
    });
});
