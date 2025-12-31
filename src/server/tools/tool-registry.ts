// Tool Registry - manages all available tools in the platform

import type { Tool, ToolCategory } from '@/types/tool';

import { logger } from '@/lib/logger';
/**
 * Central registry for all tools in the platform
 * Provides discovery, validation, and management of tools
 */
export class ToolRegistry {
    private tools: Map<string, Tool> = new Map();
    private toolsByCategory: Map<ToolCategory, Set<string>> = new Map();
    private toolsByApp: Map<string, Set<string>> = new Map();

    /**
     * Register a new tool
     */
    register(tool: Tool): void {
        // Validate tool
        this.validateTool(tool);

        // Store in main registry
        this.tools.set(tool.id, tool);

        // Index by category
        if (!this.toolsByCategory.has(tool.category)) {
            this.toolsByCategory.set(tool.category, new Set());
        }
        this.toolsByCategory.get(tool.category)!.add(tool.id);

        // Index by app if applicable
        if (tool.appId) {
            if (!this.toolsByApp.has(tool.appId)) {
                this.toolsByApp.set(tool.appId, new Set());
            }
            this.toolsByApp.get(tool.appId)!.add(tool.id);
        }

        logger.info(`✅ Registered tool: ${tool.id} (${tool.category})`);
    }

    /**
     * Unregister a tool
     */
    unregister(toolId: string): void {
        const tool = this.tools.get(toolId);
        if (!tool) {
            return;
        }

        // Remove from main registry
        this.tools.delete(toolId);

        // Remove from category index
        this.toolsByCategory.get(tool.category)?.delete(toolId);

        // Remove from app index
        if (tool.appId) {
            this.toolsByApp.get(tool.appId)?.delete(toolId);
        }

        logger.info(`❌ Unregistered tool: ${toolId}`);
    }

    /**
     * Get all registered tools
     */
    getAll(): Tool[] {
        return Array.from(this.tools.values());
    }

    /**
     * Get a specific tool by ID
     */
    getById(toolId: string): Tool | undefined {
        return this.tools.get(toolId);
    }

    /**
     * Get tools by category
     */
    getByCategory(category: ToolCategory): Tool[] {
        const toolIds = this.toolsByCategory.get(category);
        if (!toolIds) {
            return [];
        }

        return Array.from(toolIds)
            .map(id => this.tools.get(id))
            .filter((tool): tool is Tool => tool !== undefined);
    }

    /**
     * Get tools provided by a specific app
     */
    getByApp(appId: string): Tool[] {
        const toolIds = this.toolsByApp.get(appId);
        if (!toolIds) {
            return [];
        }

        return Array.from(toolIds)
            .map(id => this.tools.get(id))
            .filter((tool): tool is Tool => tool !== undefined);
    }

    /**
     * Get tools available to a specific agent
     */
    getByAgent(agentId: string): Tool[] {
        // This will be enhanced with agent config integration
        // For now, return all tools
        return this.getAll();
    }

    /**
     * Get tools available to a specific role
     * CEO/SuperUser: All tools
     * Brand: Communication, analysis, data tools
     * Dispensary: Data, compliance tools
     * Customer: Limited research tools only
     */
    getByRole(role: 'ceo' | 'brand' | 'dispensary' | 'customer'): Tool[] {
        const allTools = this.getAll();

        switch (role) {
            case 'ceo':
                // Super users get all tools
                return allTools;
            case 'brand':
                // Brands get communication, analysis, and data tools
                return allTools.filter(t =>
                    ['communication', 'analysis', 'data', 'research'].includes(t.category)
                );
            case 'dispensary':
                // Dispensaries get data and compliance tools
                return allTools.filter(t =>
                    ['data', 'compliance', 'integration'].includes(t.category)
                );
            case 'customer':
                // Customers get limited tools (only visible, default tools)
                return allTools.filter(t => t.isDefault && t.visible);
            default:
                return [];
        }
    }

    /**
     * Search tools by name or description
     */
    search(query: string): Tool[] {
        const lowerQuery = query.toLowerCase();

        return this.getAll().filter(tool =>
            tool.name.toLowerCase().includes(lowerQuery) ||
            tool.description.toLowerCase().includes(lowerQuery) ||
            tool.id.toLowerCase().includes(lowerQuery)
        );
    }

    /**
     * Get default tools (available to all agents)
     */
    getDefaults(): Tool[] {
        return this.getAll().filter(tool => tool.isDefault);
    }

    /**
     * Validate input for a specific tool
     */
    validateInput(toolId: string, input: any): boolean {
        const tool = this.getById(toolId);
        if (!tool) {
            throw new Error(`Tool ${toolId} not found`);
        }

        // Use tool's input schema for validation
        // For now, just check if input exists
        return input !== null && input !== undefined;
    }

    /**
     * Validate authentication for a tool
     */
    async validateAuth(toolId: string, credentials: any): Promise<boolean> {
        const tool = this.getById(toolId);
        if (!tool) {
            throw new Error(`Tool ${toolId} not found`);
        }

        if (!tool.requiresAuth) {
            return true;
        }

        // Basic validation - tool-specific validation happens during execution
        return !!(credentials && Object.keys(credentials).length > 0);
    }

    /**
     * Get tool statistics
     */
    getStats(): {
        totalTools: number;
        byCategory: Record<ToolCategory, number>;
        byApp: Record<string, number>;
        defaultTools: number;
        authRequired: number;
    } {
        const byCategory: Record<ToolCategory, number> = {
            research: 0,
            communication: 0,
            data: 0,
            integration: 0,
            analysis: 0,
            compliance: 0
        };

        const byApp: Record<string, number> = {};
        let defaultTools = 0;
        let authRequired = 0;

        for (const tool of Array.from(this.tools.values())) {
            // Update category counts
            if (byCategory[tool.category] !== undefined) {
                byCategory[tool.category]++;
            } else {
                // Should not happen if all categories are initialized, but good for safety
                byCategory[tool.category] = 1;
            }

            // Update app counts
            if (tool.appId) {
                byApp[tool.appId] = (byApp[tool.appId] || 0) + 1;
            }

            if (tool.isDefault) defaultTools++;
            if (tool.requiresAuth) authRequired++;
        }

        return {
            totalTools: this.tools.size,
            byCategory,
            byApp,
            defaultTools,
            authRequired
        };
    }

    /**
     * Validate tool definition
     */
    private validateTool(tool: Tool): void {
        if (!tool.id) {
            throw new Error('Tool must have an id');
        }

        if (!tool.name) {
            throw new Error(`Tool ${tool.id} must have a name`);
        }

        if (!tool.description) {
            throw new Error(`Tool ${tool.id} must have a description`);
        }

        if (!tool.category) {
            throw new Error(`Tool ${tool.id} must have a category`);
        }

        if (!tool.execute || typeof tool.execute !== 'function') {
            throw new Error(`Tool ${tool.id} must have an execute function`);
        }

        // Check for duplicate IDs
        if (this.tools.has(tool.id)) {
            throw new Error(`Tool with id ${tool.id} is already registered`);
        }
    }

    /**
     * Clear all tools (useful for testing)
     */
    clear(): void {
        this.tools.clear();
        this.toolsByCategory.clear();
        this.toolsByApp.clear();
    }

    /**
     * Get human-readable summary
     */
    toString(): string {
        const stats = this.getStats();
        return `ToolRegistry: ${stats.totalTools} tools registered (${stats.defaultTools} default, ${stats.authRequired} require auth)`;
    }
}

// Singleton instance
let registry: ToolRegistry | null = null;

/**
 * Get the singleton tool registry
 */
export function getToolRegistry(): ToolRegistry {
    if (!registry) {
        registry = new ToolRegistry();
    }
    return registry;
}

/**
 * Register all built-in tools
 */
export async function registerBuiltInTools(): Promise<void> {
    const registry = getToolRegistry();

    // Import and register tools
    const { getEmailTool } = await import('./email-tool');

    // Register email tool
    registry.register(getEmailTool());

    // Register web scraper tool
    const { getWebScraperTool } = await import('./web-scraper');
    registry.register(getWebScraperTool());

    logger.info('📦 Built-in tools registered:', { tools: registry.toString() });
}
