// Jest setup file for testing
// Runs before all tests

// Add custom matchers from jest-dom
import '@testing-library/jest-dom';

// Polyfill TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock environment variables
process.env.NODE_ENV = 'test';
