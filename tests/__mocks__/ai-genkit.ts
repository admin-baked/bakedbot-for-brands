export const ai = {
  generate: jest.fn().mockResolvedValue({ text: "mock response" }),
  generateStream: jest.fn().mockReturnValue({
    stream: (async function* () {
      yield { accumulatedText: "mock streamed response" };
    })(),
    response: Promise.resolve({ text: "mock streamed response" }),
  }),
  embed: jest.fn(),
  defineFlow: jest.fn(),
  startFlow: jest.fn(),
  defineTool: jest.fn((config: unknown, impl: (...args: unknown[]) => unknown) => impl),
  definePrompt: jest.fn(),
  run: jest.fn(),
};
export const genkit = jest.fn(() => ai);
