export const ai = { 
  generate: jest.fn().mockResolvedValue({ text: "mock response" }),
  defineFlow: jest.fn(),
  startFlow: jest.fn() 
};
export const genkit = jest.fn();
