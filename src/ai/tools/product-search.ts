

'use server';

/**
 * @fileOverview A Genkit tool for performing semantic or keyword search on products.
 * THIS TOOL IS NOW DEPRECATED. The logic has been moved directly into the
 * `recommendProducts` flow, which now uses a dedicated Product Repository
 * with vector search capabilities.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

export const productSearch = ai.defineTool(
  {
    name: 'productSearch',
    description: 'This tool is deprecated and should not be used. Product information is now provided directly in the prompt context after being fetched via vector search.',
    inputSchema: z.object({
      query: z.string().describe('The user query to search for. E.g., "something to help me sleep"'),
    }),
    outputSchema: z.object({
      products: z.array(z.object({
        id: z.string(),
        name: z.string(),
        description: z.string(),
        category: z.string(),
        price: z.number(),
      })),
    }),
  },
  async (input) => {
    // This tool is now a no-op. It will return an empty list.
    console.warn("DEPRECATED: The 'productSearch' tool was called. This logic has been moved to the recommendProducts flow. Returning empty array.");
    return { products: [] };
  }
);
