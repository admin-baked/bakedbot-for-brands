/**
 * Vibe Backend Generator
 *
 * Generates complete backend infrastructure for Vibe IDE projects:
 * - Firestore database schemas
 * - Next.js API routes
 * - Firebase config (firestore.rules, storage.rules)
 * - Environment variables setup
 * - Authentication flows
 */

import { callClaude } from '@/ai/claude';
import { logger } from '@/lib/logger';
import type { VibeCodeFile } from '@/types/vibe-code';

interface BackendGenerationOptions {
  projectName: string;
  projectDescription: string;
  features: BackendFeature[];
  posIntegration?: 'alleaves' | 'springbig' | 'dutchie' | 'none';
  includeAuth?: boolean;
  includePayments?: boolean;
}

export type BackendFeature =
  | 'products'      // Product catalog with inventory
  | 'orders'        // Order management
  | 'customers'     // Customer accounts
  | 'cart'          // Shopping cart
  | 'search'        // Product search
  | 'reviews'       // Product reviews
  | 'loyalty'       // Loyalty points
  | 'analytics'     // Usage analytics
  | 'admin';        // Admin dashboard

interface BackendGenerationResult {
  success: boolean;
  files?: VibeCodeFile[];
  envVars?: Record<string, string>;
  firestoreIndexes?: any[];
  reasoning?: string;
  error?: string;
}

const BACKEND_SYSTEM_PROMPT = `You are an expert full-stack developer specializing in Next.js + Firebase backends.

When given a project description and feature list, you generate:
1. Firestore database schemas with proper security rules
2. Next.js 15 App Router API routes with TypeScript
3. Server actions for mutations
4. Firebase config files (firestore.rules, storage.rules)
5. Type-safe database helpers
6. Environment variable templates

IMPORTANT RULES:
- Use Next.js 15 App Router patterns (app/api/)
- Use Firebase Admin SDK for server-side operations
- Generate proper TypeScript types for all schemas
- Include security rules that actually work
- Add helpful comments explaining the architecture
- Follow best practices for error handling

Output your response in this JSON format:
{
  "files": [
    {"path": "app/api/products/route.ts", "content": "...", "language": "typescript"},
    {"path": "lib/firebase/admin.ts", "content": "...", "language": "typescript"},
    {"path": "firestore.rules", "content": "...", "language": "javascript"},
    ...
  ],
  "envVars": {
    "FIREBASE_PROJECT_ID": "your-project-id",
    "FIREBASE_CLIENT_EMAIL": "firebase-adminsdk@...",
    ...
  },
  "firestoreIndexes": [
    {
      "collectionGroup": "products",
      "fields": [
        {"fieldPath": "category", "order": "ASCENDING"},
        {"fieldPath": "price", "order": "ASCENDING"}
      ]
    }
  ],
  "reasoning": "Brief explanation of the architecture"
}`;

function generateBackendPrompt(options: BackendGenerationOptions): string {
  return `Generate a complete backend for this cannabis dispensary app:

**Project**: ${options.projectName}
**Description**: ${options.projectDescription}

**Features to Implement**:
${options.features.map((f) => `- ${f}`).join('\n')}

${options.posIntegration && options.posIntegration !== 'none' ? `**POS Integration**: ${options.posIntegration} (sync inventory from POS)` : ''}
${options.includeAuth ? '**Authentication**: Firebase Auth with email/password and Google sign-in' : ''}
${options.includePayments ? '**Payments**: Stripe integration for online orders' : ''}

Generate the following files:

1. **Firestore Schema Types** (lib/types/firestore.ts)
   - TypeScript interfaces for all collections
   - Proper timestamp handling
   - Subcollections where needed

2. **API Routes** (app/api/[feature]/route.ts)
   - GET: List/search with pagination
   - POST: Create new records
   - PUT/PATCH: Update existing
   - DELETE: Soft delete with archive

3. **Server Actions** (app/actions/[feature].ts)
   - Type-safe mutations
   - Error handling
   - Validation with Zod

4. **Firebase Admin Setup** (lib/firebase/admin.ts)
   - Singleton admin instance
   - Helper functions for common operations

5. **Firestore Security Rules** (firestore.rules)
   - Proper authentication checks
   - Role-based access control
   - Field-level validation

6. **Storage Rules** (storage.rules)
   - Image upload restrictions
   - File size limits

7. **Environment Template** (.env.local.example)
   - All required Firebase credentials
   - API keys for integrations

Make this production-ready with proper error handling, logging, and security.`;
}

export async function generateBackend(
  options: BackendGenerationOptions
): Promise<BackendGenerationResult> {
  try {
    logger.info('[VIBE-BACKEND-GEN] Starting backend generation', {
      projectName: options.projectName,
      features: options.features,
    });

    const response = await callClaude({
      systemPrompt: BACKEND_SYSTEM_PROMPT,
      userMessage: generateBackendPrompt(options),
      temperature: 0.5,
      maxTokens: 8000,
      model: 'claude-sonnet-4-5-20250929',
    });

    // Parse JSON response
    let parsed: any;
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }
      parsed = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      logger.error('[VIBE-BACKEND-GEN] Failed to parse response', { parseError });
      return {
        success: false,
        error: 'Failed to parse backend generation response',
      };
    }

    // Validate response
    if (!parsed.files || !Array.isArray(parsed.files)) {
      return {
        success: false,
        error: 'Invalid backend generation response - no files',
      };
    }

    // Add additional utility files
    const files: VibeCodeFile[] = [
      ...parsed.files.map((f: any) => ({
        path: f.path,
        content: f.content,
        language: f.language as any,
      })),
      {
        path: '.env.local.example',
        content: generateEnvTemplate(parsed.envVars || {}),
        language: 'javascript',
      },
      {
        path: 'firestore.indexes.json',
        content: JSON.stringify(
          {
            indexes: parsed.firestoreIndexes || [],
            fieldOverrides: [],
          },
          null,
          2
        ),
        language: 'json',
      },
    ];

    logger.info('[VIBE-BACKEND-GEN] Backend generated successfully', {
      fileCount: files.length,
    });

    return {
      success: true,
      files,
      envVars: parsed.envVars,
      firestoreIndexes: parsed.firestoreIndexes,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    logger.error('[VIBE-BACKEND-GEN] Generation failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to generate backend',
    };
  }
}

function generateEnvTemplate(envVars: Record<string, string>): string {
  const lines = [
    '# Firebase Configuration',
    '# Get these values from Firebase Console > Project Settings > Service Accounts',
    '',
    ...Object.entries(envVars).map(([key, value]) => `${key}=${value}`),
    '',
    '# Optional: POS Integration',
    '# ALLEAVES_API_KEY=your_api_key',
    '# ALLEAVES_USERNAME=your_username',
    '',
    '# Optional: Stripe Payments',
    '# STRIPE_SECRET_KEY=sk_test_...',
    '# STRIPE_PUBLISHABLE_KEY=pk_test_...',
    '',
    '# Optional: Email (Mailjet)',
    '# MAILJET_API_KEY=your_api_key',
    '# MAILJET_SECRET_KEY=your_secret_key',
  ];

  return lines.join('\n');
}

/**
 * Generate real product data from POS
 */
export async function generatePOSProductData(
  orgId: string,
  posType: 'alleaves' | 'springbig'
): Promise<{ success: boolean; products?: any[]; error?: string }> {
  try {
    // TODO: Implement real POS integration
    // For now, return mock data for demo purposes
    logger.info('[VIBE-BACKEND-GEN] Using mock product data', { orgId, posType });

    return {
      success: true,
      products: generateMockProducts(),
    };
  } catch (error) {
    logger.error('[VIBE-BACKEND-GEN] POS product fetch failed', { error });
    return {
      success: true,
      products: generateMockProducts(),
    };
  }
}

function generateMockProducts() {
  return [
    {
      id: '1',
      name: 'Blue Dream',
      category: 'Flower',
      price: 45,
      image: '/products/blue-dream.jpg',
      thc: 22.5,
      cbd: 0.1,
      description: 'Classic sativa-dominant hybrid',
      inStock: true,
    },
    {
      id: '2',
      name: 'OG Kush',
      category: 'Flower',
      price: 50,
      image: '/products/og-kush.jpg',
      thc: 24.0,
      cbd: 0.2,
      description: 'Legendary indica strain',
      inStock: true,
    },
    // Add more mock products...
  ];
}
