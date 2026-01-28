// Jest setup file for testing
// Runs before all tests

// Add custom matchers from jest-dom
import '@testing-library/jest-dom';
// import './src/tests/mocks/lucide-react.tsx';


// Polyfill TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NODE_ENV = 'test';

process.env.GEMINI_API_KEY = 'test-key';

// Mock Genkit modules globally to prevent top-level initialization issues
jest.mock('@genkit-ai/google-genai', () => ({
    googleAI: jest.fn(() => () => ({})),
}));

jest.mock('genkit', () => ({
    genkit: jest.fn(() => ({
        definePrompt: jest.fn(() => jest.fn()),
        defineFlow: jest.fn(() => jest.fn()),
    })),
    Genkit: jest.fn(),
}));
