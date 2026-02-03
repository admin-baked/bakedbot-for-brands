/**
 * Week 3-4 Challenges
 * Separated for maintainability
 */

import type { TrainingChallenge } from '@/types/training';

/**
 * Week 3 Challenges - React Components & UI
 */
export const WEEK_3_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: Reusable Component
    {
        id: 'week3-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 3,
        order: 1,
        title: 'Reusable Product Card',
        description: 'Create a reusable React component with TypeScript props',
        difficulty: 'beginner',
        instructions: `# Challenge: Reusable Product Card

Build a reusable ProductCard component with proper TypeScript types.

## Requirements
Create \`ProductCard.tsx\` with:

1. TypeScript interface for props
2. Display product name, price, category, image
3. Optional "Add to Cart" button prop
4. Responsive design with Tailwind
5. Use ShadCN Card component as base

## Props Interface
\`\`\`typescript
interface ProductCardProps {
  product: {
    id: string;
    name: string;
    price: number;
    category: string;
    imageUrl?: string;
  };
  onAddToCart?: (productId: string) => void;
  showAddButton?: boolean;
}
\`\`\`

## Design Requirements
- Card with hover effect
- Image at top (fallback if no image)
- Name + category below image
- Price formatted as currency
- Optional button at bottom
`,
        starterCode: `'use client';

import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Define your interface here

export function ProductCard(/* props */) {
  // Your implementation
}`,
        hints: [
            'Use Card from @/components/ui/card',
            'Format price: new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(price)',
            'Add hover:shadow-lg transition for hover effect',
            'Use Image from next/image with fallback',
        ],
        referenceDocs: [
            { title: 'Frontend Reference', url: '/.agent/refs/frontend.md' },
            { title: 'ShadCN Card', url: 'https://ui.shadcn.com/docs/components/card' },
        ],
        reviewCriteria: [
            { category: 'TypeScript', weight: 0.3, description: 'Proper interface and prop types' },
            { category: 'Component Design', weight: 0.3, description: 'Reusable and well-structured' },
            { category: 'Styling', weight: 0.2, description: 'Good use of Tailwind and ShadCN' },
            { category: 'UX', weight: 0.2, description: 'Responsive and accessible' },
        ],
        estimatedMinutes: 45,
        tags: ['react', 'components', 'typescript', 'ui'],
        isRequired: true,
    },

    // Challenge 2: Form with Validation
    {
        id: 'week3-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 3,
        order: 2,
        title: 'Form with React Hook Form',
        description: 'Build a form with validation using react-hook-form and Zod',
        difficulty: 'intermediate',
        instructions: `# Challenge: Product Form with Validation

Create a product creation form with react-hook-form and Zod validation.

## Requirements
1. Use react-hook-form for form state
2. Zod schema for validation
3. ShadCN Form components
4. Display validation errors
5. Submit via Server Action

## Form Fields
- Name (required, 3-100 chars)
- Description (optional, max 500 chars)
- Price (required, positive number)
- Category (required, select dropdown)
- Image URL (optional, valid URL)

## Validation Rules
\`\`\`typescript
const schema = z.object({
  name: z.string().min(3).max(100),
  description: z.string().max(500).optional(),
  price: z.number().positive(),
  category: z.enum(['flower', 'edibles', 'vapes', 'other']),
  imageUrl: z.string().url().optional().or(z.literal('')),
});
\`\`\`
`,
        starterCode: `'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Define schema

// Your component here`,
        hints: [
            'Use zodResolver with useForm',
            'FormField component for each input',
            'form.handleSubmit for submission',
            'Display FormMessage for errors',
        ],
        referenceDocs: [
            { title: 'React Hook Form', url: 'https://react-hook-form.com' },
            { title: 'ShadCN Form', url: 'https://ui.shadcn.com/docs/components/form' },
        ],
        reviewCriteria: [
            { category: 'Validation', weight: 0.4, description: 'Complete Zod schema with all rules' },
            { category: 'Form Handling', weight: 0.3, description: 'Correct use of react-hook-form' },
            { category: 'Error Display', weight: 0.2, description: 'User-friendly error messages' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean and organized' },
        ],
        estimatedMinutes: 50,
        tags: ['react', 'forms', 'validation', 'zod'],
        isRequired: true,
    },

    // Challenge 3: State Management
    {
        id: 'week3-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 3,
        order: 3,
        title: 'Shopping Cart State',
        description: 'Manage complex state with React hooks',
        difficulty: 'intermediate',
        instructions: `# Challenge: Shopping Cart State Management

Build a shopping cart with add/remove/update quantity functionality.

## Requirements
1. Create \`useCart\` custom hook
2. State: array of cart items
3. Functions: addItem, removeItem, updateQuantity, clearCart
4. Calculate total price
5. Persist to localStorage

## Cart Item Type
\`\`\`typescript
interface CartItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}
\`\`\`

## Hook Interface
\`\`\`typescript
function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = (item: CartItem) => { /* ... */ };
  const removeItem = (productId: string) => { /* ... */ };
  const updateQuantity = (productId: string, quantity: number) => { /* ... */ };
  const clearCart = () => { /* ... */ };
  const total = /* calculate */;

  return { items, addItem, removeItem, updateQuantity, clearCart, total };
}
\`\`\`
`,
        starterCode: `'use client';

import { useState, useEffect } from 'react';

// Define types

// Your hook implementation`,
        hints: [
            'Use useState for items array',
            'Use useEffect to sync with localStorage',
            'Calculate total: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)',
            'Handle duplicate items by updating quantity',
        ],
        referenceDocs: [
            { title: 'React Hooks', url: 'https://react.dev/reference/react/hooks' },
        ],
        reviewCriteria: [
            { category: 'State Management', weight: 0.4, description: 'Correct use of hooks and state updates' },
            { category: 'Logic', weight: 0.3, description: 'Handles edge cases (duplicates, quantity 0)' },
            { category: 'Persistence', weight: 0.2, description: 'localStorage integration works' },
            { category: 'TypeScript', weight: 0.1, description: 'Proper types and interfaces' },
        ],
        estimatedMinutes: 55,
        tags: ['react', 'hooks', 'state', 'localStorage'],
        isRequired: true,
    },

    // Challenge 4: Animations
    {
        id: 'week3-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 3,
        order: 4,
        title: 'Animated Modal',
        description: 'Add smooth animations with Framer Motion',
        difficulty: 'intermediate',
        instructions: `# Challenge: Animated Modal Dialog

Create a modal with enter/exit animations using Framer Motion.

## Requirements
1. Use ShadCN Dialog as base
2. Add Framer Motion animations
3. Overlay fade in/out
4. Content slide + fade in/out
5. Close on outside click or ESC

## Animations
- Overlay: fade from 0 to 1 (0.2s)
- Content: slide up 20px + fade (0.3s)
- Exit: reverse animations
- Stagger children if multiple elements

## Example Usage
\`\`\`tsx
<AnimatedModal open={isOpen} onClose={() => setIsOpen(false)}>
  <h2>Modal Title</h2>
  <p>Content here</p>
</AnimatedModal>
\`\`\`
`,
        starterCode: `'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';

// Your component`,
        hints: [
            'Wrap Dialog with AnimatePresence',
            'Use motion.div for animated elements',
            'initial={{ opacity: 0, y: 20 }}',
            'animate={{ opacity: 1, y: 0 }}',
            'exit={{ opacity: 0, y: 20 }}',
        ],
        referenceDocs: [
            { title: 'Framer Motion', url: 'https://www.framer.com/motion' },
            { title: 'ShadCN Dialog', url: 'https://ui.shadcn.com/docs/components/dialog' },
        ],
        reviewCriteria: [
            { category: 'Animations', weight: 0.5, description: 'Smooth, well-timed animations' },
            { category: 'Component Integration', weight: 0.3, description: 'Works with ShadCN Dialog' },
            { category: 'UX', weight: 0.2, description: 'Feels polished and professional' },
        ],
        estimatedMinutes: 50,
        tags: ['react', 'animations', 'framer-motion', 'ui'],
        isRequired: true,
    },

    // Challenge 5: Data Fetching
    {
        id: 'week3-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 3,
        order: 5,
        title: 'Data Fetching with Loading States',
        description: 'Handle async data with proper loading and error states',
        difficulty: 'advanced',
        instructions: `# Challenge: Product List with Loading States

Fetch products from Server Action and display with proper states.

## Requirements
1. Fetch products using Server Action
2. Loading state with skeleton
3. Error state with retry
4. Empty state
5. Success state with product grid

## States to Handle
- **Loading:** Show skeleton grid
- **Error:** Show error message + retry button
- **Empty:** Show "No products" message
- **Success:** Show product grid

## Use Server Action
\`\`\`typescript
import { getProducts } from '@/server/actions/products';

const [products, setProducts] = useState([]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

useEffect(() => {
  async function fetchData() {
    setLoading(true);
    const result = await getProducts();
    if (result.success) {
      setProducts(result.data);
    } else {
      setError(result.error);
    }
    setLoading(false);
  }
  fetchData();
}, []);
\`\`\`
`,
        starterCode: `'use client';

import { useState, useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Your component`,
        hints: [
            'Use useState for products, loading, error',
            'useEffect to fetch on mount',
            'Skeleton component for loading state',
            'Alert component for error state',
            'Grid layout for products',
        ],
        referenceDocs: [
            { title: 'React useEffect', url: 'https://react.dev/reference/react/useEffect' },
        ],
        reviewCriteria: [
            { category: 'State Management', weight: 0.3, description: 'Handles all states correctly' },
            { category: 'UX', weight: 0.3, description: 'Good loading and error experiences' },
            { category: 'Error Handling', weight: 0.2, description: 'Graceful error handling with retry' },
            { category: 'Code Quality', weight: 0.2, description: 'Clean and organized' },
        ],
        estimatedMinutes: 60,
        tags: ['react', 'async', 'loading-states', 'error-handling'],
        isRequired: false,
    },
];

/**
 * Week 4 Challenges - API Routes & External Services
 */
export const WEEK_4_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: Basic API Route
    {
        id: 'week4-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 4,
        order: 1,
        title: 'Basic API Route',
        description: 'Create a Next.js API route with authentication',
        difficulty: 'beginner',
        instructions: `# Challenge: Basic API Route

Build a simple API endpoint that returns user data.

## Requirements
Create \`app/api/user/profile/route.ts\` that:

1. Uses GET method
2. Verifies authentication
3. Returns user profile data
4. Handles errors properly
5. Sets correct headers

## Response Format
\`\`\`json
{
  "success": true,
  "data": {
    "uid": "...",
    "email": "...",
    "role": "..."
  }
}
\`\`\`

## Error Format
\`\`\`json
{
  "success": false,
  "error": "Unauthorized"
}
\`\`\`
`,
        starterCode: `import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  // Your implementation
}`,
        hints: [
            'Use requireUser() to verify auth',
            'Return NextResponse.json()',
            'Set status codes: 200, 401, 500',
            'Wrap in try/catch',
        ],
        referenceDocs: [
            { title: 'API Routes', url: '/.agent/refs/api.md' },
            { title: 'Next.js Route Handlers', url: 'https://nextjs.org/docs/app/building-your-application/routing/route-handlers' },
        ],
        reviewCriteria: [
            { category: 'API Design', weight: 0.4, description: 'RESTful design and proper responses' },
            { category: 'Authentication', weight: 0.3, description: 'Correct auth verification' },
            { category: 'Error Handling', weight: 0.2, description: 'Handles errors gracefully' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean and follows patterns' },
        ],
        estimatedMinutes: 40,
        tags: ['api', 'next.js', 'authentication'],
        isRequired: true,
    },

    // Challenge 2: POST with Validation
    {
        id: 'week4-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 4,
        order: 2,
        title: 'API Route with POST',
        description: 'Handle POST requests with body validation',
        difficulty: 'intermediate',
        instructions: `# Challenge: Create Product API

Build a POST endpoint that creates products with validation.

## Requirements
Create \`app/api/products/route.ts\` with:

1. POST method handler
2. Parse and validate request body
3. Use Zod schema
4. Save to Firestore
5. Return created product

## Request Body
\`\`\`json
{
  "name": "Product Name",
  "price": 29.99,
  "category": "flower"
}
\`\`\`

## Validation
- name: 3-100 chars
- price: positive number
- category: enum

## Tips
\`\`\`typescript
const body = await request.json();
const validated = schema.parse(body);
\`\`\`
`,
        starterCode: `import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { z } from 'zod';

// Define schema

export async function POST(request: NextRequest) {
  // Your implementation
}`,
        hints: [
            'Use z.object() for schema',
            'Parse body: await request.json()',
            'Validate with schema.parse()',
            'Return 400 for validation errors',
        ],
        referenceDocs: [
            { title: 'API Routes', url: '/.agent/refs/api.md' },
        ],
        reviewCriteria: [
            { category: 'Validation', weight: 0.4, description: 'Complete and correct validation' },
            { category: 'API Design', weight: 0.3, description: 'Proper POST handling' },
            { category: 'Error Handling', weight: 0.2, description: 'Returns validation errors' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean implementation' },
        ],
        estimatedMinutes: 50,
        tags: ['api', 'post', 'validation'],
        isRequired: true,
    },

    // Challenge 3: Webhook Handler
    {
        id: 'week4-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 4,
        order: 3,
        title: 'Webhook Handler',
        description: 'Handle webhook payloads with signature verification',
        difficulty: 'intermediate',
        instructions: `# Challenge: Webhook Handler

Create a webhook endpoint that verifies signatures and processes events.

## Requirements
Create \`app/api/webhooks/test/route.ts\` that:

1. Verifies webhook signature (HMAC SHA256)
2. Parses event payload
3. Processes different event types
4. Returns 200 on success
5. Logs all events

## Signature Verification
\`\`\`typescript
const signature = request.headers.get('x-webhook-signature');
const body = await request.text();
const expected = crypto
  .createHmac('sha256', process.env.WEBHOOK_SECRET!)
  .update(body)
  .digest('hex');

if (signature !== expected) {
  return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
}
\`\`\`

## Event Types
- customer.created
- order.completed
`,
        starterCode: `import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  // Your implementation
}`,
        hints: [
            'Read body as text first for signature',
            'Use crypto.createHmac() for verification',
            'Parse JSON after verification',
            'Return 200 immediately (acknowledge)',
        ],
        referenceDocs: [
            { title: 'Webhook Setup', url: '/docs/WEBHOOK_SETUP.md' },
        ],
        reviewCriteria: [
            { category: 'Security', weight: 0.5, description: 'Correct signature verification' },
            { category: 'Event Handling', weight: 0.3, description: 'Processes events correctly' },
            { category: 'Error Handling', weight: 0.2, description: 'Returns proper status codes' },
        ],
        estimatedMinutes: 55,
        tags: ['webhooks', 'security', 'api'],
        isRequired: true,
    },

    // Challenge 4: External API Integration
    {
        id: 'week4-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 4,
        order: 4,
        title: 'Send Email via Mailjet',
        description: 'Integrate with external API (Mailjet)',
        difficulty: 'intermediate',
        instructions: `# Challenge: Email Integration

Send emails using Mailjet API.

## Requirements
Create \`sendWelcomeEmail(email: string, name: string)\` that:

1. Calls Mailjet API
2. Sends welcome email
3. Handles API errors
4. Returns success/failure
5. Logs all attempts

## Mailjet API
\`\`\`typescript
const response = await fetch('https://api.mailjet.com/v3.1/send', {
  method: 'POST',
  headers: {
    'Authorization': \`Basic \${Buffer.from(\`\${apiKey}:\${secretKey}\`).toString('base64')}\`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    Messages: [{
      From: { Email: 'noreply@bakedbot.ai', Name: 'BakedBot' },
      To: [{ Email: email, Name: name }],
      Subject: \`Welcome, \${name}!\`,
      TextPart: \`Hi \${name}, welcome to BakedBot!\`
    }]
  })
});
\`\`\`
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

// Your implementation`,
        hints: [
            'Use environment variables for API keys',
            'Basic auth: Buffer.from(apiKey + ":" + secret).toString("base64")',
            'Check response.ok',
            'Log both success and failure',
        ],
        referenceDocs: [
            { title: 'Integrations', url: '/.agent/refs/integrations.md' },
            { title: 'Mailjet Docs', url: 'https://dev.mailjet.com' },
        ],
        reviewCriteria: [
            { category: 'Integration', weight: 0.4, description: 'Correct API usage' },
            { category: 'Error Handling', weight: 0.3, description: 'Handles API errors gracefully' },
            { category: 'Security', weight: 0.2, description: 'Uses environment variables' },
            { category: 'Logging', weight: 0.1, description: 'Logs important events' },
        ],
        estimatedMinutes: 55,
        tags: ['api', 'integration', 'email', 'mailjet'],
        isRequired: true,
    },

    // Challenge 5: Rate Limiting
    {
        id: 'week4-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 4,
        order: 5,
        title: 'Rate Limiting',
        description: 'Implement rate limiting for API endpoints',
        difficulty: 'advanced',
        instructions: `# Challenge: Rate Limiting Middleware

Implement simple rate limiting for API routes.

## Requirements
Create rate limiter that:

1. Limits requests per IP
2. Uses in-memory Map (production would use Redis)
3. Window: 100 requests per minute
4. Returns 429 if exceeded
5. Resets after 1 minute

## Implementation
\`\`\`typescript
const rateLimits = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const limit = rateLimits.get(ip);

  if (!limit || now > limit.resetAt) {
    rateLimits.set(ip, { count: 1, resetAt: now + 60000 });
    return true;
  }

  if (limit.count >= 100) {
    return false; // Rate limit exceeded
  }

  limit.count++;
  return true;
}
\`\`\`
`,
        starterCode: `import { NextRequest, NextResponse } from 'next/server';

const rateLimits = new Map<string, { count: number; resetAt: number }>();

// Your implementation`,
        hints: [
            'Use Map for in-memory storage',
            'Get IP: request.ip or request.headers.get("x-forwarded-for")',
            'Reset after 60 seconds',
            'Return 429 status when exceeded',
        ],
        referenceDocs: [
            { title: 'Rate Limiting Pattern', url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Status/429' },
        ],
        reviewCriteria: [
            { category: 'Logic', weight: 0.5, description: 'Correct rate limiting logic' },
            { category: 'Reset Mechanism', weight: 0.3, description: 'Properly resets after window' },
            { category: 'Error Handling', weight: 0.2, description: 'Returns 429 with headers' },
        ],
        estimatedMinutes: 60,
        tags: ['api', 'rate-limiting', 'security', 'advanced'],
        isRequired: false,
    },
];
