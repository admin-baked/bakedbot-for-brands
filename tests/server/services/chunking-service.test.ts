/**
 * Unit Tests for Chunking Service
 */

import {
    chunkByProduct,
    chunkBySection,
    chunkBySentence,
    buildChunkWithHeader,
    MenuItem
} from '@/server/services/vector-search/chunking-service';

describe('ChunkingService', () => {
    describe('chunkByProduct', () => {
        const mockMenuItems: MenuItem[] = [
            {
                id: 'prod-1',
                name: 'Blue Dream',
                brand: 'California Organics',
                category: 'Flower',
                subcategory: 'Sativa',
                description: 'A classic sativa-dominant hybrid with sweet berry aroma.',
                price: 45.00,
                thc: '22%',
                strain: 'Sativa Hybrid',
                weight: '3.5g'
            },
            {
                id: 'prod-2',
                name: 'OG Kush Cartridge',
                brand: 'VapeCo',
                category: 'Vapes',
                price: 35.00,
                thc: '85%'
            }
        ];

        it('creates one chunk per product', () => {
            const chunks = chunkByProduct(mockMenuItems, 'menu-123');
            expect(chunks).toHaveLength(2);
        });

        it('includes all product details in chunk content', () => {
            const chunks = chunkByProduct(mockMenuItems, 'menu-123');
            const firstChunk = chunks[0];

            expect(firstChunk.content).toContain('Product: Blue Dream');
            expect(firstChunk.content).toContain('Brand: California Organics');
            expect(firstChunk.content).toContain('Category: Flower');
            expect(firstChunk.content).toContain('THC: 22%');
            expect(firstChunk.content).toContain('Price: $45.00');
            expect(firstChunk.content).toContain('Description: A classic sativa-dominant');
        });

        it('generates unique chunk IDs', () => {
            const chunks = chunkByProduct(mockMenuItems, 'menu-123');
            expect(chunks[0].id).toBe('menu-123:product:prod-1');
            expect(chunks[1].id).toBe('menu-123:product:prod-2');
        });

        it('includes metadata with category and position', () => {
            const chunks = chunkByProduct(mockMenuItems, 'menu-123');
            expect(chunks[0].metadata.category).toBe('Flower');
            expect(chunks[0].metadata.position).toBe(0);
            expect(chunks[0].metadata.totalChunks).toBe(2);
            expect(chunks[0].metadata.type).toBe('product');
        });

        it('handles products with minimal fields', () => {
            const minimalProduct: MenuItem[] = [{ id: 'min-1', name: 'Basic Product' }];
            const chunks = chunkByProduct(minimalProduct, 'menu');
            expect(chunks[0].content).toBe('Product: Basic Product');
        });
    });

    describe('chunkBySection', () => {
        const mockMarkdown = `
This is the intro paragraph before any sections.
It provides context about cannabis regulations.

## Delivery Rules

Delivery hours are 9am to 9pm in Wayne County.
All deliveries require ID verification.

## Storage Requirements

Cannabis must be stored in a secure, locked container.
Temperature should be maintained below 70°F.

## Age Verification

All customers must be 21 years or older.
`;

        it('splits markdown by ## headings', () => {
            const chunks = chunkBySection(mockMarkdown, 'doc-123');
            // Should have intro + 3 sections
            expect(chunks.length).toBeGreaterThanOrEqual(3);
        });

        it('preserves heading as chunk title', () => {
            const chunks = chunkBySection(mockMarkdown, 'doc-123');
            const deliveryChunk = chunks.find(c => c.metadata.title === 'Delivery Rules');
            expect(deliveryChunk).toBeDefined();
            expect(deliveryChunk!.content).toContain('9am to 9pm');
        });

        it('includes intro section if present', () => {
            const chunks = chunkBySection(mockMarkdown, 'doc-123');
            // Intro is at position 0 (before any ## headings)
            const introChunk = chunks.find(c => c.metadata.position === 0);
            expect(introChunk).toBeDefined();
            expect(introChunk!.content).toContain('intro paragraph');
        });

        it('passes through base metadata', () => {
            const chunks = chunkBySection(mockMarkdown, 'doc-123', {
                state: 'Michigan',
                city: 'Detroit'
            });
            expect(chunks[0].metadata.state).toBe('Michigan');
            expect(chunks[0].metadata.city).toBe('Detroit');
        });
    });

    describe('chunkBySentence', () => {
        const longText = `
            Cannabis regulation varies by state. Michigan allows recreational use for adults 21 and over.
            Delivery is permitted in most counties. However, some municipalities have opted out.
            It is important to check local ordinances before operating. Licensing requirements differ significantly.
            The application process can take several months. Fees range from $1,000 to $50,000 depending on license type.
        `.trim();

        it('respects chunk size limit', () => {
            const chunks = chunkBySentence(longText, 'faq-1', { maxChunkSize: 200 });
            for (const chunk of chunks) {
                // Allow some overflow for sentence boundaries
                expect(chunk.content.length).toBeLessThan(300);
            }
        });

        it('maintains overlap between chunks', () => {
            const chunks = chunkBySentence(longText, 'faq-1', { 
                maxChunkSize: 150, 
                overlap: 30 
            });
            
            if (chunks.length >= 2) {
                // Check that consecutive chunks share some content
                const firstChunkWords = chunks[0].content.split(' ').slice(-3);
                const secondChunkStart = chunks[1].content.split(' ').slice(0, 10).join(' ');
                
                // At least one overlap word should appear
                const hasOverlap = firstChunkWords.some(w => secondChunkStart.includes(w));
                expect(hasOverlap).toBe(true);
            }
        });

        it('assigns sequential positions', () => {
            const chunks = chunkBySentence(longText, 'faq-1', { maxChunkSize: 100 });
            for (let i = 0; i < chunks.length; i++) {
                expect(chunks[i].metadata.position).toBe(i);
            }
        });

        it('handles short text without chunking', () => {
            const shortText = 'This is a short FAQ answer.';
            const chunks = chunkBySentence(shortText, 'faq-1');
            expect(chunks).toHaveLength(1);
            expect(chunks[0].content).toBe(shortText);
        });
    });

    describe('buildChunkWithHeader', () => {
        it('prepends context as bracketed header', () => {
            const content = 'Delivery hours are 9am to 9pm.';
            const result = buildChunkWithHeader(content, {
                state: 'Michigan',
                city: 'Detroit'
            });
            
            expect(result).toContain('[State: Michigan | City: Detroit]');
            expect(result).toContain('Delivery hours are 9am to 9pm.');
        });

        it('skips empty context values', () => {
            const content = 'Some text';
            const result = buildChunkWithHeader(content, {
                state: 'Colorado',
                city: '',
                category: undefined
            });
            
            expect(result).toBe('[State: Colorado]\nSome text');
        });

        it('returns original content if no context provided', () => {
            const content = 'No context here.';
            const result = buildChunkWithHeader(content, {});
            expect(result).toBe(content);
        });

        it('includes all context fields', () => {
            const result = buildChunkWithHeader('Test', {
                state: 'WA',
                city: 'Seattle',
                category: 'Delivery',
                effectiveDate: '2024-01-01',
                retailerId: 'ret-123'
            });
            
            expect(result).toContain('State: WA');
            expect(result).toContain('City: Seattle');
            expect(result).toContain('Category: Delivery');
            expect(result).toContain('Effective Date: 2024-01-01');
            expect(result).toContain('Retailer Id: ret-123');
        });
    });
});
