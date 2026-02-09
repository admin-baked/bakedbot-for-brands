/**
 * BakedBot Builder Bootcamp - 8 Week Curriculum
 *
 * Comprehensive training program for new engineers learning the BakedBot AI way.
 * All weeks now fully defined with detailed challenges.
 */

import type { TrainingProgram, TrainingChallenge } from '@/types/training';
import { Timestamp } from '@google-cloud/firestore';
import { WEEK_3_CHALLENGES, WEEK_4_CHALLENGES } from './weeks-3-4';
import { WEEK_5_CHALLENGES, WEEK_6_CHALLENGES } from './weeks-5-6';
import { WEEK_7_CHALLENGES, WEEK_8_CHALLENGES } from './weeks-7-8';

/**
 * Main Training Program Definition
 */
export const TRAINING_PROGRAM: Omit<TrainingProgram, 'createdAt' | 'updatedAt'> = {
    id: 'bakedbot-builder-bootcamp-v1',
    name: 'BakedBot Builder Bootcamp',
    description: 'Learn the BakedBot AI way through 8 weeks of hands-on challenges covering Next.js, Firebase, AI agents, and more.',
    durationWeeks: 8,
    status: 'active',
    curriculum: [
        // Week 1: Foundations & Setup (Fully Defined)
        {
            weekNumber: 1,
            title: 'Foundations & Setup',
            description: 'Get familiar with the codebase, tools, and development workflow',
            objectives: [
                'Navigate the BakedBot codebase structure',
                'Understand the multi-agent architecture',
                'Run TypeScript checks and tests',
                'Create your first Server Action with auth',
                'Follow BakedBot coding standards',
            ],
            challengeIds: ['week1-ch1', 'week1-ch2', 'week1-ch3', 'week1-ch4', 'week1-ch5'],
        },

        // Week 2: Firestore & Data Modeling (Fully Defined)
        {
            weekNumber: 2,
            title: 'Firestore & Data Modeling',
            description: 'Learn to work with Firestore, design schemas, and handle data persistence',
            objectives: [
                'Perform CRUD operations with Firestore admin SDK',
                'Write complex queries with filters and sorting',
                'Validate data with Zod schemas',
                'Use batch operations and transactions',
                'Model hierarchical data with subcollections',
            ],
            challengeIds: ['week2-ch1', 'week2-ch2', 'week2-ch3', 'week2-ch4', 'week2-ch5'],
        },

        // Week 3: React Components & UI (Outlined)
        {
            weekNumber: 3,
            title: 'React Components & UI',
            description: 'Build responsive UI components with ShadCN and Tailwind CSS',
            objectives: [
                'Create reusable React components with TypeScript props',
                'Use ShadCN UI components (Card, Button, Form)',
                'Style with Tailwind CSS utility classes',
                'Implement forms with react-hook-form and Zod',
                'Add animations with Framer Motion',
            ],
            challengeIds: ['week3-ch1', 'week3-ch2', 'week3-ch3', 'week3-ch4', 'week3-ch5'],
        },

        // Week 4: API Routes & Integrations (Outlined)
        {
            weekNumber: 4,
            title: 'API Routes & External Services',
            description: 'Build API endpoints and integrate external services',
            objectives: [
                'Create Next.js API routes with proper patterns',
                'Handle authentication in API routes',
                'Integrate external APIs (Mailjet, Blackleaf)',
                'Parse and validate webhook payloads',
                'Implement rate limiting and error handling',
            ],
            challengeIds: ['week4-ch1', 'week4-ch2', 'week4-ch3', 'week4-ch4', 'week4-ch5'],
        },

        // Week 5: AI Agents & Genkit (Fully Defined)
        {
            weekNumber: 5,
            title: 'AI Agents & Genkit',
            description: 'Build intelligent agents with Genkit and Claude API',
            objectives: [
                'Create custom Genkit tools',
                'Build agents with system prompts',
                'Implement multi-tool agents',
                'Integrate with Claude API',
                'Understand BakedBot agent squad',
            ],
            challengeIds: ['week5-ch1', 'week5-ch2', 'week5-ch3', 'week5-ch4', 'week5-ch5'],
        },

        // Week 6: Testing & Quality Assurance (Fully Defined)
        {
            weekNumber: 6,
            title: 'Testing & Quality Assurance',
            description: 'Write comprehensive tests and achieve quality goals',
            objectives: [
                'Write Jest unit tests',
                'Test Server Actions with mocks',
                'Test React components',
                'Write integration tests',
                'Achieve 80% test coverage',
            ],
            challengeIds: ['week6-ch1', 'week6-ch2', 'week6-ch3', 'week6-ch4', 'week6-ch5'],
        },

        // Week 7: Advanced Patterns (Fully Defined)
        {
            weekNumber: 7,
            title: 'Advanced Patterns',
            description: 'Master Letta memory, RTRVR automation, and advanced React patterns',
            objectives: [
                'Integrate Letta for persistent memory',
                'Use RTRVR for browser automation',
                'Schedule background jobs',
                'Implement real-time updates',
                'Optimize performance',
            ],
            challengeIds: ['week7-ch1', 'week7-ch2', 'week7-ch3', 'week7-ch4', 'week7-ch5'],
        },

        // Week 8: Capstone Project (Fully Defined)
        {
            weekNumber: 8,
            title: 'Capstone Project',
            description: 'Design, build, test, and ship a production-ready feature',
            objectives: [
                'Design complete feature from scratch',
                'Implement full-stack solution',
                'Write comprehensive tests (>80% coverage)',
                'Create thorough documentation',
                'Present demo to team',
            ],
            challengeIds: ['week8-capstone'],
        },
    ],
};

/**
 * Week 1 Challenges - Fully Defined
 */
export const WEEK_1_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: Hello BakedBot
    {
        id: 'week1-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 1,
        order: 1,
        title: 'Hello BakedBot',
        description: 'Create your first Server Action with proper authentication',
        difficulty: 'beginner',
        instructions: `# Challenge: Hello BakedBot

Welcome to BakedBot! Your first challenge is to create a simple Server Action that returns a personalized greeting.

## Learning Objectives
- Understand the \`'use server'\` directive
- Use \`requireUser()\` for authentication
- Follow TypeScript best practices
- Return proper \`ActionResult\` type

## Requirements
1. Create file: \`src/server/actions/hello-intern.ts\`
2. Add \`'use server'\` directive at the top
3. Implement async function \`greetIntern(name: string)\`
4. Use \`requireUser()\` to verify authentication
5. Return \`ActionResult\` type: \`{ success: true, data: { message: string } }\`
6. Add full TypeScript types (no \`any\`)
7. Include try/catch error handling
8. Use \`logger\` from \`@/lib/logger\` for any logging

## Expected Behavior
\`\`\`typescript
// Input
greetIntern("Alex")

// Output
{ success: true, data: { message: "Hello, Alex! Welcome to BakedBot." } }
\`\`\`

## Tips
- Review **CLAUDE.md** for Server Action patterns
- Check existing actions in \`src/server/actions/\` for examples
- The \`requireUser()\` function throws an error if not authenticated
- Server Actions should always have try/catch blocks
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

// Define your ActionResult type
type ActionResult<T> =
    | { success: true; data: T }
    | { success: false; error: string };

// Implement greetIntern here
`,
        hints: [
            'Import requireUser from @/server/auth/auth',
            'Import logger from @/lib/logger',
            'Server Actions must be async',
            'Use try/catch to handle errors',
            'Return { success: true, data: { message } } on success',
        ],
        referenceDocs: [
            { title: 'CLAUDE.md - Server Actions', url: '/CLAUDE.md' },
            { title: 'Authentication Guide', url: '/.agent/refs/authentication.md' },
            { title: 'Backend Reference', url: '/.agent/refs/backend.md' },
        ],
        reviewCriteria: [
            {
                category: 'TypeScript',
                weight: 0.3,
                description: 'Properly typed with no any, correct return type, proper interfaces',
            },
            {
                category: 'Server Actions',
                weight: 0.3,
                description: 'Correct use server directive, async function, proper structure',
            },
            {
                category: 'Authentication',
                weight: 0.2,
                description: 'Uses requireUser() correctly at start of function',
            },
            {
                category: 'Code Quality',
                weight: 0.2,
                description: 'Clean, readable code with error handling and follows standards',
            },
        ],
        estimatedMinutes: 30,
        tags: ['server-actions', 'auth', 'typescript', 'basics'],
        isRequired: true,
    },

    // Challenge 2: Codebase Explorer
    {
        id: 'week1-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 1,
        order: 2,
        title: 'Codebase Explorer',
        description: 'Navigate the BakedBot codebase and understand key files',
        difficulty: 'beginner',
        instructions: `# Challenge: Codebase Explorer

Explore the BakedBot codebase and answer questions about its structure.

## Learning Objectives
- Navigate the \`src/\` directory structure
- Understand the role of key directories
- Identify where different types of code live
- Read and comprehend existing code

## Requirements
Create a Server Action \`exploreCo debase()\` that returns an object with answers to these questions:

1. How many agents are defined in \`src/server/agents/\`? (List their names)
2. What is the purpose of the \`src/server/services/\` directory?
3. Where are React components stored?
4. What file contains the main dashboard layout?
5. What is stored in \`.agent/refs/\`?

## File Structure to Explore
\`\`\`
src/
├── app/              # Next.js pages & API routes
├── components/       # React components
├── server/
│   ├── agents/       # Agent implementations
│   ├── services/     # Business logic
│   ├── actions/      # Server Actions
│   └── tools/        # Agent tools
├── lib/              # Utilities
└── types/            # TypeScript types
\`\`\`

## Expected Output Format
\`\`\`typescript
{
    success: true,
    data: {
        agentCount: 7,
        agents: ['linus', 'smokey', 'craig', ...],
        servicesPurpose: "Business logic and external integrations",
        componentsPath: "src/components/",
        dashboardLayout: "src/app/dashboard/layout.tsx",
        agentRefsContain: "Reference documentation for agents"
    }
}
\`\`\`

## Tips
- Use your file explorer or terminal to navigate
- Read README files and comments
- Look at import statements to understand dependencies
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';

// Implement exploreCodebase here
`,
        hints: [
            'You can count files using ls or dir commands',
            'Read the CLAUDE.md file for codebase overview',
            'Check .agent/prime.md for directory structure',
            'Look at actual files, not just documentation',
        ],
        referenceDocs: [
            { title: 'CLAUDE.md', url: '/CLAUDE.md' },
            { title: '.agent/prime.md', url: '/.agent/prime.md' },
        ],
        reviewCriteria: [
            {
                category: 'Accuracy',
                weight: 0.5,
                description: 'Correct answers to all questions',
            },
            {
                category: 'Code Quality',
                weight: 0.3,
                description: 'Clean implementation of Server Action',
            },
            {
                category: 'Understanding',
                weight: 0.2,
                description: 'Demonstrates understanding of codebase structure',
            },
        ],
        estimatedMinutes: 45,
        tags: ['codebase', 'exploration', 'documentation'],
        isRequired: true,
    },

    // Challenge 3: Standards Enforcer
    {
        id: 'week1-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 1,
        order: 3,
        title: 'Standards Enforcer',
        description: 'Find and fix intentional coding standard violations',
        difficulty: 'beginner',
        instructions: `# Challenge: Standards Enforcer

Below is code that violates BakedBot coding standards. Find and fix **all** violations.

## Intentionally Bad Code
\`\`\`typescript
// File: bad-example.ts
import {db} from './firebase'
const getUserData = async (id) => {
    console.log('Getting user:', id)
    var user = await db.collection('users').doc(id).get()
    if(!user.exists) return null
    return user.data()
}
\`\`\`

## Your Task
Rewrite the code following BakedBot standards:
1. Use proper TypeScript types
2. Replace console.log with logger
3. Use const instead of var
4. Add proper error handling
5. Follow import conventions
6. Add JSDoc comments
7. Use proper spacing and formatting

## BakedBot Coding Standards
- **TypeScript**: All code must be typed, prefer \`unknown\` over \`any\`
- **Logging**: Use \`logger\` from \`@/lib/logger\`, never \`console.log\`
- **Const/Let**: Use \`const\` by default, \`let\` when needed, never \`var\`
- **Error Handling**: Always use try/catch for async operations
- **Imports**: Use \`@/\` aliases for internal imports
- **Comments**: Add JSDoc for public functions

## Expected Output
Submit your corrected version as a Server Action called \`getUserDataCorrected(id: string)\`
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import { getAdminFirestore } from '@/firebase/admin';

/**
 * Your corrected implementation here
 */
`,
        hints: [
            'Check CLAUDE.md for all coding standards',
            'Add types to all parameters and return values',
            'Wrap async calls in try/catch',
            'Import from @/ paths',
        ],
        referenceDocs: [
            { title: 'CLAUDE.md - Coding Standards', url: '/CLAUDE.md#coding-standards' },
        ],
        reviewCriteria: [
            {
                category: 'Standards Compliance',
                weight: 0.4,
                description: 'Fixed all violations and follows all standards',
            },
            {
                category: 'TypeScript',
                weight: 0.3,
                description: 'Proper types throughout',
            },
            {
                category: 'Error Handling',
                weight: 0.2,
                description: 'Proper try/catch and error returns',
            },
            {
                category: 'Code Style',
                weight: 0.1,
                description: 'Clean formatting and readability',
            },
        ],
        estimatedMinutes: 40,
        tags: ['standards', 'typescript', 'best-practices'],
        isRequired: true,
    },

    // Challenge 4: Build Health Check
    {
        id: 'week1-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 1,
        order: 4,
        title: 'Build Health Check',
        description: 'Run TypeScript checks and fix any errors you create',
        difficulty: 'beginner',
        instructions: `# Challenge: Build Health Check

The first rule of BakedBot: **Always keep the build green**.

## Learning Objectives
- Run \`npm run check:types\`
- Interpret TypeScript errors
- Fix type errors
- Understand build health importance

## Your Task
1. Run \`npm run check:types\` in your terminal
2. Create a Server Action that intentionally has 3 type errors
3. Submit your broken code
4. Fix the errors
5. Verify build passes
6. Submit corrected code

## Part 1: Broken Code
Create \`brokenAction.ts\` with exactly 3 TypeScript errors (e.g., missing types, wrong return type, any usage)

## Part 2: Fixed Code
Fix all errors and verify with \`npm run check:types\`

## Commands to Run
\`\`\`powershell
# TypeScript check
npm run check:types

# Run tests
npm test

# Lint
npm run lint
\`\`\`

## Success Criteria
- Submitted broken code (3 errors identified)
- Submitted fixed code (0 errors)
- Build passes TypeScript check
`,
        starterCode: `'use server';

// Part 1: Create code with 3 intentional type errors
// Then fix them in Part 2
`,
        hints: [
            'Common type errors: missing return type, any usage, wrong types',
            'Run check:types frequently',
            'Read error messages carefully',
            'Fix one error at a time',
        ],
        referenceDocs: [
            { title: 'CLAUDE.md - Workflow', url: '/CLAUDE.md#workflow' },
        ],
        reviewCriteria: [
            {
                category: 'Error Identification',
                weight: 0.3,
                description: 'Correctly identified 3 type errors',
            },
            {
                category: 'Error Resolution',
                weight: 0.4,
                description: 'Fixed all errors correctly',
            },
            {
                category: 'Process Understanding',
                weight: 0.3,
                description: 'Demonstrated understanding of build health workflow',
            },
        ],
        estimatedMinutes: 35,
        tags: ['typescript', 'build', 'debugging'],
        isRequired: true,
    },

    // Challenge 5: First Real Contribution
    {
        id: 'week1-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 1,
        order: 5,
        title: 'First Real Contribution',
        description: 'Find a typo or documentation improvement and create a PR',
        difficulty: 'intermediate',
        instructions: `# Challenge: First Real Contribution

Make your first real contribution to the BakedBot codebase!

## Learning Objectives
- Use Git for version control
- Create a meaningful commit
- Understand the PR process
- Contribute to documentation

## Your Task
1. Find a typo or documentation issue (markdown files, comments, etc.)
2. Fix it
3. Run \`npm run check:types\` to ensure build is green
4. Commit with proper message format
5. Create a PR (or submit your diff)

## Commit Message Format
\`\`\`
fix(docs): correct typo in CLAUDE.md setup section

- Fixed "recieve" -> "receive"
- Line 145 in CLAUDE.md

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
\`\`\`

## Where to Look for Issues
- Markdown files (*.md)
- Code comments
- JSDoc documentation
- README files

## Git Commands
\`\`\`powershell
# Stage your changes
git add path/to/file.md

# Commit with message
git commit -m "fix(docs): your message here"

# Push (when ready)
git push origin your-branch-name
\`\`\`

## Success Criteria
- Found a real issue (not fabricated)
- Created proper commit message
- Build remains green
- PR or diff submitted
`,
        starterCode: `// No starter code - this is a real-world task!
// Find a typo, fix it, and submit.
`,
        hints: [
            'Look in .md files first (easier to find typos)',
            'Check CLAUDE.md, prime.md, README files',
            'Use git status to see changes',
            'Keep changes small and focused',
        ],
        referenceDocs: [
            { title: 'CLAUDE.md - Git Workflow', url: '/CLAUDE.md#workflow' },
        ],
        reviewCriteria: [
            {
                category: 'Contribution Quality',
                weight: 0.4,
                description: 'Found and fixed a real issue',
            },
            {
                category: 'Git Usage',
                weight: 0.3,
                description: 'Proper commit message and process',
            },
            {
                category: 'Build Health',
                weight: 0.3,
                description: 'Build remains green after change',
            },
        ],
        estimatedMinutes: 45,
        tags: ['git', 'contribution', 'documentation'],
        isRequired: false, // Optional for Week 1
    },
];

/**
 * Week 2 Challenges - Firestore & Data Modeling
 */
export const WEEK_2_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: Basic Firestore Query
    {
        id: 'week2-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 2,
        order: 1,
        title: 'Firestore CRUD Basics',
        description: 'Create a Server Action that reads and writes to Firestore',
        difficulty: 'beginner',
        instructions: `# Challenge: Firestore CRUD Basics

Learn to interact with Firestore using the admin SDK.

## Learning Objectives
- Use getAdminFirestore() to get DB instance
- Read documents with .get()
- Write documents with .set()
- Handle missing documents
- Use Timestamp for dates

## Requirements
Create a Server Action \`manageNote(action: 'create' | 'read', noteId: string, content?: string)\` that:

1. Reads a note if action is 'read'
2. Creates a note if action is 'create' (requires content)
3. Uses the collection \`users/{userId}/notes\`
4. Returns proper ActionResult type
5. Handles cases where note doesn't exist

## Expected Schema
\`\`\`typescript
{
  id: string;
  content: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
\`\`\`

## Tips
- Use \`await db.collection('users').doc(userId).collection('notes').doc(noteId).get()\`
- Check \`.exists\` property before reading data
- Use \`Timestamp.now()\` for dates
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';

// Your implementation here
`,
        hints: [
            'Import getAdminFirestore from @/firebase/admin',
            'Use Timestamp from @google-cloud/firestore for dates',
            'Always check .exists before accessing .data()',
            'Use subcollections: users/{uid}/notes/{noteId}',
        ],
        referenceDocs: [
            { title: 'Backend Reference', url: '/.agent/refs/backend.md' },
            { title: 'Firestore Docs', url: 'https://firebase.google.com/docs/firestore' },
        ],
        reviewCriteria: [
            { category: 'Firestore', weight: 0.4, description: 'Correct use of admin SDK and queries' },
            { category: 'TypeScript', weight: 0.3, description: 'Proper types for Firestore documents' },
            { category: 'Error Handling', weight: 0.2, description: 'Handles missing documents gracefully' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean and readable' },
        ],
        estimatedMinutes: 45,
        tags: ['firestore', 'crud', 'database'],
        isRequired: true,
    },

    // Challenge 2: Firestore Queries
    {
        id: 'week2-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 2,
        order: 2,
        title: 'Firestore Queries',
        description: 'Write queries with where clauses and ordering',
        difficulty: 'intermediate',
        instructions: `# Challenge: Firestore Queries

Learn to query Firestore collections with filters and sorting.

## Requirements
Create \`getUserProducts(userId: string, options?: { category?: string, minPrice?: number })\` that:

1. Queries \`products\` collection
2. Filters by userId (always required)
3. Optionally filters by category
4. Optionally filters by price >= minPrice
5. Orders by createdAt descending
6. Limits to 50 results
7. Returns array of products

## Tips
- Chain .where() calls for multiple filters
- Use .orderBy() for sorting
- Use .limit() to cap results
- Don't forget .get() to execute the query
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';

// Your implementation
`,
        hints: [
            'Chain where clauses: .where("userId", "==", userId).where("category", "==", category)',
            'Order descending: .orderBy("createdAt", "desc")',
            'Limit results: .limit(50)',
            'Map docs: snapshot.docs.map(doc => doc.data())',
        ],
        referenceDocs: [
            { title: 'Firestore Queries', url: 'https://firebase.google.com/docs/firestore/query-data/queries' },
        ],
        reviewCriteria: [
            { category: 'Query Construction', weight: 0.5, description: 'Correct use of where, orderBy, limit' },
            { category: 'TypeScript', weight: 0.3, description: 'Proper types and interfaces' },
            { category: 'Logic', weight: 0.2, description: 'Handles optional filters correctly' },
        ],
        estimatedMinutes: 50,
        tags: ['firestore', 'queries', 'filtering'],
        isRequired: true,
    },

    // Challenge 3: Data Validation with Zod
    {
        id: 'week2-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 2,
        order: 3,
        title: 'Data Validation with Zod',
        description: 'Validate input data before saving to Firestore',
        difficulty: 'intermediate',
        instructions: `# Challenge: Data Validation with Zod

Use Zod to validate user input before database operations.

## Requirements
Create \`createProduct(input: unknown)\` that:

1. Uses Zod schema to validate input
2. Requires: name (min 3 chars), price (positive number), category (enum)
3. Optional: description, imageUrl
4. Saves to Firestore if valid
5. Returns validation errors if invalid

## Schema Requirements
\`\`\`typescript
{
  name: string (min 3, max 100)
  price: number (min 0.01)
  category: 'flower' | 'edibles' | 'vapes' | 'other'
  description?: string (max 500)
  imageUrl?: string (url format)
}
\`\`\`
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { z } from 'zod';

// Define Zod schema here
`,
        hints: [
            'Use z.object() to define schema',
            'Use .parse() for validation (throws on error)',
            'Use .safeParse() for non-throwing validation',
            'Return validation errors in ActionResult',
        ],
        referenceDocs: [
            { title: 'Zod Documentation', url: 'https://zod.dev' },
        ],
        reviewCriteria: [
            { category: 'Validation', weight: 0.5, description: 'Complete and correct Zod schema' },
            { category: 'Error Handling', weight: 0.3, description: 'Properly returns validation errors' },
            { category: 'TypeScript', weight: 0.2, description: 'Uses inferred types from Zod' },
        ],
        estimatedMinutes: 45,
        tags: ['validation', 'zod', 'data-integrity'],
        isRequired: true,
    },

    // Challenge 4: Batch Operations
    {
        id: 'week2-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 2,
        order: 4,
        title: 'Firestore Batch Operations',
        description: 'Update multiple documents atomically',
        difficulty: 'intermediate',
        instructions: `# Challenge: Firestore Batch Operations

Learn to update multiple documents in a single transaction.

## Requirements
Create \`bulkUpdateStatus(productIds: string[], newStatus: string)\` that:

1. Updates status field for multiple products
2. Uses Firestore batch operations
3. All updates succeed or all fail (atomic)
4. Updates 'updatedAt' timestamp
5. Handles up to 500 products (Firestore batch limit)

## Tips
- Create batch: \`db.batch()\`
- Add operations: \`batch.update(ref, data)\`
- Commit: \`await batch.commit()\`
- Max 500 operations per batch
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';

// Your implementation
`,
        hints: [
            'const batch = db.batch()',
            'batch.update(db.doc(path), { field: value })',
            'await batch.commit()',
            'Check productIds.length <= 500',
        ],
        referenceDocs: [
            { title: 'Firestore Batched Writes', url: 'https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes' },
        ],
        reviewCriteria: [
            { category: 'Batch Operations', weight: 0.5, description: 'Correct use of batch API' },
            { category: 'Atomicity', weight: 0.3, description: 'Ensures all-or-nothing updates' },
            { category: 'Limits', weight: 0.2, description: 'Handles 500-doc batch limit' },
        ],
        estimatedMinutes: 55,
        tags: ['firestore', 'batch', 'transactions'],
        isRequired: true,
    },

    // Challenge 5: Subcollections & References
    {
        id: 'week2-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 2,
        order: 5,
        title: 'Subcollections & References',
        description: 'Work with nested data structures in Firestore',
        difficulty: 'advanced',
        instructions: `# Challenge: Subcollections & References

Learn to model hierarchical data with subcollections.

## Requirements
Create \`addOrderItem(orderId: string, item: OrderItem)\` that:

1. Adds item to \`orders/{orderId}/items\` subcollection
2. Updates parent order's \`totalAmount\` and \`itemCount\`
3. Uses a transaction to ensure consistency
4. Returns updated order data

## Data Structure
\`\`\`
orders/{orderId}
  - totalAmount: number
  - itemCount: number
  - createdAt: Timestamp
  items/{itemId}
    - productId: string
    - quantity: number
    - price: number
\`\`\`

## Tips
- Use transactions for consistency
- Access subcollections: \`orderRef.collection('items')\`
- Update parent and child in same transaction
`,
        starterCode: `'use server';

import { requireUser } from '@/server/auth/auth';
import { getAdminFirestore } from '@/firebase/admin';
import { Timestamp } from '@google-cloud/firestore';

// Your implementation
`,
        hints: [
            'Use db.runTransaction() for atomic updates',
            'Access subcollection: parentRef.collection("items")',
            'Update parent totals in same transaction',
            'transaction.get() before transaction.update()',
        ],
        referenceDocs: [
            { title: 'Firestore Transactions', url: 'https://firebase.google.com/docs/firestore/manage-data/transactions' },
        ],
        reviewCriteria: [
            { category: 'Transactions', weight: 0.4, description: 'Correct use of transactions' },
            { category: 'Subcollections', weight: 0.3, description: 'Proper subcollection access' },
            { category: 'Data Consistency', weight: 0.3, description: 'Maintains parent-child consistency' },
        ],
        estimatedMinutes: 60,
        tags: ['firestore', 'subcollections', 'transactions', 'advanced'],
        isRequired: false,
    },
];

/**
 * Helper function to get challenges for a specific week
 */
export function getChallengesForWeek(weekNumber: number): Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] {
    if (weekNumber === 1) return WEEK_1_CHALLENGES;
    if (weekNumber === 2) return WEEK_2_CHALLENGES;
    if (weekNumber === 3) return WEEK_3_CHALLENGES;
    if (weekNumber === 4) return WEEK_4_CHALLENGES;
    if (weekNumber === 5) return WEEK_5_CHALLENGES;
    if (weekNumber === 6) return WEEK_6_CHALLENGES;
    if (weekNumber === 7) return WEEK_7_CHALLENGES;
    if (weekNumber === 8) return WEEK_8_CHALLENGES;
    return [];
}

/**
 * Helper function to get all challenges
 */
export function getAllChallenges(): Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] {
    return [
        ...WEEK_1_CHALLENGES,
        ...WEEK_2_CHALLENGES,
        ...WEEK_3_CHALLENGES,
        ...WEEK_4_CHALLENGES,
        ...WEEK_5_CHALLENGES,
        ...WEEK_6_CHALLENGES,
        ...WEEK_7_CHALLENGES,
        ...WEEK_8_CHALLENGES,
    ];
}
