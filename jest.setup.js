// Jest setup file for testing
// Runs before all tests

// Add custom matchers from jest-dom
import '@testing-library/jest-dom';
// import './src/tests/mocks/lucide-react.tsx';


// Polyfill TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill fetch/Request/Response for Next server imports in Jest (jsdom env)
if (typeof Request === 'undefined') {
  class HeadersPolyfill {
    constructor(init = {}) {
      this._map = new Map();
      if (init instanceof HeadersPolyfill) {
        init.forEach((value, key) => this.set(key, value));
      } else if (Array.isArray(init)) {
        init.forEach(([key, value]) => this.append(key, value));
      } else if (init && typeof init === 'object') {
        Object.entries(init).forEach(([key, value]) => this.append(key, String(value)));
      }
    }

    append(key, value) {
      this._map.set(String(key).toLowerCase(), String(value));
    }

    set(key, value) {
      this._map.set(String(key).toLowerCase(), String(value));
    }

    get(key) {
      return this._map.get(String(key).toLowerCase()) ?? null;
    }

    has(key) {
      return this._map.has(String(key).toLowerCase());
    }

    delete(key) {
      this._map.delete(String(key).toLowerCase());
    }

    forEach(callback, thisArg) {
      for (const [key, value] of this._map.entries()) {
        callback.call(thisArg, value, key, this);
      }
    }

    entries() {
      return this._map.entries();
    }

    keys() {
      return this._map.keys();
    }

    values() {
      return this._map.values();
    }

    [Symbol.iterator]() {
      return this._map[Symbol.iterator]();
    }
  }

  class RequestPolyfill {
    constructor(input = '', init = {}) {
      this.url = typeof input === 'string' ? input : (input?.url || '');
      this.method = (init.method || 'GET').toUpperCase();
      this.headers = init.headers instanceof HeadersPolyfill ? init.headers : new HeadersPolyfill(init.headers);
      this.body = init.body;
    }
  }

  class ResponsePolyfill {
    constructor(body = null, init = {}) {
      this.body = body;
      this.status = init.status ?? 200;
      this.statusText = init.statusText ?? '';
      this.headers = init.headers instanceof HeadersPolyfill ? init.headers : new HeadersPolyfill(init.headers);
    }

    async json() {
      if (typeof this.body === 'string') {
        return JSON.parse(this.body);
      }
      return this.body;
    }

    async text() {
      if (typeof this.body === 'string') return this.body;
      return JSON.stringify(this.body ?? '');
    }
  }

  global.Headers = HeadersPolyfill;
  global.Request = RequestPolyfill;
  global.Response = ResponsePolyfill;
  if (!global.fetch) {
    global.fetch = async () => {
      throw new Error('global.fetch is not mocked in tests');
    };
  }
}

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
