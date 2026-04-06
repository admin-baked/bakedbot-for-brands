import {
  EMBEDDING_DIMENSIONS,
  EMBEDDING_MODEL_REF,
  generateEmbedding,
} from '../generate-embedding';

describe('generateEmbedding', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses gemini-embedding-001 with a reduced 768-dimensional output', async () => {
    const embedding = new Array(EMBEDDING_DIMENSIONS).fill(0.25);
    const mockEmbed = jest.fn().mockResolvedValue([{ embedding }]);

    const result = await generateEmbedding('hello world', mockEmbed);

    expect(mockEmbed).toHaveBeenCalledWith({
      embedder: EMBEDDING_MODEL_REF,
      options: {
        outputDimensionality: EMBEDDING_DIMENSIONS,
      },
      content: 'hello world',
    });
    expect(result).toEqual(embedding);
  });

  it('throws when the provider returns the wrong embedding size', async () => {
    const mockEmbed = jest.fn().mockResolvedValue([{ embedding: [0.1, 0.2, 0.3] }]);

    await expect(generateEmbedding('bad dimensions', mockEmbed)).rejects.toThrow(
      `Embedding generation returned 3 dimensions; expected ${EMBEDDING_DIMENSIONS}.`
    );
  });
});

