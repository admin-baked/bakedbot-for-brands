'use server';
/**
 * @fileOverview A Genkit tool for securely retrieving a single product from Firestore.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { doc, getDoc } from 'firebase/firestore';
import { createServerClient } from '@/firebase/server-client';
import type { Product } from '@/lib/types';

const GetProductInputSchema = z.object({
  productId: z.string().describe('The unique ID of the product to retrieve.'),
});

// We define a Zod schema for the Product to ensure the output is structured.
const ProductSchema = z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    price: z.number(),
    description: z.string(),
    likes: z.number().optional(),
    dislikes: z.number().optional(),
    imageUrl: z.string().url(),
    imageHint: z.string(),
    prices: z.record(z.number()),
});


export const getProduct = ai.defineTool(
  {
    name: 'getProduct',
    description: 'Returns the full details for a single product given its ID. Use this to validate a product exists and get its information.',
    inputSchema: GetProductInputSchema,
    outputSchema: ProductSchema.nullable(),
  },
  async ({ productId }) => {
    try {
      const { firestore } = await createServerClient();
      const productRef = doc(firestore, 'products', productId);
      const productSnap = await getDoc(productRef);

      if (!productSnap.exists()) {
        console.warn(`[getProduct Tool] Product with ID "${productId}" not found.`);
        return null;
      }
      
      const productData = productSnap.data() as Product;

      // Ensure the data matches the schema, especially for optional fields.
      return {
          id: productSnap.id,
          ...productData,
          likes: productData.likes ?? 0,
          dislikes: productData.dislikes ?? 0,
      };

    } catch (error) {
      console.error(`[getProduct Tool] Error fetching product "${productId}":`, error);
      // In case of an error, return null to indicate failure.
      return null;
    }
  }
);
