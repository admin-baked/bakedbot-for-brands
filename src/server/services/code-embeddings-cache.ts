/**
 * Code Embeddings Cache
 *
 * Indexes TypeScript/JavaScript codebase symbols (functions, classes, exports)
 * into Upstash Vector for semantic code search. Reduces agent token usage
 * by returning concise function signatures instead of full file contents.
 *
 * Token savings: ~80% reduction for code search queries
 *   Before: read_file returns 5,000 chars (~1,250 tokens) per file
 *   After:  search returns 200-char signatures (~50 tokens) per match
 *
 * Architecture:
 *   - Parse: tree-sitter-like regex extraction of function/class/export signatures
 *   - Embed: generateEmbedding() on signature + description text
 *   - Store: Upstash Vector namespace "code" with metadata (path, line, type)
 *   - Search: Natural language query → top-K relevant symbols with locations
 *
 * Usage:
 *   await indexCodebase();                           // Run on deploy or manually
 *   const results = await searchCode("rate limit");  // Agents query this
 */

import { generateEmbedding } from '@/ai/utils/generate-embedding';
import {
    isVectorAvailable,
    vectorUpsertBatch,
    vectorSearch,
} from '@/lib/vector';
import { getCached, setCached, CachePrefix, CacheTTL } from '@/lib/cache';
import { logger } from '@/lib/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

// --- Types ---

export interface CodeSymbol {
    /** Unique ID: file:line:name */
    id: string;
    /** Symbol name */
    name: string;
    /** Function signature or class declaration (concise, <300 chars) */
    signature: string;
    /** File path relative to project root */
    filePath: string;
    /** Line number */
    line: number;
    /** Symbol type */
    type: 'function' | 'class' | 'interface' | 'type' | 'const' | 'export';
    /** Whether exported */
    exported: boolean;
    /** JSDoc or inline comment description */
    description?: string;
}

export interface CodeSearchResult {
    symbol: string;
    signature: string;
    filePath: string;
    line: number;
    type: string;
    score: number;
    description?: string;
}

const CODE_NAMESPACE = 'code';

// --- Symbol Extraction (lightweight, no tree-sitter dependency) ---

/**
 * Extract symbols from a TypeScript/JavaScript file
 */
function extractSymbols(content: string, filePath: string): CodeSymbol[] {
    const symbols: CodeSymbol[] = [];
    const lines = content.split('\n');

    // Extract JSDoc comments for context
    const jsdocMap = new Map<number, string>();
    for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().startsWith('/**')) {
            let doc = '';
            let j = i;
            while (j < lines.length && !lines[j].includes('*/')) {
                doc += lines[j].replace(/^\s*\*\s?/, '').replace(/^\/\*\*\s*/, '') + ' ';
                j++;
            }
            if (j < lines.length) {
                doc += lines[j].replace(/\s*\*\/\s*/, '');
            }
            // Map to the line after the JSDoc block
            jsdocMap.set(j + 1, doc.trim().substring(0, 200));
        }
    }

    // Match exported/public functions
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Exported async function
        const funcMatch = line.match(/^(export\s+)?(async\s+)?function\s+(\w+)\s*(<[^>]*>)?\s*\(([^)]*)\)/);
        if (funcMatch) {
            const name = funcMatch[3];
            const params = funcMatch[5]?.substring(0, 100) || '';
            const exported = !!funcMatch[1];
            // Get return type from the line
            const returnMatch = line.match(/\)\s*:\s*([^\n{]+)/);
            const returnType = returnMatch?.[1]?.trim().substring(0, 60) || '';

            symbols.push({
                id: `${filePath}:${i + 1}:${name}`,
                name,
                signature: `${exported ? 'export ' : ''}${funcMatch[2] || ''}function ${name}(${params})${returnType ? `: ${returnType}` : ''}`.substring(0, 300),
                filePath,
                line: i + 1,
                type: 'function',
                exported,
                description: jsdocMap.get(i) || undefined,
            });
            continue;
        }

        // Arrow function export
        const arrowMatch = line.match(/^export\s+(?:const|let)\s+(\w+)\s*(?::\s*[^=]+)?\s*=\s*(async\s+)?\(/);
        if (arrowMatch) {
            const name = arrowMatch[1];
            symbols.push({
                id: `${filePath}:${i + 1}:${name}`,
                name,
                signature: line.trim().substring(0, 300),
                filePath,
                line: i + 1,
                type: 'function',
                exported: true,
                description: jsdocMap.get(i) || undefined,
            });
            continue;
        }

        // Class declaration
        const classMatch = line.match(/^(export\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/);
        if (classMatch) {
            symbols.push({
                id: `${filePath}:${i + 1}:${classMatch[2]}`,
                name: classMatch[2],
                signature: line.trim().replace(/\s*\{$/, '').substring(0, 300),
                filePath,
                line: i + 1,
                type: 'class',
                exported: !!classMatch[1],
                description: jsdocMap.get(i) || undefined,
            });
            continue;
        }

        // Interface
        const ifaceMatch = line.match(/^(export\s+)?interface\s+(\w+)/);
        if (ifaceMatch) {
            symbols.push({
                id: `${filePath}:${i + 1}:${ifaceMatch[2]}`,
                name: ifaceMatch[2],
                signature: line.trim().replace(/\s*\{$/, '').substring(0, 300),
                filePath,
                line: i + 1,
                type: 'interface',
                exported: !!ifaceMatch[1],
                description: jsdocMap.get(i) || undefined,
            });
            continue;
        }

        // Type alias
        const typeMatch = line.match(/^(export\s+)?type\s+(\w+)/);
        if (typeMatch) {
            symbols.push({
                id: `${filePath}:${i + 1}:${typeMatch[2]}`,
                name: typeMatch[2],
                signature: line.trim().substring(0, 300),
                filePath,
                line: i + 1,
                type: 'type',
                exported: !!typeMatch[1],
                description: jsdocMap.get(i) || undefined,
            });
        }
    }

    return symbols;
}

// --- Indexing ---

/**
 * Index a single file's symbols into Upstash Vector
 */
async function indexFileSymbols(filePath: string, projectRoot: string): Promise<number> {
    const fullPath = path.join(projectRoot, filePath);
    const content = await fs.readFile(fullPath, 'utf-8');

    const symbols = extractSymbols(content, filePath);
    if (symbols.length === 0) return 0;

    // Generate embeddings in parallel (5 at a time to avoid API rate limits)
    const items: Array<{ id: string; vector: number[]; metadata: Record<string, unknown>; content: string }> = [];

    for (let i = 0; i < symbols.length; i += 5) {
        const batch = symbols.slice(i, i + 5);
        const results = await Promise.all(
            batch.map(async (sym) => {
                const searchText = [sym.name, sym.signature, sym.description || ''].join(' ').substring(0, 200);
                try {
                    const embedding = await generateEmbedding(searchText);
                    return {
                        id: sym.id,
                        vector: embedding,
                        metadata: {
                            name: sym.name,
                            filePath: sym.filePath,
                            line: sym.line,
                            type: sym.type,
                            exported: sym.exported,
                        },
                        content: `${sym.signature}${sym.description ? ` — ${sym.description}` : ''}`,
                    };
                } catch (err) {
                    logger.debug('[CodeCache] Embedding failed for symbol', { id: sym.id, error: err instanceof Error ? err.message : String(err) });
                    return null;
                }
            })
        );
        items.push(...results.filter((r): r is NonNullable<typeof r> => r !== null));
    }

    if (items.length > 0) {
        await vectorUpsertBatch(CODE_NAMESPACE, items);
    }

    return items.length;
}

/**
 * Index the full codebase (run on deploy or manually)
 *
 * Walks src/ directory, extracts symbols, embeds, and stores in Upstash Vector.
 * Limits to 500 most important files (sorted by directory priority).
 */
export async function indexCodebase(projectRoot?: string): Promise<{ filesProcessed: number; symbolsIndexed: number }> {
    if (!isVectorAvailable()) {
        logger.warn('[CodeCache] Upstash Vector not configured — skipping indexing');
        return { filesProcessed: 0, symbolsIndexed: 0 };
    }

    const root = projectRoot || process.cwd();
    const srcDir = path.join(root, 'src');

    // Collect all .ts/.tsx files (skip tests, node_modules, .next)
    const files: string[] = [];
    async function walk(dir: string) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.isDirectory()) {
                if (['node_modules', '.next', '__tests__', '__mocks__', 'tests'].includes(entry.name)) continue;
                await walk(fullPath);
            } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.test.ts') && !entry.name.endsWith('.test.tsx')) {
                files.push(path.relative(root, fullPath));
            }
        }
    }

    try {
        await walk(srcDir);
    } catch (err) {
        logger.error('[CodeCache] Failed to walk src directory', { error: err instanceof Error ? err.message : String(err) });
        return { filesProcessed: 0, symbolsIndexed: 0 };
    }

    // Priority order: server > lib > ai > app/api > components
    const priority = (f: string) => {
        if (f.includes('server/agents/')) return 0;
        if (f.includes('server/services/')) return 1;
        if (f.includes('server/tools/')) return 2;
        if (f.includes('server/actions/')) return 3;
        if (f.includes('lib/')) return 4;
        if (f.includes('ai/')) return 5;
        if (f.includes('app/api/')) return 6;
        return 10;
    };

    const sorted = files.sort((a, b) => priority(a) - priority(b)).slice(0, 500);

    let totalSymbols = 0;
    let filesProcessed = 0;

    // Process in batches of 10
    for (let i = 0; i < sorted.length; i += 10) {
        const batch = sorted.slice(i, i + 10);
        const results = await Promise.all(
            batch.map(f => indexFileSymbols(f, root).catch(() => 0))
        );
        totalSymbols += results.reduce((sum, n) => sum + n, 0);
        filesProcessed += batch.length;

        if (i % 50 === 0 && i > 0) {
            logger.info('[CodeCache] Indexing progress', { filesProcessed, totalSymbols });
        }
    }

    logger.info('[CodeCache] Indexing complete', { filesProcessed, totalSymbols });
    return { filesProcessed, symbolsIndexed: totalSymbols };
}

// --- Search ---

/**
 * Search code symbols by natural language query
 *
 * Returns relevant function signatures, file paths, and line numbers.
 * ~50 tokens per result vs ~1,250 tokens for a full file read.
 */
export async function searchCode(
    query: string,
    options?: { limit?: number; type?: CodeSymbol['type'] }
): Promise<CodeSearchResult[]> {
    // Check Redis result cache first (5 min TTL)
    const cacheKey = `code:${query.substring(0, 60).replace(/[^a-zA-Z0-9]/g, '_')}:${options?.limit || 10}:${options?.type || ''}`;
    const cached = await getCached<CodeSearchResult[]>(CachePrefix.SEMANTIC_SEARCH, cacheKey);
    if (cached) return cached;

    if (!isVectorAvailable()) {
        return []; // Caller falls back to ripgrep
    }

    const queryEmbedding = await generateEmbedding(query);

    // Build filter if type specified
    const filter = options?.type ? `type = '${options.type}'` : undefined;

    const vectorResults = await vectorSearch({
        namespace: CODE_NAMESPACE,
        vector: queryEmbedding,
        topK: options?.limit ?? 10,
        includeMetadata: true,
        filter,
    });

    const results: CodeSearchResult[] = vectorResults.map(r => ({
        symbol: (r.metadata?.name as string) ?? r.id,
        signature: r.content ?? '',
        filePath: (r.metadata?.filePath as string) ?? '',
        line: (r.metadata?.line as number) ?? 0,
        type: (r.metadata?.type as string) ?? 'function',
        score: r.score,
        description: undefined,
    }));

    // Cache results
    setCached(CachePrefix.SEMANTIC_SEARCH, cacheKey, results, CacheTTL.SEMANTIC_SEARCH).catch(() => {});

    return results;
}
