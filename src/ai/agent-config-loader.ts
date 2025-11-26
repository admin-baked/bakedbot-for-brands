// Agent configuration loader - reads and parses YAML agent configs

import * as yaml from 'js-yaml';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentConfig {
    name: string;
    role: string;
    description: string;

    personality: {
        tone: string;
        expertise: string;
        communication_style: string;
        attributes: string[];
    };

    capabilities: string[];
    tools: string[];
    instructions: string;

    confidence_thresholds: Record<string, number>;

    metadata: {
        version: string;
        last_updated: string;
        category: string;
        [key: string]: any;
    };

    // Optional fields
    approval_required?: string[];
    output_formats?: string[];
}

/**
 * Loads agent configurations from YAML files
 */
export class AgentConfigLoader {
    private configs: Map<string, AgentConfig> = new Map();
    private configDir: string;

    constructor(configDir?: string) {
        this.configDir = configDir || path.join(process.cwd(), 'agents');
    }

    /**
     * Load all agent configurations
     */
    async loadAll(): Promise<void> {
        const agentFiles = [
            'craig.yaml',
            'pops.yaml',
            'ezal.yaml',
            'moneyMike.yaml',
            'mrsParker.yaml',
            'deebo.yaml'
        ];

        for (const file of agentFiles) {
            try {
                await this.load(file);
            } catch (error) {
                console.error(`Error loading agent config ${file}:`, error);
            }
        }
    }

    /**
     * Load a specific agent configuration
     */
    async load(filename: string): Promise<AgentConfig> {
        const filepath = path.join(this.configDir, filename);

        try {
            const fileContent = fs.readFileSync(filepath, 'utf8');
            const config = yaml.load(fileContent) as AgentConfig;

            // Extract agent ID from filename (e.g., 'craig.yaml' -> 'craig')
            const agentId = path.basename(filename, '.yaml');

            // Validate config
            this.validateConfig(config, agentId);

            // Store in cache
            this.configs.set(agentId, config);

            return config;
        } catch (error) {
            throw new Error(`Failed to load agent config ${filename}: ${error}`);
        }
    }

    /**
     * Get configuration for a specific agent
     */
    get(agentId: string): AgentConfig | undefined {
        return this.configs.get(agentId);
    }

    /**
     * Get all loaded configurations
     */
    getAll(): Map<string, AgentConfig> {
        return this.configs;
    }

    /**
     * Get agents that have a specific tool
     */
    getAgentsByTool(toolId: string): AgentConfig[] {
        const agents: AgentConfig[] = [];

        for (const [, config] of this.configs) {
            if (config.tools.includes(toolId)) {
                agents.push(config);
            }
        }

        return agents;
    }

    /**
     * Get agents by category
     */
    getAgentsByCategory(category: string): AgentConfig[] {
        const agents: AgentConfig[] = [];

        for (const [, config] of this.configs) {
            if (config.metadata.category === category) {
                agents.push(config);
            }
        }

        return agents;
    }

    /**
     * Reload a specific agent configuration
     */
    async reload(agentId: string): Promise<AgentConfig> {
        const filename = `${agentId}.yaml`;
        return this.load(filename);
    }

    /**
     * Reload all configurations
     */
    async reloadAll(): Promise<void> {
        this.configs.clear();
        await this.loadAll();
    }

    /**
     * Validate agent configuration
     */
    private validateConfig(config: AgentConfig, agentId: string): void {
        // Required fields
        if (!config.name) {
            throw new Error(`Agent ${agentId}: name is required`);
        }

        if (!config.role) {
            throw new Error(`Agent ${agentId}: role is required`);
        }

        if (!config.description) {
            throw new Error(`Agent ${agentId}: description is required`);
        }

        if (!config.tools || config.tools.length === 0) {
            throw new Error(`Agent ${agentId}: must have at least one tool`);
        }

        if (!config.instructions) {
            throw new Error(`Agent ${agentId}: instructions are required`);
        }

        // Validate confidence thresholds are between 0 and 1
        if (config.confidence_thresholds) {
            for (const [key, value] of Object.entries(config.confidence_thresholds)) {
                if (value < 0 || value > 1) {
                    throw new Error(
                        `Agent ${agentId}: confidence threshold '${key}' must be between 0 and 1`
                    );
                }
            }
        }
    }
}

// Singleton instance
let loader: AgentConfigLoader | null = null;

/**
 * Get the singleton agent config loader
 */
export function getAgentConfigLoader(): AgentConfigLoader {
    if (!loader) {
        loader = new AgentConfigLoader();
    }
    return loader;
}

/**
 * Initialize and load all agent configurations
 */
export async function initializeAgentConfigs(): Promise<void> {
    const configLoader = getAgentConfigLoader();
    await configLoader.loadAll();
    console.log(`Loaded ${configLoader.getAll().size} agent configurations`);
}
