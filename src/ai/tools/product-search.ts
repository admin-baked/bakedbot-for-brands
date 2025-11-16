

'use server';

/**
 * @fileOverview A Genkit tool for performing semantic or keyword search on products.
 * THIS TOOL IS NOW DEPRECATED. The logic has been moved directly into the
 * `recommendProducts` flow to enforce multi-tenancy. Products are now passed
 * in as context rather than fetched here.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import type { Product } from '@/firebase/converters';

export const productSearch = ai.defineTool(
  {
    name: 'productSearch',
    description: 'This tool is deprecated and should not be used. Product information is now provided directly in the prompt context.',
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
    // The actual product data should be fetched by the calling flow and
    // passed into the prompt's context.
    console.warn("DEPRECATED: The 'productSearch' tool was called. This logic has been moved to the recommendProducts flow for multi-tenancy. Returning empty array.");
    return { products: [] };
  }
);
