'use server';

import { ai } from '@/ai/genkit';

/**
 * Generates a vector embedding for a given text using the specified model.
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const { embedding } = await ai.embed({
    model: 'googleai/text-embedding-004',
    content: text,
  });
  return embedding;
}
