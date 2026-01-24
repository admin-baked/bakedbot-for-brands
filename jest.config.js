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
  modulePathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/usr/', '<rootDir>/.firebase', '<rootDir>/coverage/', '<rootDir>/dist/'],
  moduleNameMapper: {
    // Specific mocks (Must come before generic aliases)
    '^@/ai/genkit$': '<rootDir>/tests/__mocks__/genkit.ts',
    '^@/ai/model-selector$': '<rootDir>/tests/__mocks__/model-selector.ts',
    '^@genkit-ai/vertexai$': '<rootDir>/tests/__mocks__/genkit-vertexai.js',
    '^uuid$': '<rootDir>/tests/__mocks__/uuid.js',

    // Handle module aliases (this will be automatically configured for you soon)
    '^@/(.*)$': '<rootDir>/src/$1',
    '^react-markdown$': '<rootDir>/tests/__mocks__/react-markdown.js',
    '^remark-gfm$': '<rootDir>/tests/__mocks__/remark-gfm.js',
    '^server-only$': '<rootDir>/tests/__mocks__/server-only.js',
    '^lucide-react$': '<rootDir>/tests/__mocks__/lucide-react.js',
    '^yaml$': '<rootDir>/tests/__mocks__/yaml.js',
    '^jsonpath-plus$': '<rootDir>/tests/__mocks__/jsonpath-plus.js',
  },
  testEnvironment: 'jsdom',
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
    'node_modules/(?!(uuid|firebase|@firebase|firebase-admin|jwks-rsa|react-markdown|remark-gfm|micromark|unist|hast|mdast|rehype|remark|vfile|bail|trough|unified|is-plain-obj|property-information|space-separated-tokens|comma-separated-tokens|decode-named-character-reference|character-entities|ccount|escape-string-regexp|markdown-table|longest-streak|lucide-react|@genkit-ai|genkit|dotprompt|zod|yaml|jsonpath-plus|google-auth-library|google-gax|googleapis|gaxios)/)',
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
