// Base tool class - foundation for all tools in the platform

import type {
    Tool,
    ToolContext,
    ToolResult,
    ToolError,
    ToolCategory,
    ToolAuthType
} from '@/types/tool';

/**
 * Abstract base class for all tools
 * Provides common functionality and enforces consistent patterns
 */
export abstract class BaseTool<TInput = any, TOutput = any> implements Tool<TInput, TOutput> {
    // Tool identity
    abstract readonly id: string;
    abstract readonly name: string;
    abstract readonly description: string;
    abstract readonly category: ToolCategory;
    readonly version: string = '1.0.0';

    // App integration
    appId?: string;
    isDefault: boolean = false;

    // Capabilities
    abstract readonly capabilities: Array<{
        name: string;
        description: string;
        examples: string[];
    }>;

    supportedFormats: string[] = ['text'];

    // Schema (to be defined by subclasses)
    abstract readonly inputSchema: any;
    abstract readonly outputSchema: any;

    // Authentication
    abstract readonly authType: ToolAuthType;
    abstract readonly requiresAuth: boolean;

    // UI/UX
    visible: boolean = true;
    icon?: string;
    color?: string;

    // Metadata
    estimatedDuration: number = 5000; // 5 seconds default
    estimatedCost?: number;
    rateLimit?: {
        maxCallsPerMinute: number;
        maxCallsPerHour: number;
        maxCallsPerDay: number;
    };

    /**
     * Main execution method - must be implemented by subclasses
     */
    abstract execute(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>>;

    /**
     * Validate input against schema
     */
    protected validateInput(input: TInput): boolean {
        // Basic validation - subclasses can override
        if (!input) {
            throw this.createError('INPUT_REQUIRED', 'Input is required', true);
        }
        return true;
    }

    /**
     * Validate authentication credentials
     */
    protected async validateAuth(context: ToolContext): Promise<boolean> {
        if (!this.requiresAuth) {
            return true;
        }

        if (!context.credentials || Object.keys(context.credentials).length === 0) {
            throw this.createError(
                'AUTH_REQUIRED',
                `Tool ${this.id} requires authentication`,
                false
            );
        }

        return true;
    }

    /**
     * Create a standardized error
     */
    protected createError(
        code: string,
        message: string,
        retryable: boolean = false,
        details?: any
    ): ToolError {
        return {
            code,
            message,
            details,
            retryable,
            suggestedAction: this.getSuggestedAction(code)
        };
    }

    /**
     * Get suggested action for error code
     */
    protected getSuggestedAction(code: string): string | undefined {
        const suggestions: Record<string, string> = {
            'AUTH_REQUIRED': 'Please provide authentication credentials',
            'INPUT_REQUIRED': 'Please provide valid input',
            'RATE_LIMIT': 'Please wait and try again later',
            'API_ERROR': 'Check the API status and credentials',
            'TIMEOUT': 'Increase timeout or try again'
        };

        return suggestions[code];
    }

    /**
     * Create a successful result
     */
    protected createResult(
        data: TOutput,
        metadata: {
            executionTime: number;
            tokensUsed?: number;
            cost?: number;
            apiCalls?: number;
            [key: string]: any;
        },
        displayData?: ToolResult<TOutput>['displayData'],
        confidenceScore?: number
    ): ToolResult<TOutput> {
        return {
            success: true,
            data,
            metadata,
            displayData,
            confidenceScore,
            needsReview: confidenceScore ? confidenceScore < 0.8 : false
        };
    }

    /**
     * Create a failed result
     */
    protected createFailedResult(error: ToolError): ToolResult<TOutput> {
        return {
            success: false,
            data: null as any,
            error,
            metadata: {
                executionTime: 0
            }
        };
    }

    /**
     * Execute with automatic error handling and timing
     */
    async executeWithMetrics(input: TInput, context: ToolContext): Promise<ToolResult<TOutput>> {
        const startTime = Date.now();

        try {
            // Validate input
            this.validateInput(input);

            // Validate auth
            await this.validateAuth(context);

            // Execute
            const result = await this.execute(input, context);

            // Add execution time if not already set
            if (!result.metadata.executionTime) {
                result.metadata.executionTime = Date.now() - startTime;
            }

            return result;
        } catch (error: any) {
            const executionTime = Date.now() - startTime;

            // Convert any error to ToolError
            const toolError: ToolError = error.code ? error : {
                code: 'EXECUTION_ERROR',
                message: error.message || 'Unknown error occurred',
                details: error.stack,
                retryable: false
            };

            return {
                success: false,
                data: null as any,
                error: toolError,
                metadata: { executionTime }
            };
        }
    }

    /**
     * Get tool information for documentation
     */
    getInfo(): {
        id: string;
        name: string;
        description: string;
        category: ToolCategory;
        capabilities: Array<{
            name: string;
            description: string;
            examples: string[];
        }>;
        requiresAuth: boolean;
        estimatedDuration: number;
    } {
        return {
            id: this.id,
            name: this.name,
            description: this.description,
            category: this.category,
            capabilities: this.capabilities,
            requiresAuth: this.requiresAuth,
            estimatedDuration: this.estimatedDuration
        };
    }
}
