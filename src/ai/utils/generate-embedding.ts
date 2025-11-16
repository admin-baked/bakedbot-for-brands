
'use server';

import { ai } from '@/ai/genkit';

/**
 * Generates a vector embedding for a given text using the specified model.
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await ai.embed({
    model: 'googleai/text-embedding-004',
    content: text,
  });

  // ai.embed() returns an array of embeddings, one for each content part.
  // Since we only provide one, we take the first result.
  if (result.length > 0) {
    return result[0].embedding;
  }

  throw new Error('Embedding generation failed to produce a result.');
}
