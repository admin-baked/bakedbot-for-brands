/**
 * Conversations API Service
 *
 * Implements Letta's Conversations API for parallel message threads.
 *
 * Key concept: A conversation is a message thread within an agent.
 * A single agent can have multiple conversations running in parallel—
 * each with its own context window, but all sharing the same memory blocks.
 *
 * Use cases:
 * - Handling concurrent users talking to the same agent
 * - Separating task contexts (support vs sales conversations)
 * - Multi-session workflows that need isolated context
 *
 * Reference: https://docs.letta.com/guides/agents/conversations
 */

import { logger } from '@/lib/logger';
import { ConversationContext, ConversationContextSchema } from './memory-types';

// =============================================================================
// CONVERSATION TYPES
// =============================================================================

export interface LettaConversation {
    id: string;
    agent_id: string;
    created_at: string;
    name?: string;
    metadata?: Record<string, unknown>;
}

export interface ConversationMessage {
    id: string;
    conversation_id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    created_at: string;
}

export interface SendMessageOptions {
    stream?: boolean;
    timeout?: number;
}

// =============================================================================
// CONVERSATIONS SERVICE
// =============================================================================

export class ConversationsService {
    private baseUrl: string;
    private apiKey: string;

    constructor() {
        this.baseUrl = process.env.LETTA_BASE_URL || 'https://api.letta.com/v1';
        this.apiKey = process.env.LETTA_API_KEY || '';
    }

    /**
     * Create a new conversation thread for an agent.
     * Each conversation has its own context window but shares memory blocks.
     */
    async createConversation(
        agentId: string,
        options?: {
            name?: string;
            metadata?: Record<string, unknown>;
        }
    ): Promise<LettaConversation> {
        const response = await this.request('/conversations', {
            method: 'POST',
            body: JSON.stringify({
                agent_id: agentId,
                name: options?.name,
                metadata: options?.metadata,
            }),
        });

        logger.info(`[Conversations] Created conversation ${response.id} for agent ${agentId}`);

        return response;
    }

    /**
     * List all conversations for an agent.
     */
    async listConversations(
        agentId: string,
        options?: {
            limit?: number;
            offset?: number;
        }
    ): Promise<LettaConversation[]> {
        const params = new URLSearchParams();
        params.set('agent_id', agentId);
        if (options?.limit) params.set('limit', String(options.limit));
        if (options?.offset) params.set('offset', String(options.offset));

        return this.request(`/conversations?${params.toString()}`);
    }

    /**
     * Get a specific conversation.
     */
    async getConversation(conversationId: string): Promise<LettaConversation> {
        return this.request(`/conversations/${conversationId}`);
    }

    /**
     * Delete a conversation.
     */
    async deleteConversation(conversationId: string): Promise<void> {
        await this.request(`/conversations/${conversationId}`, {
            method: 'DELETE',
        });

        logger.info(`[Conversations] Deleted conversation ${conversationId}`);
    }

    /**
     * Send a message to a specific conversation.
     * This keeps the context isolated from other conversations.
     */
    async sendMessage(
        conversationId: string,
        message: string,
        options?: SendMessageOptions
    ): Promise<{
        messages: ConversationMessage[];
        usage?: { prompt_tokens: number; completion_tokens: number };
    }> {
        const response = await this.request(`/conversations/${conversationId}/messages`, {
            method: 'POST',
            body: JSON.stringify({
                messages: [{ role: 'user', content: message }],
            }),
        });

        return response;
    }

    /**
     * Get message history for a conversation.
     */
    async getMessages(
        conversationId: string,
        options?: {
            limit?: number;
            before?: string; // message ID for pagination
        }
    ): Promise<ConversationMessage[]> {
        const params = new URLSearchParams();
        if (options?.limit) params.set('limit', String(options.limit));
        if (options?.before) params.set('before', options.before);

        return this.request(
            `/conversations/${conversationId}/messages?${params.toString()}`
        );
    }

    /**
     * Get or create a conversation for a specific context.
     * Useful for ensuring each user/task has their own conversation.
     */
    async getOrCreateConversation(
        agentId: string,
        contextKey: string, // e.g., "user:123" or "task:abc"
        options?: {
            name?: string;
        }
    ): Promise<LettaConversation> {
        // Check existing conversations
        const existing = await this.listConversations(agentId, { limit: 100 });

        // Look for matching context in metadata
        const match = existing.find(
            c => c.metadata?.contextKey === contextKey
        );

        if (match) {
            return match;
        }

        // Create new conversation
        return this.createConversation(agentId, {
            name: options?.name || `Context: ${contextKey}`,
            metadata: { contextKey },
        });
    }

    /**
     * Create a handoff between two agents via shared conversation context.
     * Agent A writes state, Agent B picks it up.
     */
    async createHandoff(
        fromAgentId: string,
        toAgentId: string,
        handoffContext: {
            summary: string;
            relevantFacts: string[];
            nextAction?: string;
        }
    ): Promise<{
        fromConversation: LettaConversation;
        toConversation: LettaConversation;
    }> {
        const handoffId = `handoff-${Date.now()}`;

        // Create conversation for source agent with handoff data
        const fromConversation = await this.createConversation(fromAgentId, {
            name: `Handoff to ${toAgentId}`,
            metadata: {
                handoffId,
                type: 'handoff_source',
                targetAgent: toAgentId,
                ...handoffContext,
            },
        });

        // Create conversation for target agent with same context
        const toConversation = await this.createConversation(toAgentId, {
            name: `Handoff from ${fromAgentId}`,
            metadata: {
                handoffId,
                type: 'handoff_target',
                sourceAgent: fromAgentId,
                ...handoffContext,
            },
        });

        // Send initial context to target
        await this.sendMessage(
            toConversation.id,
            `[HANDOFF CONTEXT]\nSummary: ${handoffContext.summary}\n\nRelevant Facts:\n${handoffContext.relevantFacts.map(f => `- ${f}`).join('\n')}\n\nNext Action: ${handoffContext.nextAction || 'Continue from here'}`
        );

        logger.info(
            `[Conversations] Created handoff ${handoffId} from ${fromAgentId} to ${toAgentId}`
        );

        return { fromConversation, toConversation };
    }

    /**
     * Get conversation context summary.
     */
    async getConversationContext(conversationId: string): Promise<ConversationContext> {
        const conversation = await this.getConversation(conversationId);
        const messages = await this.getMessages(conversationId, { limit: 50 });

        const participants = new Set<string>();
        for (const msg of messages) {
            participants.add(msg.role);
        }

        return {
            conversationId: conversation.id,
            agentId: conversation.agent_id,
            tenantId: (conversation.metadata?.tenantId as string) || '',
            startedAt: new Date(conversation.created_at),
            lastMessageAt: messages.length > 0
                ? new Date(messages[messages.length - 1].created_at)
                : new Date(conversation.created_at),
            messageCount: messages.length,
            participants: Array.from(participants),
            tags: (conversation.metadata?.tags as string[]) || [],
        };
    }

    /**
     * Archive old conversations (cleanup).
     */
    async archiveOldConversations(
        agentId: string,
        olderThanDays: number = 30
    ): Promise<number> {
        const conversations = await this.listConversations(agentId, { limit: 100 });
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - olderThanDays);

        let archived = 0;

        for (const conv of conversations) {
            const createdAt = new Date(conv.created_at);
            if (createdAt < cutoff) {
                try {
                    await this.deleteConversation(conv.id);
                    archived++;
                } catch (e) {
                    logger.warn(`[Conversations] Failed to archive ${conv.id}:`, e);
                }
            }
        }

        logger.info(`[Conversations] Archived ${archived} old conversations for agent ${agentId}`);

        return archived;
    }

    // ==========================================================================
    // PRIVATE HELPERS
    // ==========================================================================

    private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
        if (!this.apiKey) {
            throw new Error('LETTA_API_KEY is required');
        }

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
            ...options.headers,
        };

        const response = await fetch(url, { ...options, headers });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Letta API Error (${response.status}): ${errorText}`);
        }

        // Handle empty responses
        const text = await response.text();
        return text ? JSON.parse(text) : {};
    }
}

export const conversationsService = new ConversationsService();
