export const ai = { 
  generate: jest.fn().mockResolvedValue({ text: "mock response" }),
  embed: jest.fn(),
  defineFlow: jest.fn(),
  startFlow: jest.fn() 
};
export const genkit = jest.fn();
