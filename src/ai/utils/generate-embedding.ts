
import 'server-only';

import { ai } from '@/ai/genkit';

export const EMBEDDING_MODEL_NAME = 'gemini-embedding-001';
export const EMBEDDING_MODEL_REF = `googleai/${EMBEDDING_MODEL_NAME}`;
export const EMBEDDING_DIMENSIONS = 768;

type EmbedResponse = Array<{ embedding: number[] }>;
type EmbedFn = (params: {
  embedder: string;
  options: {
    outputDimensionality: number;
  };
  content: string;
}) => Promise<EmbedResponse>;

const defaultEmbed: EmbedFn = (params) => ai.embed(params);

/**
 * Generates a vector embedding for a given text using the specified model.
 * @param text The text to embed.
 * @returns A promise that resolves to an array of numbers representing the embedding.
 */
export async function generateEmbedding(
  text: string,
  embed: EmbedFn = defaultEmbed
): Promise<number[]> {
  const result = await embed({
    embedder: EMBEDDING_MODEL_REF,
    options: {
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
    content: text,
  });

  // ai.embed() returns an array of objects, each with an 'embedding' property.
  // Since we only provide one content part, we take the embedding from the first result.
  if (result.length > 0) {
    const embedding = result[0].embedding;
    if (embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error(
        `Embedding generation returned ${embedding.length} dimensions; expected ${EMBEDDING_DIMENSIONS}.`
      );
    }
    return embedding;
  }

  throw new Error('Embedding generation failed to produce a result.');
}
