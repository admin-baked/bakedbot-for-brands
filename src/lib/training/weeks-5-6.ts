/**
 * Week 5-6 Challenges
 * AI Agents, Genkit, and Testing
 */

import type { TrainingChallenge } from '@/types/training';

/**
 * Week 5 Challenges - AI Agents & Genkit
 */
export const WEEK_5_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: First Agent Tool
    {
        id: 'week5-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 5,
        order: 1,
        title: 'Create Your First Agent Tool',
        description: 'Build a custom Genkit tool for BakedBot agents',
        difficulty: 'intermediate',
        instructions: `# Challenge: Create Your First Agent Tool

Learn to build custom tools that BakedBot agents can use.

## Learning Objectives
- Understand Genkit tool architecture
- Define tool schemas with Zod
- Implement tool handlers
- Test tools with agents

## Requirements
Create a tool \`getProductStock\` in \`src/server/tools/inventory.ts\` that:

1. Accepts a product ID
2. Queries Firestore for inventory data
3. Returns stock level and location
4. Includes proper error handling
5. Uses Zod for input validation

## Tool Schema
\`\`\`typescript
const GetProductStockSchema = z.object({
  productId: z.string().describe('The unique product ID'),
  locationId: z.string().optional().describe('Optional location filter'),
});
\`\`\`

## Expected Output
\`\`\`json
{
  "productId": "prod_123",
  "stockLevel": 42,
  "location": "warehouse-a",
  "lastUpdated": "2026-02-09T10:00:00Z"
}
\`\`\`

## Tips
- Use \`defineTool()\` from Genkit
- Tool handlers are async functions
- Return structured data that agents can parse
- Add descriptive schema fields for AI understanding
`,
        starterCode: `import { defineTool } from '@genkit-ai/ai';
import { z } from 'zod';
import { getAdminFirestore } from '@/firebase/admin';

// Define your schema
const GetProductStockSchema = z.object({
  // Your schema here
});

// Define the tool
export const getProductStock = defineTool({
  name: 'getProductStock',
  description: 'Get current stock level for a product',
  inputSchema: GetProductStockSchema,
  outputSchema: z.object({
    // Your output schema
  }),
}, async (input) => {
  // Your implementation
});`,
        hints: [
            'Use defineTool from @genkit-ai/ai',
            'Query Firestore: db.collection("inventory").doc(productId).get()',
            'Add .describe() to schema fields for better AI understanding',
            'Test with a simple agent that calls your tool',
        ],
        referenceDocs: [
            { title: 'Agents Reference', url: '/.agent/refs/agents.md' },
            { title: 'Genkit Tools Docs', url: 'https://firebase.google.com/docs/genkit/tool-calling' },
        ],
        reviewCriteria: [
            { category: 'Tool Definition', weight: 0.4, description: 'Correct Genkit tool structure' },
            { category: 'Schema Design', weight: 0.3, description: 'Well-defined input/output schemas' },
            { category: 'Error Handling', weight: 0.2, description: 'Handles missing data gracefully' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean and documented' },
        ],
        estimatedMinutes: 60,
        tags: ['ai', 'genkit', 'tools', 'agents'],
        isRequired: true,
    },

    // Challenge 2: Simple Agent
    {
        id: 'week5-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 5,
        order: 2,
        title: 'Build a Simple Agent',
        description: 'Create a basic BakedBot agent with tools and prompts',
        difficulty: 'intermediate',
        instructions: `# Challenge: Build a Simple Agent

Create a simple inventory assistant agent using Genkit.

## Requirements
Create \`inventory-agent.ts\` that:

1. Uses the Gemini model
2. Has a clear system prompt
3. Can call your \`getProductStock\` tool
4. Returns helpful inventory insights
5. Handles tool call errors gracefully

## Agent Prompt
The agent should:
- Act as a helpful inventory assistant
- Always check stock before answering
- Provide specific numbers and locations
- Suggest alternatives if out of stock

## Example Usage
\`\`\`typescript
const result = await runInventoryAgent({
  query: "Do we have any Blue Dream in stock?"
});

// Expected response:
// "Yes! We have 42 units of Blue Dream in warehouse-a.
//  Last updated 2 hours ago."
\`\`\`

## Agent Structure
\`\`\`typescript
export const inventoryAgent = defineAgent({
  name: 'inventoryAgent',
  model: gemini15Flash,
  tools: [getProductStock],
  systemPrompt: \`...\`,
});
\`\`\`
`,
        starterCode: `import { defineAgent } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/googleai';
import { getProductStock } from '@/server/tools/inventory';

export const inventoryAgent = defineAgent({
  name: 'inventoryAgent',
  description: 'Helps check product inventory',
  model: gemini15Flash,
  tools: [getProductStock],
  systemPrompt: \`
    // Your system prompt here
  \`,
});

// Helper function to run the agent
export async function runInventoryAgent(input: { query: string }) {
  // Your implementation
}`,
        hints: [
            'System prompts guide agent behavior',
            'Agents automatically decide when to call tools',
            'Parse agent responses for structured data',
            'Test with multiple product queries',
        ],
        referenceDocs: [
            { title: 'Agents Reference', url: '/.agent/refs/agents.md' },
            { title: 'Genkit Agents', url: 'https://firebase.google.com/docs/genkit/agents' },
        ],
        reviewCriteria: [
            { category: 'Agent Design', weight: 0.4, description: 'Well-structured agent with clear purpose' },
            { category: 'Tool Integration', weight: 0.3, description: 'Correctly calls and uses tools' },
            { category: 'Prompt Engineering', weight: 0.2, description: 'Effective system prompt' },
            { category: 'Error Handling', weight: 0.1, description: 'Handles failures gracefully' },
        ],
        estimatedMinutes: 75,
        tags: ['ai', 'genkit', 'agents', 'prompts'],
        isRequired: true,
    },

    // Challenge 3: Agent with Multiple Tools
    {
        id: 'week5-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 5,
        order: 3,
        title: 'Multi-Tool Agent',
        description: 'Create an agent that uses multiple tools intelligently',
        difficulty: 'advanced',
        instructions: `# Challenge: Multi-Tool Agent

Build an agent that can use multiple tools to solve complex queries.

## Requirements
Create a customer service agent that can:

1. Check inventory (existing tool)
2. Look up order status (new tool)
3. Find customer details (new tool)
4. Recommend products (new tool)
5. Decide which tools to call based on query

## New Tools to Create

### 1. getOrderStatus
- Input: orderId
- Output: order details, status, tracking

### 2. getCustomerInfo
- Input: email or phone
- Output: customer profile, order history

### 3. recommendProducts
- Input: preferences, budget
- Output: list of recommended products

## Agent Behavior
The agent should:
- Analyze the customer query
- Call appropriate tools in sequence
- Combine information from multiple tools
- Provide comprehensive answers

## Example Query
\`\`\`
Query: "I'm looking for a product similar to what I ordered last time,
       do you have it in stock?"

Agent should:
1. Call getCustomerInfo to find past orders
2. Extract product from last order
3. Call recommendProducts with similar criteria
4. Call getProductStock to check availability
5. Provide comprehensive answer
\`\`\`
`,
        starterCode: `import { defineAgent, defineTool } from '@genkit-ai/ai';
import { z } from 'zod';

// Define your tools
export const getOrderStatus = defineTool({
  // Your implementation
});

export const getCustomerInfo = defineTool({
  // Your implementation
});

export const recommendProducts = defineTool({
  // Your implementation
});

// Define the multi-tool agent
export const customerServiceAgent = defineAgent({
  name: 'customerServiceAgent',
  model: gemini15Flash,
  tools: [
    getProductStock,
    getOrderStatus,
    getCustomerInfo,
    recommendProducts,
  ],
  systemPrompt: \`...\`,
});`,
        hints: [
            'Agents automatically chain tool calls',
            'System prompt should explain tool purposes',
            'Test with queries that need multiple tools',
            'Tools should return consistent schema formats',
        ],
        referenceDocs: [
            { title: 'Agents Reference', url: '/.agent/refs/agents.md' },
            { title: 'Tool Chaining', url: 'https://firebase.google.com/docs/genkit/tool-calling#chaining' },
        ],
        reviewCriteria: [
            { category: 'Tool Design', weight: 0.3, description: 'All 3 new tools implemented correctly' },
            { category: 'Agent Logic', weight: 0.3, description: 'Agent chains tools appropriately' },
            { category: 'Query Handling', weight: 0.2, description: 'Handles complex queries well' },
            { category: 'Code Quality', weight: 0.2, description: 'Clean, modular, testable' },
        ],
        estimatedMinutes: 90,
        tags: ['ai', 'agents', 'tools', 'advanced'],
        isRequired: true,
    },

    // Challenge 4: Agent with Claude API
    {
        id: 'week5-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 5,
        order: 4,
        title: 'Use Claude API Directly',
        description: 'Integrate with Claude using the Anthropic SDK',
        difficulty: 'advanced',
        instructions: `# Challenge: Use Claude API Directly

Learn to use Claude (Anthropic API) for advanced reasoning tasks.

## Learning Objectives
- Understand when to use Claude vs Gemini
- Use Anthropic SDK
- Implement tool use with Claude
- Handle streaming responses

## Requirements
Create \`analyzeCustomerIntent.ts\` that:

1. Uses Claude Sonnet 4.5 via Anthropic SDK
2. Analyzes customer messages for intent
3. Extracts structured data (intent, sentiment, urgency)
4. Returns actionable insights
5. Uses tool calling if needed

## Claude vs Gemini
**Use Claude for:**
- Complex reasoning
- Code analysis
- Content generation
- Advanced tool use

**Use Gemini for:**
- Simple queries
- Fast responses
- Cost-effective operations

## Implementation
\`\`\`typescript
import Anthropic from '@anthropic-ai/sdk';

export async function analyzeCustomerIntent(message: string) {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: message,
    }],
    tools: [/* your tools */],
  });

  return parseIntent(response);
}
\`\`\`

## Output Schema
\`\`\`typescript
{
  intent: 'product_inquiry' | 'order_status' | 'complaint' | 'general',
  sentiment: 'positive' | 'neutral' | 'negative',
  urgency: 'low' | 'medium' | 'high',
  entities: {
    products?: string[],
    orderId?: string,
    ...
  }
}
\`\`\`
`,
        starterCode: `import Anthropic from '@anthropic-ai/sdk';
import { z } from 'zod';

const IntentSchema = z.object({
  intent: z.enum(['product_inquiry', 'order_status', 'complaint', 'general']),
  sentiment: z.enum(['positive', 'neutral', 'negative']),
  urgency: z.enum(['low', 'medium', 'high']),
  entities: z.object({
    products: z.array(z.string()).optional(),
    orderId: z.string().optional(),
  }),
});

export async function analyzeCustomerIntent(message: string) {
  // Your implementation
}`,
        hints: [
            'Use Anthropic SDK: npm install @anthropic-ai/sdk',
            'Claude excels at structured output',
            'Use system prompts to define output format',
            'Parse tool use responses from Claude',
        ],
        referenceDocs: [
            { title: 'Claude Code Wrapper', url: '/src/ai/claude.ts' },
            { title: 'Anthropic Docs', url: 'https://docs.anthropic.com' },
        ],
        reviewCriteria: [
            { category: 'Claude Integration', weight: 0.4, description: 'Correct use of Anthropic SDK' },
            { category: 'Intent Analysis', weight: 0.3, description: 'Accurate intent extraction' },
            { category: 'Schema Validation', weight: 0.2, description: 'Validates output with Zod' },
            { category: 'Error Handling', weight: 0.1, description: 'Handles API errors' },
        ],
        estimatedMinutes: 75,
        tags: ['ai', 'claude', 'anthropic', 'intent'],
        isRequired: true,
    },

    // Challenge 5: BakedBot Agent Squad
    {
        id: 'week5-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 5,
        order: 5,
        title: 'Understand the Agent Squad',
        description: 'Explore BakedBot\'s multi-agent architecture',
        difficulty: 'advanced',
        instructions: `# Challenge: Understand the Agent Squad

Learn how BakedBot's specialized agents work together.

## Learning Objectives
- Understand multi-agent architecture
- Study existing BakedBot agents
- See how agents delegate tasks
- Build a simple orchestration system

## BakedBot Agent Squad
1. **Linus** (CTO) - Code eval, deployment, bug fixing
2. **Leo** (COO) - Operations orchestration
3. **Smokey** (Budtender) - Product recommendations
4. **Craig** (Marketer) - SMS/Email campaigns
5. **Ezal** (Lookout) - Competitive intelligence
6. **Deebo** (Enforcer) - Compliance monitoring

## Your Task
Create a simple orchestrator that:

1. Analyzes incoming requests
2. Determines which agent(s) to invoke
3. Calls appropriate agents
4. Combines results
5. Returns unified response

## Orchestration Logic
\`\`\`typescript
type Request = {
  type: 'product' | 'order' | 'marketing' | 'compliance';
  payload: unknown;
};

function routeToAgent(request: Request) {
  switch (request.type) {
    case 'product': return callSmokey(request.payload);
    case 'marketing': return callCraig(request.payload);
    // ... etc
  }
}
\`\`\`

## Study These Agents
Read and understand:
- \`src/server/agents/linus.ts\`
- \`src/server/agents/smokey.ts\`
- \`src/server/agents/craig.ts\`

## Submission
Create a document explaining:
1. How each agent specializes
2. When to use each agent
3. How they coordinate
4. Your orchestrator implementation
`,
        starterCode: `// 1. Study existing agents
// 2. Create your orchestrator

import { callAgent } from '@/server/agents/harness';

type AgentRequest = {
  type: 'product' | 'order' | 'marketing' | 'compliance';
  query: string;
  context?: Record<string, unknown>;
};

export async function orchestrateAgents(request: AgentRequest) {
  // Your orchestration logic
}`,
        hints: [
            'Read .agent/refs/agents.md for architecture overview',
            'Look at harness.ts for agent invocation patterns',
            'Each agent has specialized tools',
            'Agents can call other agents for complex tasks',
        ],
        referenceDocs: [
            { title: 'Agents Reference', url: '/.agent/refs/agents.md' },
            { title: 'Agent Harness', url: '/src/server/agents/harness.ts' },
        ],
        reviewCriteria: [
            { category: 'Understanding', weight: 0.4, description: 'Demonstrates understanding of agent roles' },
            { category: 'Orchestration', weight: 0.3, description: 'Correct routing logic' },
            { category: 'Implementation', weight: 0.2, description: 'Working orchestrator code' },
            { category: 'Documentation', weight: 0.1, description: 'Clear explanation document' },
        ],
        estimatedMinutes: 90,
        tags: ['ai', 'agents', 'architecture', 'orchestration'],
        isRequired: false,
    },
];

/**
 * Week 6 Challenges - Testing & Quality Assurance
 */
export const WEEK_6_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: Unit Tests with Jest
    {
        id: 'week6-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 6,
        order: 1,
        title: 'Write Your First Unit Tests',
        description: 'Test utility functions with Jest',
        difficulty: 'beginner',
        instructions: `# Challenge: Write Your First Unit Tests

Learn to write unit tests for utility functions.

## Learning Objectives
- Set up Jest test files
- Write test cases with expect()
- Use describe() and test() blocks
- Run tests and interpret results

## Requirements
Create tests for a utility function \`formatPrice()\`:

\`\`\`typescript
// src/lib/utils/price.ts
export function formatPrice(cents: number, currency = 'USD'): string {
  const dollars = cents / 100;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(dollars);
}
\`\`\`

## Test Cases to Write
1. Formats $1.00 correctly
2. Formats $0.99 correctly
3. Handles large numbers
4. Supports different currencies
5. Handles zero
6. Handles negative numbers

## Expected Test File
\`\`\`typescript
// tests/lib/utils/price.test.ts
import { formatPrice } from '@/lib/utils/price';

describe('formatPrice', () => {
  test('formats dollars and cents correctly', () => {
    expect(formatPrice(100)).toBe('$1.00');
  });

  // More tests...
});
\`\`\`

## Running Tests
\`\`\`powershell
npm test price.test.ts
\`\`\`
`,
        starterCode: `import { formatPrice } from '@/lib/utils/price';

describe('formatPrice', () => {
  test('formats dollars and cents correctly', () => {
    // Your test here
  });

  test('handles cents under a dollar', () => {
    // Your test here
  });

  // Add more tests
});`,
        hints: [
            'Use describe() to group related tests',
            'Use test() or it() for individual test cases',
            'expect().toBe() for exact matches',
            'expect().toEqual() for objects/arrays',
        ],
        referenceDocs: [
            { title: 'Testing Reference', url: '/.agent/refs/testing.md' },
            { title: 'Jest Docs', url: 'https://jestjs.io/docs/getting-started' },
        ],
        reviewCriteria: [
            { category: 'Test Coverage', weight: 0.4, description: 'Tests all edge cases' },
            { category: 'Test Structure', weight: 0.3, description: 'Well-organized with describe/test' },
            { category: 'Assertions', weight: 0.2, description: 'Correct use of expect()' },
            { category: 'Clarity', weight: 0.1, description: 'Clear test descriptions' },
        ],
        estimatedMinutes: 45,
        tags: ['testing', 'jest', 'unit-tests'],
        isRequired: true,
    },

    // Challenge 2: Testing Server Actions
    {
        id: 'week6-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 6,
        order: 2,
        title: 'Test Server Actions',
        description: 'Write tests for Server Actions with mocked Firestore',
        difficulty: 'intermediate',
        instructions: `# Challenge: Test Server Actions

Learn to test Server Actions with proper mocking.

## Learning Objectives
- Mock Firestore operations
- Test auth requirements
- Verify error handling
- Test success and failure paths

## Requirements
Write tests for a Server Action \`createProduct\`:

\`\`\`typescript
export async function createProduct(input: unknown) {
  const user = await requireUser(['brand', 'super_user']);
  const validated = ProductSchema.parse(input);
  const db = getAdminFirestore();

  await db.collection('products').add({
    ...validated,
    userId: user.uid,
    createdAt: Timestamp.now(),
  });

  return { success: true };
}
\`\`\`

## Test Cases
1. Creates product when authenticated
2. Rejects when not authenticated
3. Validates input with Zod
4. Saves to Firestore correctly
5. Returns proper ActionResult
6. Handles Firestore errors

## Mocking Strategy
\`\`\`typescript
jest.mock('@/firebase/admin');
jest.mock('@/server/auth/auth');

const mockDb = {
  collection: jest.fn(() => ({
    add: jest.fn(),
  })),
};

(getAdminFirestore as jest.Mock).mockReturnValue(mockDb);
\`\`\`
`,
        starterCode: `import { createProduct } from '@/app/actions/products';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

jest.mock('@/firebase/admin');
jest.mock('@/server/auth/auth');

describe('createProduct', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('creates product when authenticated', async () => {
    // Mock authenticated user
    (requireUser as jest.Mock).mockResolvedValue({ uid: 'user123' });

    // Mock Firestore
    const mockAdd = jest.fn().mockResolvedValue({ id: 'prod123' });
    (getAdminFirestore as jest.Mock).mockReturnValue({
      collection: jest.fn(() => ({ add: mockAdd })),
    });

    // Test
    const result = await createProduct({
      name: 'Test Product',
      price: 2999,
      category: 'flower',
    });

    expect(result.success).toBe(true);
    expect(mockAdd).toHaveBeenCalled();
  });

  // Add more tests
});`,
        hints: [
            'Mock external dependencies in beforeEach()',
            'Use jest.clearAllMocks() between tests',
            'Test both success and error paths',
            'Verify Firestore methods were called correctly',
        ],
        referenceDocs: [
            { title: 'Testing Reference', url: '/.agent/refs/testing.md' },
            { title: 'Jest Mocking', url: 'https://jestjs.io/docs/mock-functions' },
        ],
        reviewCriteria: [
            { category: 'Mocking', weight: 0.4, description: 'Proper mocks for Firestore and auth' },
            { category: 'Coverage', weight: 0.3, description: 'Tests all paths (success/error)' },
            { category: 'Assertions', weight: 0.2, description: 'Verifies behavior correctly' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean, maintainable tests' },
        ],
        estimatedMinutes: 60,
        tags: ['testing', 'server-actions', 'mocking'],
        isRequired: true,
    },

    // Challenge 3: Testing React Components
    {
        id: 'week6-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 6,
        order: 3,
        title: 'Test React Components',
        description: 'Write tests for React components with React Testing Library',
        difficulty: 'intermediate',
        instructions: `# Challenge: Test React Components

Learn to test React components with user interactions.

## Learning Objectives
- Use React Testing Library
- Test component rendering
- Simulate user interactions
- Test async operations

## Requirements
Test a \`ProductCard\` component with:

1. Renders product info correctly
2. Handles missing image gracefully
3. Calls onAddToCart when button clicked
4. Shows loading state during add
5. Displays success message after add

## Component to Test
\`\`\`tsx
export function ProductCard({ product, onAddToCart }) {
  const [loading, setLoading] = useState(false);

  const handleAdd = async () => {
    setLoading(true);
    await onAddToCart(product.id);
    setLoading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{product.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{formatPrice(product.price)}</p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleAdd} disabled={loading}>
          {loading ? 'Adding...' : 'Add to Cart'}
        </Button>
      </CardFooter>
    </Card>
  );
}
\`\`\`

## Test Examples
\`\`\`typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

test('renders product name and price', () => {
  render(<ProductCard product={mockProduct} />);
  expect(screen.getByText('Blue Dream')).toBeInTheDocument();
  expect(screen.getByText('$29.99')).toBeInTheDocument();
});

test('calls onAddToCart when clicked', async () => {
  const mockAdd = jest.fn();
  render(<ProductCard product={mockProduct} onAddToCart={mockAdd} />);

  fireEvent.click(screen.getByText('Add to Cart'));

  await waitFor(() => {
    expect(mockAdd).toHaveBeenCalledWith(mockProduct.id);
  });
});
\`\`\`
`,
        starterCode: `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProductCard } from '@/components/products/product-card';

const mockProduct = {
  id: 'prod_123',
  name: 'Blue Dream',
  price: 2999,
  category: 'flower',
};

describe('ProductCard', () => {
  test('renders product information', () => {
    // Your test
  });

  test('handles add to cart click', async () => {
    // Your test
  });

  // Add more tests
});`,
        hints: [
            'Use render() to mount component',
            'Use screen.getByText() to find elements',
            'Use fireEvent.click() for interactions',
            'Use waitFor() for async assertions',
        ],
        referenceDocs: [
            { title: 'Testing Library Docs', url: 'https://testing-library.com/react' },
        ],
        reviewCriteria: [
            { category: 'Component Tests', weight: 0.4, description: 'Tests rendering and behavior' },
            { category: 'User Interactions', weight: 0.3, description: 'Tests clicks, inputs correctly' },
            { category: 'Async Handling', weight: 0.2, description: 'Properly tests async operations' },
            { category: 'Test Quality', weight: 0.1, description: 'Clear, maintainable tests' },
        ],
        estimatedMinutes: 60,
        tags: ['testing', 'react', 'components'],
        isRequired: true,
    },

    // Challenge 4: Integration Tests
    {
        id: 'week6-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 6,
        order: 4,
        title: 'Write Integration Tests',
        description: 'Test full user flows end-to-end',
        difficulty: 'advanced',
        instructions: `# Challenge: Write Integration Tests

Test complete user flows across multiple components.

## Learning Objectives
- Write integration tests
- Test full user journeys
- Mock API calls
- Test error scenarios

## Requirements
Test a complete "Add to Cart" flow:

1. User views product list
2. User clicks "Add to Cart"
3. Cart updates with item
4. Cart shows correct total
5. User can remove item
6. Cart updates again

## Flow to Test
\`\`\`
ProductList → ProductCard → Cart → CartItem → Checkout
\`\`\`

## Test Structure
\`\`\`typescript
describe('Add to Cart Flow', () => {
  test('complete add to cart journey', async () => {
    // 1. Render product list
    render(<ShoppingPage />);

    // 2. Find and click product
    const addButton = screen.getByRole('button', { name: /add to cart/i });
    fireEvent.click(addButton);

    // 3. Verify cart updated
    await waitFor(() => {
      expect(screen.getByText(/1 item/i)).toBeInTheDocument();
    });

    // 4. Check total
    expect(screen.getByText('$29.99')).toBeInTheDocument();

    // 5. Remove item
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    // 6. Verify cart empty
    await waitFor(() => {
      expect(screen.getByText(/cart is empty/i)).toBeInTheDocument();
    });
  });
});
\`\`\`
`,
        starterCode: `import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ShoppingPage } from '@/app/shop/page';

// Mock server actions
jest.mock('@/app/actions/cart');

describe('Shopping Flow Integration Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('adds product to cart and updates total', async () => {
    // Your integration test
  });

  test('handles errors gracefully', async () => {
    // Test error scenarios
  });
});`,
        hints: [
            'Test the full user journey',
            'Mock network requests',
            'Use waitFor() for async updates',
            'Test both happy and error paths',
        ],
        referenceDocs: [
            { title: 'Integration Testing', url: 'https://testing-library.com/docs/react-testing-library/example-intro' },
        ],
        reviewCriteria: [
            { category: 'Flow Coverage', weight: 0.4, description: 'Tests complete user journey' },
            { category: 'Error Handling', weight: 0.3, description: 'Tests error scenarios' },
            { category: 'Assertions', weight: 0.2, description: 'Verifies state correctly' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean, maintainable' },
        ],
        estimatedMinutes: 75,
        tags: ['testing', 'integration', 'e2e'],
        isRequired: true,
    },

    // Challenge 5: Test Coverage & CI
    {
        id: 'week6-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 6,
        order: 5,
        title: 'Achieve Test Coverage Goals',
        description: 'Write tests to reach 80% coverage and set up CI',
        difficulty: 'advanced',
        instructions: `# Challenge: Test Coverage & CI

Achieve high test coverage and automate testing.

## Learning Objectives
- Measure test coverage
- Identify untested code
- Write tests for coverage gaps
- Set up CI for automated testing

## Requirements

### Part 1: Coverage Analysis
1. Run coverage report: \`npm test -- --coverage\`
2. Identify files with <80% coverage
3. Write tests to reach 80% threshold
4. Focus on critical paths

### Part 2: CI Setup (Optional)
Create \`.github/workflows/test.yml\`:

\`\`\`yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm test -- --coverage
      - name: Upload coverage
        uses: codecov/codecov-action@v3
\`\`\`

## Coverage Goals
- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

## Key Files to Test
- Server Actions
- Critical utilities
- Core components
- API routes

## Submission
1. Coverage report screenshot
2. List of files you added tests for
3. Explanation of testing strategy
`,
        starterCode: `// Run this to check coverage:
// npm test -- --coverage

// Identify files needing tests from report
// Write tests until coverage goals met

// Example coverage report:
/*
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|--------
utils/price.ts      |   95.2  |   85.7   |  100.0  |  95.2
actions/products.ts |   68.4  |   62.5   |   75.0  |  68.4  <- Needs tests!
*/`,
        hints: [
            'Focus on critical business logic first',
            'Don\'t chase 100% coverage',
            'Test edge cases and error paths',
            'Use coverage report to guide efforts',
        ],
        referenceDocs: [
            { title: 'Jest Coverage', url: 'https://jestjs.io/docs/cli#--coverageboolean' },
        ],
        reviewCriteria: [
            { category: 'Coverage Achievement', weight: 0.5, description: 'Reaches 80% coverage goals' },
            { category: 'Test Quality', weight: 0.3, description: 'Tests are meaningful, not just for coverage' },
            { category: 'Strategy', weight: 0.2, description: 'Clear explanation of approach' },
        ],
        estimatedMinutes: 90,
        tags: ['testing', 'coverage', 'ci', 'quality'],
        isRequired: false,
    },
];
