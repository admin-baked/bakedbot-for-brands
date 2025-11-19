'use server';

import { ai, googleAI } from '@/ai/genkit';

/**
 * Generates a vector embedding for a given text using the specified model.
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const result = await ai.embed({
    embedder: googleAI.embedder('text-embedding-004'),
    content: text,
  });

  // ai.embed() returns an array of objects, each with an 'embedding' property.
  // Since we only provide one content part, we take the embedding from the first result.
  if (result.length > 0) {
    return result[0].embedding;
  }

  throw new Error('Embedding generation failed to produce a result.');
}
