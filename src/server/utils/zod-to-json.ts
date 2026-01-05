import { z } from 'zod';

/**
 * Converts a Zod schema to a JSON Schema format compatible with Anthropic's tool definition.
 * 
 * Note: This is a simplified converter covering common use cases (String, Number, Boolean, Object, Array, Enum).
 * It may not cover complex Zod refinements or transforms.
 */
export function zodToClaudeSchema(schema: z.ZodTypeAny): any {
    if (schema instanceof z.ZodObject) {
        const shape = schema.shape;
        const properties: Record<string, any> = {};
        const required: string[] = [];

        for (const [key, value] of Object.entries(shape)) {
            const fieldSchema = value as z.ZodTypeAny;
            properties[key] = zodToClaudeSchema(fieldSchema);
            if (!fieldSchema.isOptional()) {
                required.push(key);
            }
        }

        return {
            type: 'object',
            properties,
            required: required.length > 0 ? required : undefined,
        };
    }

    if (schema instanceof z.ZodString) {
        const desc = schema.description;
        return { type: 'string', description: desc };
    }

    if (schema instanceof z.ZodNumber) {
         const desc = schema.description;
        return { type: 'number', description: desc };
    }

    if (schema instanceof z.ZodBoolean) {
         const desc = schema.description;
        return { type: 'boolean', description: desc };
    }

    if (schema instanceof z.ZodArray) {
        return {
            type: 'array',
            items: zodToClaudeSchema(schema.element),
            description: schema.description
        };
    }

    if (schema instanceof z.ZodEnum) {
        return {
            type: 'string',
            enum: schema._def.values,
            description: schema.description
        };
    }

    if (schema instanceof z.ZodOptional) {
        // Unwrap optional
        return zodToClaudeSchema(schema.unwrap());
    }

    if (schema instanceof z.ZodAny || schema instanceof z.ZodUnknown) {
        return { type: 'object', description: 'Any JSON object' }; 
    }
    
    // Fallback
    return { type: 'string', description: 'Unknown type' };
}
