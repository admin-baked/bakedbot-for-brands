// Tool framework types and interfaces

export type ToolCategory = 'research' | 'communication' | 'data' | 'integration' | 'analysis' | 'compliance';
export type ToolAuthType = 'none' | 'api_key' | 'oauth' | 'service_account';

/**
 * Base interface for all tools in the platform
 * Tools are the building blocks that agents use to accomplish tasks
 */
export interface Tool<TInput = any, TOutput = any> {
    // Identity
    id: string;
    name: string;
    description: string;
    category: ToolCategory;
    version: string;

    // App integration
    appId?: string; // Which app provides this tool (e.g., 'cannmenus', 'google-workspace')
    isDefault: boolean; // Is this tool available by default?

    // Capabilities
    capabilities: ToolCapability[];
    supportedFormats: string[]; // ['text', 'image', 'pdf', etc.]

    // Schema
    inputSchema: ToolSchema;
    outputSchema: ToolSchema;

    // Authentication
    authType: ToolAuthType;
    requiresAuth: boolean;

    // Execution
    execute: (input: TInput, context: ToolContext) => Promise<ToolResult<TOutput>>;

    // UI/UX
    visible: boolean; // Show execution in UI for "aha moments"
    icon?: string;
    color?: string;

    // Metadata
    estimatedDuration: number; // milliseconds
    estimatedCost?: number; // dollars per execution
    rateLimit?: ToolRateLimit;
}

export interface ToolCapability {
    name: string;
    description: string;
    examples: string[];
}

export interface ToolSchema {
    type: 'object' | 'array' | 'string' | 'number' | 'boolean';
    properties?: Record<string, ToolSchemaProperty>;
    required?: string[];
    items?: ToolSchema;
}

export interface ToolSchemaProperty {
    type: string;
    description: string;
    enum?: string[];
    default?: any;
    examples?: any[];
}

export interface ToolContext {
    userId: string;
    brandId?: string;
    taskId?: string;
    stepId?: string;
    agentId: string;

    // Authentication
    credentials?: Record<string, string>;

    // Execution context
    previousResults?: any[];
    sharedData?: Record<string, any>;
}

export interface ToolResult<T = any> {
    success: boolean;
    data: T;
    error?: ToolError;

    // Metadata
    metadata: {
        executionTime: number; // milliseconds
        tokensUsed?: number;
        cost?: number;
        apiCalls?: number;
        [key: string]: any;
    };

    // Display data for UI
    displayData?: {
        type: 'text' | 'table' | 'chart' | 'image' | 'link' | 'email' | 'document';
        title: string;
        content: any;
        preview?: string;
        icon?: string;
    };

    // Quality
    confidenceScore?: number; // 0-100
    needsReview?: boolean; // Requires Deebo review
    complianceIssues?: string[];
}

export interface ToolError {
    code: string;
    message: string;
    details?: any;
    retryable: boolean;
    suggestedAction?: string;
}

export interface ToolRateLimit {
    maxCallsPerMinute: number;
    maxCallsPerHour: number;
    maxCallsPerDay: number;
}

/**
 * Tool registry - manages all available tools
 */
export interface ToolRegistry {
    // Registration
    register(tool: Tool): void;
    unregister(toolId: string): void;

    // Discovery
    getAll(): Tool[];
    getById(toolId: string): Tool | undefined;
    getByCategory(category: ToolCategory): Tool[];
    getByApp(appId: string): Tool[];
    getByAgent(agentId: string): Tool[]; // Get tools an agent can use

    // Search
    search(query: string): Tool[];

    // Validation
    validateInput(toolId: string, input: any): boolean;
    validateAuth(toolId: string, credentials: any): Promise<boolean>;
}

/**
 * Tool execution request
 */
export interface ToolExecutionRequest {
    toolId: string;
    input: any;
    context: ToolContext;

    // Options
    timeout?: number;
    retries?: number;
    priority?: 'low' | 'normal' | 'high';
}

/**
 * Specific tool types
 */

// Web Search
export interface WebSearchInput {
    query: string;
    numResults?: number;
    dateRange?: 'day' | 'week' | 'month' | 'year' | 'all';
    country?: string;
}

export interface WebSearchOutput {
    results: Array<{
        title: string;
        url: string;
        snippet: string;
        date?: string;
    }>;
    totalResults: number;
}

// Web Scraper
export interface WebScraperInput {
    url: string;
    selector?: string;
    extract?: 'text' | 'html' | 'links' | 'images' | 'emails';
    waitFor?: number; // milliseconds
}

export interface WebScraperOutput {
    content: string | string[];
    metadata: {
        title?: string;
        description?: string;
        scrapedAt: Date;
    };
}

// Gmail
export interface GmailSendInput {
    to: string | string[];
    subject: string;
    body: string;
    cc?: string[];
    bcc?: string[];
    attachments?: Array<{
        filename: string;
        content: string; // base64
        contentType: string;
    }>;
}

export interface GmailSendOutput {
    messageId: string;
    threadId: string;
    sent: boolean;
}

// Google Sheets
export interface GoogleSheetsReadInput {
    spreadsheetId: string;
    range: string; // e.g., "Sheet1!A1:B10"
}

export interface GoogleSheetsReadOutput {
    values: any[][];
    metadata: {
        spreadsheetName: string;
        sheetName: string;
        rowCount: number;
        columnCount: number;
    };
}

export interface GoogleSheetsWriteInput {
    spreadsheetId: string;
    range: string;
    values: any[][];
    mode?: 'OVERWRITE' | 'APPEND';
}

export interface GoogleSheetsWriteOutput {
    updatedCells: number;
    updatedRows: number;
    updatedColumns: number;
}

// CannMenus Product Search
export interface CannMenusProductSearchInput {
    query?: string;
    category?: string;
    brand?: string;
    state?: string;
    minPrice?: number;
    maxPrice?: number;
    effects?: string[];
    limit?: number;
}

export interface CannMenusProductSearchOutput {
    products: Array<{
        id: string;
        name: string;
        brand: string;
        category: string;
        price: number;
        image?: string;
        description?: string;
        effects?: string[];
    }>;
    totalResults: number;
}
