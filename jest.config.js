// [AI-THREAD P0-TEST-DEEBO-AGENT]
// [Dev1-Claude @ 2025-11-29]:
//   Created Jest configuration for unit testing.
//   Supports TypeScript, path aliases (@/), and Next.js environment.

const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  roots: ['<rootDir>/src', '<rootDir>/tests', '<rootDir>/cloud-run'],
  modulePathIgnorePatterns: [
    '<rootDir>[\\\\/](?:\\.next|usr|\\.firebase|coverage|dist|\\.w)[\\\\/]',
  ],
  moduleNameMapper: {
    // Specific mocks (Must come before generic aliases)
    '^@/ai/genkit$': '<rootDir>/tests/__mocks__/ai-genkit.ts',
    // next/jest + SWC can rewrite `@/ai/genkit` imports to relative paths in output (e.g. "../../../ai/genkit").
    // Map those forms too so tests can consistently mock `ai.generate`.
    '^(?:\\.\\./)+(?:src/)?ai/genkit$': '<rootDir>/tests/__mocks__/ai-genkit.ts',
    '^@/ai/model-selector$': '<rootDir>/tests/__mocks__/model-selector.ts',
    '^@genkit-ai/vertexai$': '<rootDir>/tests/__mocks__/genkit-vertexai.js',
    '^@genkit-ai/googleai$': '<rootDir>/tests/__mocks__/genkit-googleai.js',
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',
    '^@upstash/redis$': '<rootDir>/tests/__mocks__/upstash-redis.js',
    '^@upstash/ratelimit$': '<rootDir>/tests/__mocks__/upstash-ratelimit.js',

    // Stub mappings for modules that no longer exist at these paths
    // Both @/ alias forms and relative path forms (next/jest can rewrite @/ to relative)
    '^@/server/services/alpine-iq$': '<rootDir>/tests/__mocks__/alpine-iq.js',
    '^(?:\\.\\./)+(?:src/)?server/services/alpine-iq$': '<rootDir>/tests/__mocks__/alpine-iq.js',
    '^@/server/services/agent-delegation$': '<rootDir>/tests/__mocks__/agent-delegation.js',
    '^(?:\\.\\./)+(?:src/)?server/services/agent-delegation$': '<rootDir>/tests/__mocks__/agent-delegation.js',
    '^@/server/services/api-key-manager$': '<rootDir>/tests/__mocks__/api-key-manager.js',
    '^(?:\\.\\./)+(?:src/)?server/services/api-key-manager$': '<rootDir>/tests/__mocks__/api-key-manager.js',
    '^@/server/services/headset$': '<rootDir>/tests/__mocks__/headset.js',
    '^(?:\\.\\./)+(?:src/)?server/services/headset$': '<rootDir>/tests/__mocks__/headset.js',
    '^@/server/services/scheduling-manager$': '<rootDir>/tests/__mocks__/scheduling-manager.js',
    '^(?:\\.\\./)+(?:src/)?server/services/scheduling-manager$': '<rootDir>/tests/__mocks__/scheduling-manager.js',
    '^@/server/services/social-manager$': '<rootDir>/tests/__mocks__/social-manager.js',
    '^(?:\\.\\./)+(?:src/)?server/services/social-manager$': '<rootDir>/tests/__mocks__/social-manager.js',
    '^@/lib/firebase$': '<rootDir>/tests/__mocks__/lib-firebase.js',
    '^(?:\\.\\./)+(?:src/)?lib/firebase$': '<rootDir>/tests/__mocks__/lib-firebase.js',
    '^@/lib/firebase/admin$': '<rootDir>/tests/__mocks__/lib-firebase-admin.js',
    '^(?:\\.\\./)+(?:src/)?lib/firebase/admin$': '<rootDir>/tests/__mocks__/lib-firebase-admin.js',
    '^@coinbase/coinbase-sdk$': '<rootDir>/tests/__mocks__/coinbase-sdk.js',
    // Force cheerio CJS (jsdom env picks browser/ESM entry via exports map)
    '^cheerio$': '<rootDir>/node_modules/cheerio/dist/commonjs/index.js',
    // Mock @react-pdf/renderer (ESM, no CJS build)
    '^@react-pdf/renderer$': '<rootDir>/tests/__mocks__/react-pdf-renderer.js',
    '^@react-pdf/(.*)$': '<rootDir>/tests/__mocks__/react-pdf-renderer.js',
    // Mock react-syntax-highlighter (uses refractor which is ESM-only)
    '^react-syntax-highlighter$': '<rootDir>/tests/__mocks__/react-syntax-highlighter.js',
    '^react-syntax-highlighter/(.*)$': '<rootDir>/tests/__mocks__/react-syntax-highlighter.js',
    // Force nanoid CJS (jsdom picks browser/ESM entry via exports map)
    '^nanoid$': '<rootDir>/node_modules/nanoid/index.cjs',
    '^nanoid/(.*)$': '<rootDir>/node_modules/nanoid/index.cjs',
    // Mock ccxt (crypto exchange library — does Uint8Array crypto at module load, fails in jsdom)
    '^ccxt$': '<rootDir>/tests/__mocks__/ccxt.js',
    '^ccxt/(.*)$': '<rootDir>/tests/__mocks__/ccxt.js',

    // Relocated / Missing modules
    '^@/lib/firebase$': '<rootDir>/src/firebase/admin.ts',
    '^@/server/services/api-key-manager$': '<rootDir>/src/server/auth/api-key-auth.ts',

    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-markdown$': '<rootDir>/tests/__mocks__/react-markdown.js',
    '^remark-gfm$': '<rootDir>/tests/__mocks__/remark-gfm.js',
    '^server-only$': '<rootDir>/tests/__mocks__/server-only.js',
    '^lucide-react$': '<rootDir>/tests/__mocks__/lucide-react.js',
    '^yaml$': '<rootDir>/tests/__mocks__/yaml.js',
    '^jsonpath-plus$': '<rootDir>/tests/__mocks__/jsonpath-plus.js',
    '^livekit-server-sdk$': '<rootDir>/tests/__mocks__/livekit-server-sdk.js',
    '^@mendable/firecrawl-js$': '<rootDir>/tests/__mocks__/firecrawl-sdk.js',
    '^@firecrawl/firecrawl-js$': '<rootDir>/tests/__mocks__/firecrawl-sdk.js',
    '^@testing-library/user-event$': '<rootDir>/tests/__mocks__/user-event.js',
  },
  testEnvironment: 'jsdom',
  testPathIgnorePatterns: [
    '<rootDir>[\\\\/](?:\\.next|node_modules|usr|\\.firebase|coverage|dist|\\.w)[\\\\/]',
    '<rootDir>/tests/e2e/',
    '<rootDir>/tests/firestore-rules/',
    '<rootDir>/cloud-run/',
    '<rootDir>/tests/chat/thinking.test.ts', // Deprecated
    '<rootDir>/tests/chat/chat-history.test.ts', // Deprecated
    '<rootDir>/tests/components/chat-vibe-logic.test.tsx', // Deprecated
    '<rootDir>/tests/integration/', // Skip long integration tests by default
  ],
  watchPathIgnorePatterns: ['<rootDir>[\\\\/]\\.w[\\\\/]'],
  testMatch: [
    '**/tests/**/*.spec.ts',
    '**/tests/**/*.spec.tsx',
    '**/tests/**/*.test.ts',
    '**/tests/**/*.test.tsx',
    '**/__tests__/**/*.spec.ts',
    '**/__tests__/**/*.spec.tsx',
    '**/__tests__/**/*.test.ts',
    '**/__tests__/**/*.test.tsx',
  ],
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/**/__tests__/**',
  ],
  transformIgnorePatterns: [
    'node_modules/(?!(uuid|firebase|@firebase|firebase-admin|jwks-rsa|react-markdown|remark-gfm|micromark|unist|hast|mdast|rehype|remark|vfile|bail|trough|unified|is-plain-obj|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities|ccount|escape-string-regexp|markdown-table|longest-streak|lucide-react|@genkit-ai|genkit|dotprompt|zod|yaml|jsonpath-plus|google-auth-library|google-gax|googleapis|gaxios|jose|livekit-server-sdk|nanoid|cheerio|parse5|htmlparser2|dom-serializer|entities|domhandler|domutils|css-select|css-what|nth-check|boolbase|refractor|react-syntax-highlighter|hastscript|zwitch|html-void-elements|@testing-library)/)',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig)
