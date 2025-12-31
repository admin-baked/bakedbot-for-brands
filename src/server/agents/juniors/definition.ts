import { z } from 'zod';

export interface JuniorWork<TInput = any, TOutput = any> {
    /**
     * Unique identifier for the work unit (e.g., 'marketing.seo.generate-meta').
     */
    id: string;

    /**
     * Human-readable name.
     */
    name: string;

    /**
     * Description used for agent discovery and tool descriptions.
     */
    description: string;

    /**
     * Zod schema for validating inputs.
     */
    inputSchema: z.ZodType<TInput>;

    /**
     * Zod schema for validating outputs.
     */
    outputSchema: z.ZodType<TOutput>;

    /**
     * List of permission scopes required to run this work.
     */
    requiredPermissions: string[];

    /**
     * The implementation of the logic.
     */
    handler: (inputs: TInput, context: JuniorContext) => Promise<TOutput>;
}

export interface JuniorContext {
    userId: string;
}
