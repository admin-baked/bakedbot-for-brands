/**
 * Week 7-8 Challenges
 * Advanced Patterns and Capstone Project
 */

import type { TrainingChallenge } from '@/types/training';

/**
 * Week 7 Challenges - Advanced Patterns
 */
export const WEEK_7_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    // Challenge 1: Letta Memory Service
    {
        id: 'week7-ch1',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 7,
        order: 1,
        title: 'Integrate Letta Memory',
        description: 'Use Letta for persistent agent memory',
        difficulty: 'advanced',
        instructions: `# Challenge: Integrate Letta Memory

Learn to use Letta for persistent agent memory across conversations.

## Learning Objectives
- Understand agent memory systems
- Use Letta API for memory storage
- Retrieve and use past context
- Build memory-aware agents

## What is Letta?
Letta is BakedBot's memory service that:
- Stores conversation history
- Maintains agent context
- Enables personalization
- Powers the "Hive Mind" for executive agents

## Requirements
Create a memory-aware customer service agent that:

1. Saves customer interactions to Letta
2. Retrieves past conversations
3. Personalizes responses based on history
4. Maintains context across sessions

## Letta Integration
\`\`\`typescript
import { saveFact, searchMemory } from '@/server/services/letta';

// Save interaction
await saveFact({
  agent: 'customer-service',
  userId: user.uid,
  fact: 'Customer prefers indica strains',
  category: 'preferences',
});

// Retrieve memories
const memories = await searchMemory({
  agent: 'customer-service',
  userId: user.uid,
  query: 'product preferences',
});
\`\`\`

## Example Usage
\`\`\`
First conversation:
User: "I love relaxing strains"
Agent: *saves preference*

Next conversation (days later):
User: "What do you recommend?"
Agent: *retrieves memory*
"Based on your preference for relaxing strains,
 I recommend our Grandaddy Purple..."
\`\`\`

## Memory Categories
- **preferences**: User likes/dislikes
- **orders**: Past purchases
- **issues**: Support tickets
- **context**: Important facts
`,
        starterCode: `import { saveFact, searchMemory } from '@/server/services/letta';
import { defineAgent } from '@genkit-ai/ai';
import { gemini15Flash } from '@genkit-ai/googleai';

export const memoryAwareAgent = defineAgent({
  name: 'memoryAwareAgent',
  model: gemini15Flash,
  systemPrompt: \`
    You are a personalized customer service agent.
    You have access to customer history and preferences.
    Use this context to provide tailored recommendations.
  \`,
});

export async function runWithMemory(input: {
  userId: string;
  query: string;
}) {
  // 1. Retrieve relevant memories
  const memories = await searchMemory({
    agent: 'customer-service',
    userId: input.userId,
    query: input.query,
  });

  // 2. Augment prompt with memories
  const enrichedPrompt = \`
    Customer query: \${input.query}

    Past context:
    \${memories.map(m => \`- \${m.fact}\`).join('\\n')}
  \`;

  // 3. Get agent response
  const response = await memoryAwareAgent.run({
    prompt: enrichedPrompt,
  });

  // 4. Save new facts from this interaction
  // ... extract and save important facts

  return response;
}`,
        hints: [
            'Save facts after each interaction',
            'Search memories before generating responses',
            'Use semantic search for relevant context',
            'Store structured data in memory',
        ],
        referenceDocs: [
            { title: 'Letta Intelligence', url: '/.agent/refs/bakedbot-intelligence.md' },
            { title: 'Memory Service', url: '/src/server/services/letta' },
        ],
        reviewCriteria: [
            { category: 'Memory Integration', weight: 0.4, description: 'Correctly saves and retrieves memories' },
            { category: 'Personalization', weight: 0.3, description: 'Uses memories to personalize responses' },
            { category: 'Context Management', weight: 0.2, description: 'Maintains context across sessions' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean, maintainable' },
        ],
        estimatedMinutes: 90,
        tags: ['ai', 'letta', 'memory', 'advanced'],
        isRequired: true,
    },

    // Challenge 2: RTRVR Browser Automation
    {
        id: 'week7-ch2',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 7,
        order: 2,
        title: 'Automate Browser Tasks with RTRVR',
        description: 'Use RTRVR for autonomous web scraping and automation',
        difficulty: 'advanced',
        instructions: `# Challenge: Automate Browser Tasks with RTRVR

Learn to use RTRVR for autonomous browser automation.

## Learning Objectives
- Understand autonomous browsing
- Use RTRVR for web tasks
- Extract data from websites
- Handle dynamic content

## What is RTRVR?
RTRVR is BakedBot's autonomous browser agent that:
- Navigates websites intelligently
- Extracts structured data
- Handles JavaScript-heavy sites
- Powers competitive intelligence (Ezal)

## Requirements
Create a competitor price scraper that:

1. Navigates to competitor website
2. Finds product pages
3. Extracts prices and availability
4. Stores data in Firestore
5. Runs on schedule

## RTRVR Integration
\`\`\`typescript
import { navigateAndExtract } from '@/server/services/rtrvr';

const result = await navigateAndExtract({
  url: 'https://competitor.com/products',
  task: 'Find all products and their prices',
  schema: {
    products: [{
      name: 'string',
      price: 'number',
      inStock: 'boolean',
    }],
  },
});
\`\`\`

## Example Task
\`\`\`
Goal: Monitor competitor pricing

Steps:
1. Navigate to competitor site
2. Find product listings
3. Extract: name, price, stock status
4. Save to competitorProducts collection
5. Alert if prices change significantly
\`\`\`

## Handling Challenges
- **Anti-bot measures**: RTRVR has stealth mode
- **Dynamic content**: RTRVR waits for JS to load
- **Pagination**: RTRVR can navigate multiple pages
- **Rate limiting**: Add delays between requests
`,
        starterCode: `import { navigateAndExtract } from '@/server/services/rtrvr';
import { getAdminFirestore } from '@/firebase/admin';

export async function scrapeCompetitorPrices(competitorUrl: string) {
  try {
    // 1. Use RTRVR to navigate and extract
    const result = await navigateAndExtract({
      url: competitorUrl,
      task: 'Extract all product names, prices, and stock status',
      schema: {
        products: [{
          name: 'string',
          price: 'number',
          inStock: 'boolean',
          url: 'string',
        }],
      },
    });

    // 2. Process extracted data
    const db = getAdminFirestore();
    const batch = db.batch();

    for (const product of result.products) {
      const ref = db.collection('competitorProducts').doc();
      batch.set(ref, {
        ...product,
        competitor: competitorUrl,
        scrapedAt: new Date(),
      });
    }

    await batch.commit();

    return {
      success: true,
      productsFound: result.products.length,
    };
  } catch (error) {
    // Handle errors
  }
}`,
        hints: [
            'RTRVR handles JavaScript rendering automatically',
            'Use structured schemas for reliable extraction',
            'Add error handling for network issues',
            'Respect robots.txt and rate limits',
        ],
        referenceDocs: [
            { title: 'Autonomous Browsing', url: '/.agent/refs/autonomous-browsing.md' },
            { title: 'RTRVR Service', url: '/src/server/services/rtrvr' },
        ],
        reviewCriteria: [
            { category: 'RTRVR Usage', weight: 0.4, description: 'Correct use of RTRVR API' },
            { category: 'Data Extraction', weight: 0.3, description: 'Extracts accurate data' },
            { category: 'Error Handling', weight: 0.2, description: 'Handles failures gracefully' },
            { category: 'Ethics', weight: 0.1, description: 'Respects robots.txt and rate limits' },
        ],
        estimatedMinutes: 90,
        tags: ['rtrvr', 'automation', 'scraping', 'advanced'],
        isRequired: true,
    },

    // Challenge 3: Background Jobs & Scheduling
    {
        id: 'week7-ch3',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 7,
        order: 3,
        title: 'Schedule Background Jobs',
        description: 'Use Cloud Scheduler for periodic tasks',
        difficulty: 'intermediate',
        instructions: `# Challenge: Schedule Background Jobs

Learn to run tasks on a schedule with Cloud Scheduler.

## Learning Objectives
- Understand cron syntax
- Create scheduled functions
- Handle long-running tasks
- Monitor job execution

## Requirements
Create a daily competitor sync job that:

1. Runs every night at 2 AM
2. Scrapes competitor websites
3. Updates price tracking data
4. Sends alert if significant changes
5. Logs execution status

## Cloud Scheduler Setup
\`\`\`yaml
# In your Cloud Scheduler config
schedule: "0 2 * * *"  # 2 AM daily
timezone: "America/New_York"
targetUri: "https://your-app.com/api/cron/competitor-sync"
httpMethod: "POST"
headers:
  Authorization: "Bearer [SECRET_TOKEN]"
\`\`\`

## Cron API Route
\`\`\`typescript
// app/api/cron/competitor-sync/route.ts
export async function POST(request: NextRequest) {
  // 1. Verify cron secret
  const secret = request.headers.get('authorization');
  if (secret !== \`Bearer \${process.env.CRON_SECRET}\`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Run sync task
  await syncCompetitorData();

  // 3. Return success
  return NextResponse.json({ success: true });
}
\`\`\`

## Cron Patterns
\`\`\`
* * * * *
│ │ │ │ │
│ │ │ │ └─ Day of week (0-7)
│ │ │ └─── Month (1-12)
│ │ └───── Day of month (1-31)
│ └─────── Hour (0-23)
└───────── Minute (0-59)

Examples:
0 2 * * *      = Daily at 2 AM
0 */4 * * *    = Every 4 hours
0 9 * * 1-5    = Weekdays at 9 AM
*/15 * * * *   = Every 15 minutes
\`\`\`
`,
        starterCode: `// app/api/cron/competitor-sync/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { scrapeCompetitorPrices } from '@/server/services/competitor-sync';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify authorization
    const authHeader = request.headers.get('authorization');
    const expectedAuth = \`Bearer \${process.env.CRON_SECRET}\`;

    if (authHeader !== expectedAuth) {
      logger.warn('Unauthorized cron attempt');
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Execute sync
    logger.info('Starting competitor sync job');

    const competitors = [
      'https://competitor-a.com',
      'https://competitor-b.com',
    ];

    const results = await Promise.all(
      competitors.map(url => scrapeCompetitorPrices(url))
    );

    // 3. Log results
    logger.info('Competitor sync completed', { results });

    return NextResponse.json({
      success: true,
      synced: results.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error('Competitor sync failed', error);
    return NextResponse.json(
      { error: 'Sync failed' },
      { status: 500 }
    );
  }
}`,
        hints: [
            'Use environment variables for secrets',
            'Always verify cron authorization',
            'Log execution for debugging',
            'Handle failures gracefully',
        ],
        referenceDocs: [
            { title: 'Cloud Scheduler', url: 'https://cloud.google.com/scheduler/docs' },
            { title: 'Cron Syntax', url: 'https://crontab.guru' },
        ],
        reviewCriteria: [
            { category: 'Security', weight: 0.3, description: 'Proper authorization checks' },
            { category: 'Implementation', weight: 0.3, description: 'Correct cron route setup' },
            { category: 'Error Handling', weight: 0.2, description: 'Handles failures properly' },
            { category: 'Logging', weight: 0.2, description: 'Good logging for monitoring' },
        ],
        estimatedMinutes: 60,
        tags: ['scheduling', 'cron', 'background-jobs'],
        isRequired: true,
    },

    // Challenge 4: Real-time Updates
    {
        id: 'week7-ch4',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 7,
        order: 4,
        title: 'Implement Real-time Updates',
        description: 'Use Firestore listeners for live data',
        difficulty: 'intermediate',
        instructions: `# Challenge: Implement Real-time Updates

Learn to use Firestore real-time listeners for live updates.

## Learning Objectives
- Set up Firestore listeners
- Handle real-time data streams
- Update UI reactively
- Clean up subscriptions

## Requirements
Build a live order tracking system that:

1. Listens to order status changes
2. Updates UI in real-time
3. Shows notifications on updates
4. Handles connection issues
5. Cleans up on unmount

## Firestore Listener
\`\`\`typescript
// Client-side listener
const unsubscribe = onSnapshot(
  doc(db, 'orders', orderId),
  (snapshot) => {
    const order = snapshot.data();
    setOrder(order);

    // Show notification if status changed
    if (order.status !== previousStatus) {
      toast({
        title: 'Order Updated',
        description: \`Status: \${order.status}\`,
      });
    }
  },
  (error) => {
    console.error('Listener error:', error);
  }
);

// Clean up on unmount
return () => unsubscribe();
\`\`\`

## Component Structure
\`\`\`tsx
export function OrderTracker({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const db = getFirestore();
    const orderRef = doc(db, 'orders', orderId);

    const unsubscribe = onSnapshot(
      orderRef,
      (snapshot) => {
        setOrder(snapshot.data());
        setLoading(false);
      },
      (error) => {
        console.error(error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [orderId]);

  if (loading) return <Skeleton />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order #{order.id}</CardTitle>
      </CardHeader>
      <CardContent>
        <StatusBadge status={order.status} />
        <p>Updates in real-time</p>
      </CardContent>
    </Card>
  );
}
\`\`\`
`,
        starterCode: `'use client';

import { useEffect, useState } from 'react';
import { getFirestore, doc, onSnapshot } from 'firebase/firestore';
import { useFirebase } from '@/firebase/provider';

export function OrderTracker({ orderId }: { orderId: string }) {
  const { db } = useFirebase();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    // Set up real-time listener

    // Return cleanup function
  }, [orderId]);

  return (
    // Your UI
  );
}`,
        hints: [
            'Use onSnapshot for real-time updates',
            'Always return cleanup function from useEffect',
            'Handle loading and error states',
            'Show user-friendly notifications on changes',
        ],
        referenceDocs: [
            { title: 'Firestore Listeners', url: 'https://firebase.google.com/docs/firestore/query-data/listen' },
        ],
        reviewCriteria: [
            { category: 'Real-time Updates', weight: 0.4, description: 'Correctly implements listeners' },
            { category: 'Cleanup', weight: 0.3, description: 'Properly unsubscribes' },
            { category: 'UX', weight: 0.2, description: 'Shows updates smoothly' },
            { category: 'Error Handling', weight: 0.1, description: 'Handles connection issues' },
        ],
        estimatedMinutes: 60,
        tags: ['real-time', 'firestore', 'subscriptions'],
        isRequired: true,
    },

    // Challenge 5: Performance Optimization
    {
        id: 'week7-ch5',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 7,
        order: 5,
        title: 'Optimize Application Performance',
        description: 'Apply performance best practices',
        difficulty: 'advanced',
        instructions: `# Challenge: Optimize Application Performance

Learn to identify and fix performance issues.

## Learning Objectives
- Profile app performance
- Implement memoization
- Optimize re-renders
- Use code splitting

## Requirements
Optimize a slow component by:

1. Using React.memo for expensive components
2. Implementing useMemo for expensive calculations
3. Using useCallback for event handlers
4. Adding dynamic imports for code splitting
5. Measuring improvements

## Performance Patterns

### 1. React.memo
\`\`\`typescript
export const ProductCard = React.memo(({ product }) => {
  // Only re-renders if product changes
  return <Card>{/* ... */}</Card>;
});
\`\`\`

### 2. useMemo
\`\`\`typescript
const filteredProducts = useMemo(() => {
  return products.filter(p => p.category === selectedCategory);
}, [products, selectedCategory]);
\`\`\`

### 3. useCallback
\`\`\`typescript
const handleAdd = useCallback((productId: string) => {
  addToCart(productId);
}, [addToCart]);
\`\`\`

### 4. Dynamic Imports
\`\`\`typescript
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
});
\`\`\`

## Measurement
\`\`\`typescript
// Before optimization
console.time('render');
// ... render
console.timeEnd('render');
// Output: render: 850ms

// After optimization
// Output: render: 120ms
\`\`\`
`,
        starterCode: `// Find a slow component and optimize it

import React, { useMemo, useCallback } from 'react';
import dynamic from 'next/dynamic';

// Example slow component
export function ProductList({ products, onAddToCart }) {
  // This filters on every render (slow!)
  const filtered = products.filter(p => p.inStock);

  return (
    <div>
      {filtered.map(product => (
        <ProductCard
          key={product.id}
          product={product}
          onAdd={() => onAddToCart(product.id)}
        />
      ))}
    </div>
  );
}

// Optimize this component`,
        hints: [
            'Use React DevTools Profiler',
            'Memoize expensive calculations',
            'Prevent unnecessary re-renders',
            'Lazy load heavy components',
        ],
        referenceDocs: [
            { title: 'React Performance', url: 'https://react.dev/learn/render-and-commit' },
        ],
        reviewCriteria: [
            { category: 'Optimization', weight: 0.4, description: 'Applies correct optimizations' },
            { category: 'Measurement', weight: 0.3, description: 'Shows performance improvements' },
            { category: 'Best Practices', weight: 0.2, description: 'Follows React patterns' },
            { category: 'Code Quality', weight: 0.1, description: 'Clean implementation' },
        ],
        estimatedMinutes: 75,
        tags: ['performance', 'optimization', 'react'],
        isRequired: false,
    },
];

/**
 * Week 8 Challenge - Capstone Project
 */
export const WEEK_8_CHALLENGES: Omit<TrainingChallenge, 'createdAt' | 'updatedAt'>[] = [
    {
        id: 'week8-capstone',
        programId: 'bakedbot-builder-bootcamp-v1',
        weekNumber: 8,
        order: 1,
        title: 'Capstone Project: Build a Complete Feature',
        description: 'Design and implement a full-stack feature end-to-end',
        difficulty: 'advanced',
        instructions: `# Capstone Project: Build a Complete Feature

Apply everything you've learned to build a production-ready feature.

## Project Goal
Build a complete feature from design to deployment that adds value to BakedBot.

## Requirements

### 1. Planning Phase (Day 1)
- [ ] Choose a feature idea
- [ ] Write technical design doc
- [ ] Get approval from mentor
- [ ] Break down into tasks
- [ ] Estimate timeline

### 2. Implementation Phase (Days 2-4)
- [ ] Set up database schema
- [ ] Create Server Actions
- [ ] Build UI components
- [ ] Integrate with agents (if applicable)
- [ ] Add error handling

### 3. Testing Phase (Day 5)
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Test manually
- [ ] Fix bugs
- [ ] Achieve >80% coverage

### 4. Documentation Phase (Day 6)
- [ ] Write README
- [ ] Add inline comments
- [ ] Document API endpoints
- [ ] Create user guide
- [ ] Update relevant docs

### 5. Deployment Phase (Day 7)
- [ ] Create PR with description
- [ ] Pass CI/CD checks
- [ ] Get code review
- [ ] Deploy to staging
- [ ] Verify in production

### 6. Presentation (Day 8)
- [ ] Prepare demo
- [ ] Present to team
- [ ] Gather feedback
- [ ] Document lessons learned

## Feature Ideas

### Option 1: Smart Inventory Alerts
Build a system that:
- Monitors inventory levels
- Predicts stockouts using sales data
- Sends alerts before items run out
- Suggests reorder quantities

**Tech Stack:**
- Firestore queries for inventory
- Cloud Scheduler for periodic checks
- Server Actions for alerts
- Email/SMS integration

### Option 2: Customer Loyalty Dashboard
Build a dashboard that:
- Tracks customer purchase history
- Calculates loyalty points
- Shows tier progress
- Generates reward codes

**Tech Stack:**
- React dashboard with charts
- Server Actions for calculations
- Real-time Firestore listeners
- Export to CSV functionality

### Option 3: AI Product Recommendations
Build a recommendation engine that:
- Analyzes customer preferences
- Uses AI to suggest products
- Learns from interactions
- Integrates with Smokey agent

**Tech Stack:**
- Genkit for AI recommendations
- Letta for preference memory
- React UI for suggestions
- A/B testing framework

### Option 4: Competitor Price Monitor
Build a monitoring system that:
- Scrapes competitor websites
- Tracks price changes
- Alerts on significant drops
- Visualizes trends

**Tech Stack:**
- RTRVR for web scraping
- Firestore for price history
- Charts for visualization
- Scheduled jobs for updates

## Deliverables

1. **Code**
   - Full implementation in feature branch
   - Follows BakedBot coding standards
   - Passes all checks

2. **Tests**
   - Unit tests for logic
   - Integration tests for flows
   - >80% coverage

3. **Documentation**
   - Technical design doc
   - README with setup instructions
   - API documentation
   - User guide

4. **Demo**
   - 10-15 minute presentation
   - Live demo of feature
   - Code walkthrough
   - Q&A session

## Evaluation Criteria

### Code Quality (30%)
- Follows standards
- Clean architecture
- Proper error handling
- Well-structured

### Feature Completeness (25%)
- Meets requirements
- Works end-to-end
- Handles edge cases
- Production-ready

### Testing (20%)
- Good test coverage
- Tests are meaningful
- All tests pass
- Includes integration tests

### Documentation (15%)
- Clear and complete
- Easy to understand
- Includes examples
- Up-to-date

### Presentation (10%)
- Clear communication
- Good demo
- Answers questions
- Shows understanding

## Timeline

**Week 8 Schedule:**
- **Mon**: Planning & Design
- **Tue-Thu**: Implementation
- **Fri**: Testing & Bug Fixes
- **Sat**: Documentation
- **Sun**: PR & Deployment
- **Mon**: Presentation

## Tips for Success

1. **Start Small**
   - Build MVP first
   - Add features incrementally
   - Test as you go

2. **Ask for Help**
   - Reach out when stuck
   - Review with mentor daily
   - Pair program if needed

3. **Document Everything**
   - Write docs as you code
   - Explain your decisions
   - Keep notes of challenges

4. **Test Thoroughly**
   - Don't skip testing
   - Test edge cases
   - Manual testing too

5. **Practice Your Demo**
   - Rehearse presentation
   - Prepare for questions
   - Have backup plans

## Submission

1. Create PR with template:
\`\`\`markdown
## Capstone Project: [Feature Name]

### Overview
[Brief description]

### Implementation
- [List key components]
- [Explain architecture]

### Testing
- [Coverage report]
- [Test strategy]

### Demo
- [Link to demo video]
- [Screenshots]

### Lessons Learned
- [What went well]
- [What was challenging]
- [What you learned]
\`\`\`

2. Schedule presentation with team

3. Get feedback and iterate

## Congratulations!

You've completed the BakedBot Builder Bootcamp! 🎉

You're now ready to:
- Ship production code
- Contribute to BakedBot
- Build AI-powered features
- Mentor future interns

Welcome to the team! 🚀
`,
        starterCode: `// No starter code - this is YOUR project!
//
// Pick a feature idea, plan it out, and build it from scratch.
// You have all the tools and knowledge you need.
//
// Remember:
// 1. Start with a good plan
// 2. Build incrementally
// 3. Test thoroughly
// 4. Document well
// 5. Ship with confidence
//
// Good luck! 🍀`,
        hints: [
            'Choose a feature that excites you',
            'Break it down into small tasks',
            'Get feedback early and often',
            'Don\'t be afraid to pivot if needed',
            'Focus on quality over quantity',
        ],
        referenceDocs: [
            { title: 'All previous challenges', url: '/dashboard/training' },
            { title: 'CLAUDE.md', url: '/CLAUDE.md' },
            { title: '.agent/refs/', url: '/.agent/refs/' },
        ],
        reviewCriteria: [
            { category: 'Code Quality', weight: 0.3, description: 'Clean, maintainable, follows standards' },
            { category: 'Feature Completeness', weight: 0.25, description: 'Works end-to-end, production-ready' },
            { category: 'Testing', weight: 0.2, description: 'Good coverage, meaningful tests' },
            { category: 'Documentation', weight: 0.15, description: 'Clear, complete documentation' },
            { category: 'Presentation', weight: 0.1, description: 'Clear demo and communication' },
        ],
        estimatedMinutes: 2400, // ~8 days
        tags: ['capstone', 'full-stack', 'project'],
        isRequired: true,
    },
];
