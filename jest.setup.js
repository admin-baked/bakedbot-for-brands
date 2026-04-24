// Jest setup file for testing
// Runs before all tests

// Add custom matchers from jest-dom
import '@testing-library/jest-dom';
// import './src/tests/mocks/lucide-react.tsx';


// Polyfill TextEncoder/TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Polyfill ReadableStream/WritableStream/TransformStream for jsdom (required by undici/fetch)
if (typeof ReadableStream === 'undefined') {
  const streamWeb = require('stream/web');
  global.ReadableStream = streamWeb.ReadableStream;
  global.WritableStream = streamWeb.WritableStream;
  global.TransformStream = streamWeb.TransformStream;
}

// Polyfill MessageChannel/MessagePort for jsdom (required by undici)
if (typeof MessagePort === 'undefined') {
  const { MessageChannel, MessagePort } = require('worker_threads');
  global.MessageChannel = MessageChannel;
  global.MessagePort = MessagePort;
}

// Polyfill setImmediate for jsdom environment (exists in Node but not jsdom)
if (typeof setImmediate === 'undefined') {
  global.setImmediate = (fn, ...args) => setTimeout(fn, 0, ...args);
  global.clearImmediate = (id) => clearTimeout(id);
}

// Polyfill window.matchMedia for jsdom (used by responsive hooks and media queries)
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

// Polyfill localStorage for jsdom (some tests use it directly)
if (typeof window !== 'undefined') {
  const store = new Map();
  const localStorageMock = {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => store.set(key, String(value)),
    removeItem: (key) => store.delete(key),
    clear: () => store.clear(),
    get length() { return store.size; },
    key: (index) => Array.from(store.keys())[index] ?? null,
  };
  try {
    Object.defineProperty(window, 'localStorage', { value: localStorageMock, writable: true });
  } catch (_) {
    // jsdom may already define it — replace it anyway
    window.localStorage = localStorageMock;
  }
}

// Polyfill ResizeObserver (used by @radix-ui/react-use-size and similar)
if (typeof ResizeObserver === 'undefined') {
  global.ResizeObserver = class ResizeObserver {
    constructor(callback) { this._callback = callback; }
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

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

// Patch web API globals that jsdom may not implement fully
// ─── Response.json() static (factory method, missing in jsdom < 20.0.3) ───────
if (typeof Response !== 'undefined' && !Response.json) {
    Response.json = function(body, init) {
        return new Response(
            JSON.stringify(body),
            { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers || {}) } }
        );
    };
}

// ─── Request.prototype.json() (may be missing in older jsdom) ─────────────────
if (typeof Request !== 'undefined' && !Request.prototype.json) {
    Request.prototype.json = async function() {
        const text = await this.text();
        return JSON.parse(text);
    };
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
        defineTool: jest.fn(() => jest.fn()),
        defineModel: jest.fn(() => jest.fn()),
        defineRetriever: jest.fn(() => jest.fn()),
    })),
    Genkit: jest.fn(),
    tool: jest.fn((_config, impl) => impl),
    z: require('zod'),
}));

// Mock next/headers to prevent "cookies() called outside request scope"
jest.mock('next/headers', () => ({
    cookies: jest.fn(() => ({
        get: jest.fn(),
        getAll: jest.fn(() => []),
        set: jest.fn(),
        delete: jest.fn(),
        has: jest.fn(() => false),
        toString: jest.fn(() => ''),
    })),
    headers: jest.fn(() => new Map()),
}));

// Mock @/firebase/provider to prevent "useFirebase must be used within FirebaseProvider"
jest.mock('@/firebase/provider', () => {
    const React = require('react');
    const FirebaseContext = React.createContext(undefined);
    return {
        useFirebase: jest.fn(() => ({
            auth: null,
            firestore: null,
            user: null,
            loading: false,
        })),
        FirebaseProvider: ({ children }) => children,
        FirebaseContext,
    };
});

// Mock @/firebase/auth/use-user to provide default test user
jest.mock('@/firebase/auth/use-user', () => ({
    useUser: jest.fn(() => ({
        user: { uid: 'test-uid', email: 'test@example.com', role: 'brand_admin', orgId: 'org_test' },
        loading: false,
    })),
}));

// Mock next/navigation to prevent "app router not mounted" and "router.replace is not a function"
jest.mock('next/navigation', () => ({
    useRouter: jest.fn(() => ({
        push: jest.fn(),
        replace: jest.fn(),
        back: jest.fn(),
        forward: jest.fn(),
        refresh: jest.fn(),
        prefetch: jest.fn(),
    })),
    useSearchParams: jest.fn(() => new URLSearchParams()),
    usePathname: jest.fn(() => '/'),
    useParams: jest.fn(() => ({})),
    redirect: jest.fn(),
    notFound: jest.fn(),
}));

// Mock next/server — NextRequest/NextResponse for API route tests
jest.mock('next/server', () => {
    class MockNextRequest {
        constructor(input, init = {}) {
            const url = typeof input === 'string' ? input : input?.url || 'http://localhost:3000/';
            this._url = url;
            this.method = (init.method || 'GET').toUpperCase();
            this.headers = new Map(Object.entries(init.headers || {}));
            this.body = init.body || null;
            this.nextUrl = new URL(url);
            this.cookies = { get: jest.fn(), getAll: jest.fn(() => []), set: jest.fn(), delete: jest.fn(), has: jest.fn(() => false) };
            this.geo = {};
            this.ip = '127.0.0.1';
        }
        get url() { return this._url; }
        set url(v) { this._url = v; this.nextUrl = new URL(v); }
        async json() { return typeof this.body === 'string' ? JSON.parse(this.body) : this.body; }
        async text() { return typeof this.body === 'string' ? this.body : JSON.stringify(this.body ?? ''); }
    }
    const MockNextResponse = {
        json: (body, init) => ({ status: init?.status || 200, headers: new Map(), json: async () => body, body }),
        redirect: (url) => ({ status: 307, headers: new Map([['location', String(url)]]) }),
        next: () => ({ status: 200 }),
    };
    return { NextRequest: MockNextRequest, NextResponse: MockNextResponse };
});

// Auth mocks: NOT set globally — individual test files mock @/server/auth/auth
// and @/server/auth/api-key-auth themselves. Global mocks here would conflict
// with per-test factories that need specific return values.

// Mock the internal Genkit instance creator to bypass Proxy issues in tests
jest.mock('@/ai/genkit', () => ({
    ai: {
        generate: jest.fn().mockResolvedValue({ text: () => 'mock response', output: () => null }),
        definePrompt: jest.fn(() => jest.fn()),
        defineFlow: jest.fn(() => jest.fn()),
        defineTool: jest.fn((_config, impl) => impl),
        defineModel: jest.fn(() => jest.fn()),
        defineRetriever: jest.fn(() => jest.fn()),
    },
    googleAI: jest.fn(() => () => ({})),
}));

// Mock react-syntax-highlighter to avoid ESM/CJS issues with refractor
jest.mock('react-syntax-highlighter', () => ({
    Prism: ({ children }) => <pre>{children}</pre>,
    Light: ({ children }) => <pre>{children}</pre>,
}));

jest.mock('react-syntax-highlighter/dist/cjs/styles/prism', () => ({
    oneDark: {},
    vscDarkPlus: {},
}));

jest.mock('react-syntax-highlighter/dist/esm/styles/prism', () => ({
    oneDark: {},
    oneLight: {},
}));

// Mock Anthropic SDK
jest.mock('@anthropic-ai/sdk', () => {
    return jest.fn().mockImplementation(() => ({
        messages: {
            create: jest.fn().mockResolvedValue({
                content: [{ type: 'text', text: 'Anthropic mock response' }],
            }),
        },
    }));
});

// Mock Firecrawl SDK
const mockFirecrawl = {
    search: jest.fn().mockResolvedValue({ success: true, data: [] }),
    scrapeUrl: jest.fn().mockResolvedValue({ success: true, data: { markdown: '# Mock Content' } }),
    crawlUrl: jest.fn().mockResolvedValue({ success: true, jobId: 'mock-job-id' }),
    checkCrawlStatus: jest.fn().mockResolvedValue({ success: true, status: 'completed', data: [] }),
};

jest.mock('@mendable/firecrawl-js', () => {
    return jest.fn().mockImplementation(() => mockFirecrawl);
});

jest.mock('@firecrawl/firecrawl-js', () => {
    return jest.fn().mockImplementation(() => mockFirecrawl);
});

// Mock discovery service (singleton)
jest.mock('@/server/services/firecrawl', () => {
    const mockDiscovery = {
        discoverUrl: jest.fn().mockResolvedValue({ success: true, markdown: 'Mock content' }),
        discoverWithActions: jest.fn().mockResolvedValue({ success: true, markdown: 'Mock content' }),
        search: jest.fn().mockResolvedValue([]),
        mapSite: jest.fn().mockResolvedValue({ success: true, links: [] }),
        extractData: jest.fn().mockResolvedValue({}),
        getRemainingCredits: jest.fn().mockResolvedValue(1000),
        hasCreditBudget: jest.fn().mockResolvedValue(true),
        isConfigured: jest.fn().mockReturnValue(true),
        runAgent: jest.fn().mockResolvedValue({ success: true, data: 'Mock agent result' })
    };
    return {
        DiscoveryService: {
            getInstance: jest.fn(() => mockDiscovery)
        },
        discovery: mockDiscovery
    };
});

// Comprehensive Lucide-React mock
jest.mock('lucide-react', () => {
    const React = require('react');
    const mockIcon = (name) => {
        const Icon = (props) => React.createElement('svg', { ...props, 'data-lucide': name });
        Icon.displayName = name;
        return Icon;
    };

    return new Proxy({}, {
        get: (target, name) => {
            if (name === '__esModule') return true;
            return mockIcon(name);
        }
    });
});

