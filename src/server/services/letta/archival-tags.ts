/**
 * Archival Tags Service
 *
 * Implements tag-based memory organization for Letta archival memory.
 * Tags help agents organize and filter memories efficiently.
 *
 * Key insight from Letta docs: "Agents always know what tags exist in their
 * archive since tag lists are compiled into the context window."
 *
 * Use cases:
 * - Categorize memories by topic (competitor, product, customer)
 * - Filter searches to specific domains
 * - Track memory provenance (which agent created it)
 * - Enable cross-agent memory sharing with clear attribution
 *
 * Reference: https://docs.letta.com/guides/agents/archival-search/
 */

import { logger } from '@/lib/logger';
import { lettaClient } from './client';
import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

// =============================================================================
// TAG TAXONOMY
// =============================================================================

/**
 * Standard tag prefixes for consistent organization.
 * Use these as prefixes: "category:competitor", "agent:ezal", etc.
 */
export const TAG_PREFIXES = {
    CATEGORY: 'category',    // What type of info: category:competitor, category:product
    AGENT: 'agent',          // Who created: agent:ezal, agent:craig
    TENANT: 'tenant',        // Which tenant: tenant:brand123
    SOURCE: 'source',        // Where from: source:web, source:user
    PRIORITY: 'priority',    // Importance: priority:high, priority:low
    STATUS: 'status',        // State: status:verified, status:pending
    TEMPORAL: 'temporal',    // Time-based: temporal:2024-q1, temporal:weekly
} as const;

/**
 * Common category tags used across the system.
 */
export const CATEGORY_TAGS = {
    COMPETITOR: 'category:competitor',
    PRODUCT: 'category:product',
    CUSTOMER: 'category:customer',
    PRICING: 'category:pricing',
    COMPLIANCE: 'category:compliance',
    MARKETING: 'category:marketing',
    WORKFLOW: 'category:workflow',
    INSIGHT: 'category:insight',
    DECISION: 'category:decision',
    FACT: 'category:fact',
} as const;

/**
 * Agent attribution tags.
 */
export const AGENT_TAGS = {
    LEO: 'agent:leo',
    JACK: 'agent:jack',
    LINUS: 'agent:linus',
    GLENDA: 'agent:glenda',
    MIKE: 'agent:mike',
    CRAIG: 'agent:craig',
    SMOKEY: 'agent:smokey',
    EZAL: 'agent:ezal',
    DEEBO: 'agent:deebo',
    MRS_PARKER: 'agent:mrs_parker',
    MONEY_MIKE: 'agent:money_mike',
    SYSTEM: 'agent:system',
} as const;

// =============================================================================
// TAG MANAGEMENT SERVICE
// =============================================================================

const TAG_INDEX_COLLECTION = 'memory_tag_index';

export interface TaggedMemory {
    content: string;
    tags: string[];
    agentId: string;
    tenantId: string;
    createdAt?: Date;
}

export interface TagIndex {
    tag: string;
    tenantId: string;
    count: number;
    lastUsed: Date;
    agents: string[]; // Which agents use this tag
}

export class ArchivalTagsService {
    /**
     * Insert a memory with tags into archival storage.
     * Tags are stored alongside the content for filtering.
     */
    async insertWithTags(
        agentId: string,
        memory: TaggedMemory
    ): Promise<{ id: string; tags: string[] }> {
        // Normalize tags
        const normalizedTags = this.normalizeTags(memory.tags);

        // Build tagged content (tags are included in searchable content)
        const taggedContent = this.buildTaggedContent(memory.content, normalizedTags);

        // Insert into Letta archival
        const result = await lettaClient.insertPassage(agentId, taggedContent);

        // Update tag index
        await this.updateTagIndex(memory.tenantId, normalizedTags, agentId);

        logger.info(
            `[ArchivalTags] Inserted memory with tags: ${normalizedTags.join(', ')}`
        );

        return {
            id: result.id || `mem-${Date.now()}`,
            tags: normalizedTags,
        };
    }

    /**
     * Search memories by tags.
     * Combines tag filtering with semantic search.
     */
    async searchByTags(
        agentId: string,
        tags: string[],
        options?: {
            query?: string;
            limit?: number;
            requireAllTags?: boolean;
        }
    ): Promise<string[]> {
        const normalizedTags = this.normalizeTags(tags);

        // Build search query with tags
        const tagQuery = normalizedTags.map(t => `[${t}]`).join(' ');
        const fullQuery = options?.query
            ? `${tagQuery} ${options.query}`
            : tagQuery;

        const results = await lettaClient.searchPassages(
            agentId,
            fullQuery,
            (options?.limit || 10) * 2 // Fetch more, filter later
        );

        // Filter results that actually have the tags
        const filtered = results.filter(content => {
            const hasTags = normalizedTags.filter(tag =>
                content.includes(`[${tag}]`)
            );

            if (options?.requireAllTags) {
                return hasTags.length === normalizedTags.length;
            }
            return hasTags.length > 0;
        });

        return filtered.slice(0, options?.limit || 10);
    }

    /**
     * Get all tags used by a tenant.
     */
    async getTenantTags(tenantId: string): Promise<TagIndex[]> {
        const db = getAdminFirestore();
        const snapshot = await db
            .collection(TAG_INDEX_COLLECTION)
            .where('tenantId', '==', tenantId)
            .orderBy('count', 'desc')
            .limit(100)
            .get();

        return snapshot.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => {
            const data = doc.data();
            return {
                tag: data?.tag ?? '',
                tenantId: data?.tenantId ?? '',
                count: data?.count ?? 0,
                lastUsed: data?.lastUsed?.toDate() || new Date(),
                agents: data?.agents || [],
            };
        });
    }

    /**
     * Get tags used by a specific agent.
     */
    async getAgentTags(tenantId: string, agentName: string): Promise<TagIndex[]> {
        const agentTag = `agent:${agentName.toLowerCase()}`;
        const db = getAdminFirestore();
        const snapshot = await db
            .collection(TAG_INDEX_COLLECTION)
            .where('tenantId', '==', tenantId)
            .where('agents', 'array-contains', agentTag)
            .orderBy('count', 'desc')
            .limit(50)
            .get();

        return snapshot.docs.map((doc: FirebaseFirestore.DocumentSnapshot) => {
            const data = doc.data();
            return {
                tag: data?.tag ?? '',
                tenantId: data?.tenantId ?? '',
                count: data?.count ?? 0,
                lastUsed: data?.lastUsed?.toDate() || new Date(),
                agents: data?.agents || [],
            };
        });
    }

    /**
     * Generate tag suggestions based on content.
     * Simple heuristic-based tagging (would use NLP in production).
     */
    suggestTags(content: string, agentName?: string): string[] {
        const tags: string[] = [];
        const lower = content.toLowerCase();

        // Agent attribution
        if (agentName) {
            tags.push(`agent:${agentName.toLowerCase()}`);
        }

        // Category detection
        if (lower.includes('competitor') || lower.includes('competition')) {
            tags.push(CATEGORY_TAGS.COMPETITOR);
        }
        if (lower.includes('product') || lower.includes('sku') || lower.includes('inventory')) {
            tags.push(CATEGORY_TAGS.PRODUCT);
        }
        if (lower.includes('customer') || lower.includes('user') || lower.includes('buyer')) {
            tags.push(CATEGORY_TAGS.CUSTOMER);
        }
        if (lower.includes('price') || lower.includes('cost') || lower.includes('margin')) {
            tags.push(CATEGORY_TAGS.PRICING);
        }
        if (lower.includes('compliance') || lower.includes('regulation') || lower.includes('legal')) {
            tags.push(CATEGORY_TAGS.COMPLIANCE);
        }
        if (lower.includes('campaign') || lower.includes('marketing') || lower.includes('promotion')) {
            tags.push(CATEGORY_TAGS.MARKETING);
        }
        if (lower.includes('workflow') || lower.includes('process') || lower.includes('step')) {
            tags.push(CATEGORY_TAGS.WORKFLOW);
        }
        if (lower.includes('insight') || lower.includes('learned') || lower.includes('discovered')) {
            tags.push(CATEGORY_TAGS.INSIGHT);
        }
        if (lower.includes('decision') || lower.includes('decided') || lower.includes('chose')) {
            tags.push(CATEGORY_TAGS.DECISION);
        }

        // Priority detection
        if (lower.includes('urgent') || lower.includes('critical') || lower.includes('important')) {
            tags.push('priority:high');
        }

        // Default to fact if no category detected
        if (tags.filter(t => t.startsWith('category:')).length === 0) {
            tags.push(CATEGORY_TAGS.FACT);
        }

        return [...new Set(tags)]; // Dedupe
    }

    /**
     * Merge duplicate tags (e.g., "Competitor" and "competitor").
     */
    async consolidateTags(tenantId: string): Promise<number> {
        const tags = await this.getTenantTags(tenantId);
        const db = getAdminFirestore();

        // Group by normalized form
        const groups = new Map<string, TagIndex[]>();
        for (const tag of tags) {
            const normalized = tag.tag.toLowerCase();
            if (!groups.has(normalized)) {
                groups.set(normalized, []);
            }
            groups.get(normalized)!.push(tag);
        }

        let consolidated = 0;

        // Merge duplicates
        for (const [_, duplicates] of groups) {
            if (duplicates.length > 1) {
                // Keep the one with highest count
                const primary = duplicates.sort((a, b) => b.count - a.count)[0];
                const toMerge = duplicates.slice(1);

                for (const dup of toMerge) {
                    // Update primary
                    await db
                        .collection(TAG_INDEX_COLLECTION)
                        .doc(this.tagDocId(tenantId, primary.tag))
                        .update({
                            count: FieldValue.increment(dup.count),
                            agents: FieldValue.arrayUnion(...dup.agents),
                        });

                    // Delete duplicate
                    await db
                        .collection(TAG_INDEX_COLLECTION)
                        .doc(this.tagDocId(tenantId, dup.tag))
                        .delete();

                    consolidated++;
                }
            }
        }

        logger.info(`[ArchivalTags] Consolidated ${consolidated} duplicate tags for ${tenantId}`);

        return consolidated;
    }

    /**
     * Get tag statistics for a tenant.
     */
    async getTagStats(tenantId: string): Promise<{
        totalTags: number;
        totalUsage: number;
        topTags: Array<{ tag: string; count: number }>;
        tagsByCategory: Record<string, number>;
    }> {
        const tags = await this.getTenantTags(tenantId);

        const tagsByCategory: Record<string, number> = {};
        let totalUsage = 0;

        for (const tag of tags) {
            totalUsage += tag.count;

            const prefix = tag.tag.split(':')[0];
            tagsByCategory[prefix] = (tagsByCategory[prefix] || 0) + 1;
        }

        return {
            totalTags: tags.length,
            totalUsage,
            topTags: tags.slice(0, 10).map(t => ({ tag: t.tag, count: t.count })),
            tagsByCategory,
        };
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private normalizeTags(tags: string[]): string[] {
        return tags
            .map(tag => tag.trim().toLowerCase())
            .filter(tag => tag.length > 0)
            .map(tag => {
                // Ensure proper format (prefix:value)
                if (!tag.includes(':')) {
                    return `category:${tag}`;
                }
                return tag;
            });
    }

    private buildTaggedContent(content: string, tags: string[]): string {
        // Format: [tag1][tag2] Content here
        const tagString = tags.map(t => `[${t}]`).join('');
        return `${tagString} ${content}`;
    }

    private async updateTagIndex(
        tenantId: string,
        tags: string[],
        agentId: string
    ): Promise<void> {
        const db = getAdminFirestore();
        const batch = db.batch();

        for (const tag of tags) {
            const docId = this.tagDocId(tenantId, tag);
            const docRef = db.collection(TAG_INDEX_COLLECTION).doc(docId);

            batch.set(
                docRef,
                {
                    tag,
                    tenantId,
                    count: FieldValue.increment(1),
                    lastUsed: FieldValue.serverTimestamp(),
                    agents: FieldValue.arrayUnion(agentId),
                },
                { merge: true }
            );
        }

        await batch.commit();
    }

    private tagDocId(tenantId: string, tag: string): string {
        // Create deterministic doc ID from tenant and tag
        return `${tenantId}_${tag.replace(/[^a-z0-9:]/g, '_')}`;
    }
}

export const archivalTagsService = new ArchivalTagsService();
