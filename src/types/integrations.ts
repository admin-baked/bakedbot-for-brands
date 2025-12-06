export type IntegrationType = 'api' | 'mcp' | 'computer';

export interface IntegrationConfig {
    id: string;
    name: string;
    type: IntegrationType;
    icon?: string;
    description: string;

    // Connection Details
    config: {
        // API
        baseUrl?: string;
        authType?: 'bearer' | 'oauth2' | 'apikey';

        // MCP
        mcpServerUrl?: string; // WebSocket or SSE endpoint
        capabilities?: string[];

        // Computer
        resolution?: string; // "1920x1080"
        os?: 'linux' | 'windows' | 'macos';
        streamUrl?: string; // For live view
    };

    // App Store Metadata
    isPaid?: boolean;
    price?: number;
    installedAt?: Date;
}

// Event for visual feedback of "Computer Use"
export interface ComputerAction {
    type: 'mouse_move' | 'click' | 'type' | 'scroll' | 'screenshot';
    x?: number;
    y?: number;
    text?: string;
    screenshotUrl?: string; // Base64 or URL
    timestamp: Date;
}
