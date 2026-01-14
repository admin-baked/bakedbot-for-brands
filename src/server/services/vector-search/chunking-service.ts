/**
 * Chunking Service - Semantic Document Chunking
 * 
 * Implements three chunking strategies for RAG indexing:
 * - Product-level: For menu items (1 product = 1 chunk)
 * - Section-level: For compliance docs (split by heading)
 * - Sentence-level: For FAQs (split by sentence with overlap)
 */

export interface Chunk {
    id: string;
    content: string;
    metadata: ChunkMetadata;
}

export interface ChunkMetadata {
    source: string;
    type: 'product' | 'section' | 'sentence';
    title?: string;
    category?: string;
    state?: string;
    city?: string;
    effectiveDate?: string;
    position?: number;
    totalChunks?: number;
}

export interface MenuItem {
    id: string;
    name: string;
    description?: string;
    category?: string;
    subcategory?: string;
    brand?: string;
    price?: number;
    thc?: string;
    cbd?: string;
    strain?: string;
    weight?: string;
}

// ============================================================================
// PRODUCT-LEVEL CHUNKING
// ============================================================================

/**
 * Chunks menu items at the product level (1 product = 1 chunk).
 * Ideal for product search and recommendations.
 */
export function chunkByProduct(
    menuItems: MenuItem[],
    sourceId: string
): Chunk[] {
    return menuItems.map((item, index) => {
        const parts: string[] = [];
        
        // Build rich text representation
        parts.push(`Product: ${item.name}`);
        if (item.brand) parts.push(`Brand: ${item.brand}`);
        if (item.category) parts.push(`Category: ${item.category}`);
        if (item.subcategory) parts.push(`Subcategory: ${item.subcategory}`);
        if (item.description) parts.push(`Description: ${item.description}`);
        if (item.strain) parts.push(`Strain Type: ${item.strain}`);
        if (item.thc) parts.push(`THC: ${item.thc}`);
        if (item.cbd) parts.push(`CBD: ${item.cbd}`);
        if (item.weight) parts.push(`Weight: ${item.weight}`);
        if (item.price) parts.push(`Price: $${item.price.toFixed(2)}`);
        
        return {
            id: `${sourceId}:product:${item.id}`,
            content: parts.join('\n'),
            metadata: {
                source: sourceId,
                type: 'product' as const,
                title: item.name,
                category: item.category,
                position: index,
                totalChunks: menuItems.length
            }
        };
    });
}

// ============================================================================
// SECTION-LEVEL CHUNKING
// ============================================================================

/**
 * Chunks markdown documents by heading (## level).
 * Ideal for compliance documents and knowledge base articles.
 */
export function chunkBySection(
    markdown: string,
    sourceId: string,
    baseMetadata: Partial<ChunkMetadata> = {}
): Chunk[] {
    const chunks: Chunk[] = [];
    
    // Split by ## headings (level 2)
    const sections = markdown.split(/^## /gm);
    
    // First section might be intro (before any ##)
    const intro = sections[0].trim();
    if (intro && !intro.startsWith('#')) {
        chunks.push({
            id: `${sourceId}:section:intro`,
            content: intro,
            metadata: {
                source: sourceId,
                type: 'section',
                title: 'Introduction',
                position: 0,
                ...baseMetadata
            }
        });
    }
    
    // Process remaining sections
    for (let i = 1; i < sections.length; i++) {
        const section = sections[i];
        const firstNewline = section.indexOf('\n');
        
        const title = firstNewline > 0 
            ? section.substring(0, firstNewline).trim()
            : section.trim();
            
        const content = firstNewline > 0
            ? section.substring(firstNewline + 1).trim()
            : '';
            
        if (content) {
            chunks.push({
                id: `${sourceId}:section:${i}`,
                content: `## ${title}\n\n${content}`,
                metadata: {
                    source: sourceId,
                    type: 'section',
                    title,
                    position: i,
                    totalChunks: sections.length - 1,
                    ...baseMetadata
                }
            });
        }
    }
    
    return chunks;
}

// ============================================================================
// SENTENCE-LEVEL CHUNKING
// ============================================================================

/**
 * Chunks text by sentences with configurable size and overlap.
 * Ideal for FAQs and conversational content.
 */
export function chunkBySentence(
    text: string,
    sourceId: string,
    options: {
        maxChunkSize?: number;  // Max characters per chunk
        overlap?: number;       // Overlap characters between chunks
        metadata?: Partial<ChunkMetadata>;
    } = {}
): Chunk[] {
    const { maxChunkSize = 500, overlap = 50, metadata = {} } = options;
    const chunks: Chunk[] = [];
    
    // Split into sentences (basic sentence boundary detection)
    const sentences = text.split(/(?<=[.!?])\s+/);
    
    let currentChunk = '';
    let chunkIndex = 0;
    
    for (const sentence of sentences) {
        // If adding this sentence exceeds max size, save current chunk
        if (currentChunk.length + sentence.length > maxChunkSize && currentChunk) {
            chunks.push({
                id: `${sourceId}:sentence:${chunkIndex}`,
                content: currentChunk.trim(),
                metadata: {
                    source: sourceId,
                    type: 'sentence',
                    position: chunkIndex,
                    ...metadata
                }
            });
            
            // Start new chunk with overlap from previous
            const words = currentChunk.split(' ');
            const overlapWords = words.slice(-Math.ceil(overlap / 5)).join(' ');
            currentChunk = overlapWords + ' ' + sentence;
            chunkIndex++;
        } else {
            currentChunk += (currentChunk ? ' ' : '') + sentence;
        }
    }
    
    // Don't forget the last chunk
    if (currentChunk.trim()) {
        chunks.push({
            id: `${sourceId}:sentence:${chunkIndex}`,
            content: currentChunk.trim(),
            metadata: {
                source: sourceId,
                type: 'sentence',
                position: chunkIndex,
                totalChunks: chunkIndex + 1,
                ...metadata
            }
        });
    }
    
    return chunks;
}

// ============================================================================
// CHUNK HEADER BUILDER
// ============================================================================

export interface ChunkContext {
    state?: string;
    city?: string;
    category?: string;
    effectiveDate?: string;
    source?: string;
    retailerId?: string;
}

/**
 * Prepends a structured header to chunk content for contextual retrieval.
 * Example output: "[State: Michigan | City: Detroit | Category: Delivery]\nDelivery hours are..."
 */
export function buildChunkWithHeader(content: string, context: ChunkContext): string {
    const parts = Object.entries(context)
        .filter(([_, v]) => v !== undefined && v !== null && v !== '')
        .map(([k, v]) => `${capitalize(k)}: ${v}`);
    
    if (parts.length === 0) {
        return content;
    }
    
    const header = `[${parts.join(' | ')}]`;
    return `${header}\n${content}`;
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1).replace(/([A-Z])/g, ' $1').trim();
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const chunkingService = {
    chunkByProduct,
    chunkBySection,
    chunkBySentence,
    buildChunkWithHeader
};
