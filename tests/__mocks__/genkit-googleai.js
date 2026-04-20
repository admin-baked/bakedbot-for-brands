// Mock for @genkit-ai/googleai (not installed, used in some tests)
module.exports = {
  googleAI: jest.fn(() => () => ({})),
  gemini15Flash: 'gemini-1.5-flash',
  gemini15Pro: 'gemini-1.5-pro',
  gemini20Flash: 'gemini-2.0-flash',
  geminiPro: 'gemini-pro',
};
