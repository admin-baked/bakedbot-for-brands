'use server';

/**
 * Vibe Full-Stack Conversion Actions
 *
 * Converts free frontend-only projects to paid full-stack apps with backend.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { generateBackend, generatePOSProductData } from '@/server/services/vibe-backend-generator';
import { deployToFirebase, allocateSubdomain, generateDeploymentInstructions } from '@/server/services/vibe-deployment';
import type { VibeCodeProject } from '@/types/vibe-code';
import type { BackendFeature } from '@/server/services/vibe-backend-generator';

interface ConversionOptions {
  projectId: string;
  userId: string;
  orgId?: string; // For POS integration
  features: BackendFeature[];
  includeAuth: boolean;
  includePOS: boolean;
  deployImmediately: boolean;
}

interface ConversionResult {
  success: boolean;
  project?: VibeCodeProject;
  deploymentUrl?: string;
  error?: string;
  reasoning?: string;
}

// ============================================
// CONVERT TO FULL-STACK
// ============================================

export async function convertToFullStack(
  options: ConversionOptions
): Promise<ConversionResult> {
  try {
    logger.info('[VIBE-CONVERT] Starting conversion', {
      projectId: options.projectId,
      userId: options.userId,
      features: options.features,
    });

    const db = getAdminFirestore();

    // 1. Get existing project
    const projectDoc = await db.collection('vibe_ide_projects').doc(options.projectId).get();
    if (!projectDoc.exists) {
      return { success: false, error: 'Project not found' };
    }

    const project = projectDoc.data() as VibeCodeProject;

    // 2. Generate backend files
    logger.info('[VIBE-CONVERT] Generating backend');
    const backendResult = await generateBackend({
      projectName: project.name,
      projectDescription: project.description,
      features: options.features,
      posIntegration: options.includePOS && options.orgId ? 'alleaves' : 'none',
      includeAuth: options.includeAuth,
      includePayments: false, // TODO: Add Stripe integration
    });

    if (!backendResult.success || !backendResult.files) {
      return {
        success: false,
        error: backendResult.error || 'Backend generation failed',
      };
    }

    // 3. Get real product data from POS (if enabled)
    let productData: any[] = [];
    if (options.includePOS && options.orgId) {
      logger.info('[VIBE-CONVERT] Fetching POS product data');
      const posResult = await generatePOSProductData(options.orgId, 'alleaves');
      if (posResult.success && posResult.products) {
        productData = posResult.products;
      }
    }

    // 4. Update lib/products.ts with real data
    const productsFile = backendResult.files.find((f) => f.path === 'lib/products.ts');
    if (productsFile && productData.length > 0) {
      productsFile.content = `// Generated from ${options.includePOS ? 'POS' : 'mock'} data
export const products = ${JSON.stringify(productData, null, 2)};
`;
    }

    // 5. Merge backend files into project
    const updatedFiles = [
      ...project.files,
      ...backendResult.files,
    ];

    // 6. Update package.json with new dependencies
    const packageJsonFile = updatedFiles.find((f) => f.path === 'package.json');
    if (packageJsonFile) {
      const packageJson = JSON.parse(packageJsonFile.content);
      packageJson.dependencies = {
        ...packageJson.dependencies,
        '@google-cloud/firestore': '^7.0.0',
        'firebase-admin': '^12.0.0',
        'zod': '^3.22.0',
      };
      packageJsonFile.content = JSON.stringify(packageJson, null, 2);
    }

    // 7. Add deployment instructions
    updatedFiles.push({
      path: 'DEPLOYMENT.md',
      content: generateDeploymentInstructions(project.name),
      language: 'html',
    });

    // 8. Create full-stack project
    const fullStackProject: VibeCodeProject = {
      ...project,
      files: updatedFiles,
      updatedAt: new Date().toISOString(),
    };

    // 9. Save to database
    await db.collection('vibe_ide_projects').doc(options.projectId).update({
      files: fullStackProject.files,
      isFullStack: true,
      backendGenerated: true,
      updatedAt: fullStackProject.updatedAt,
    });

    // 10. Deploy if requested
    let deploymentUrl: string | undefined;
    if (options.deployImmediately) {
      logger.info('[VIBE-CONVERT] Deploying to Firebase');

      // Allocate subdomain
      const subdomainResult = await allocateSubdomain(options.userId, project.name);
      if (!subdomainResult.success || !subdomainResult.subdomain) {
        return {
          success: false,
          error: 'Failed to allocate subdomain',
        };
      }

      // Deploy
      const deployResult = await deployToFirebase({
        project: fullStackProject,
        userId: options.userId,
        subdomain: subdomainResult.subdomain,
      });

      if (!deployResult.success) {
        return {
          success: false,
          error: deployResult.error || 'Deployment failed',
        };
      }

      deploymentUrl = deployResult.deploymentUrl;

      // Save deployment info
      await db.collection('vibe_deployments').add({
        projectId: options.projectId,
        userId: options.userId,
        subdomain: subdomainResult.subdomain,
        deploymentUrl,
        status: 'deployed',
        createdAt: new Date().toISOString(),
      });
    }

    logger.info('[VIBE-CONVERT] Conversion completed', {
      projectId: options.projectId,
      deployed: !!deploymentUrl,
    });

    return {
      success: true,
      project: fullStackProject,
      deploymentUrl,
      reasoning: backendResult.reasoning,
    };
  } catch (error) {
    logger.error('[VIBE-CONVERT] Conversion failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    return {
      success: false,
      error: 'Failed to convert to full-stack',
    };
  }
}

// ============================================
// CHECK CONVERSION ELIGIBILITY
// ============================================

export async function checkConversionEligibility(
  projectId: string,
  userId: string
): Promise<{
  eligible: boolean;
  reason?: string;
  isPaidUser?: boolean;
  currentPlan?: string;
}> {
  try {
    const db = getAdminFirestore();

    // Check if project exists
    const projectDoc = await db.collection('vibe_ide_projects').doc(projectId).get();
    if (!projectDoc.exists) {
      return {
        eligible: false,
        reason: 'Project not found',
      };
    }

    const project = projectDoc.data() as VibeCodeProject;

    // Check if already full-stack
    if ((project as any).isFullStack) {
      return {
        eligible: false,
        reason: 'Project is already full-stack',
      };
    }

    // Check user's subscription status
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) {
      return {
        eligible: false,
        reason: 'User not found',
      };
    }

    const userData = userDoc.data();
    const isPaidUser = userData?.planId && userData.planId !== 'free';

    if (!isPaidUser) {
      return {
        eligible: false,
        reason: 'Full-stack conversion requires a paid plan',
        isPaidUser: false,
        currentPlan: userData?.planId || 'free',
      };
    }

    return {
      eligible: true,
      isPaidUser: true,
      currentPlan: userData?.planId,
    };
  } catch (error) {
    logger.error('[VIBE-CONVERT] Eligibility check failed', { error });
    return {
      eligible: false,
      reason: 'Failed to check eligibility',
    };
  }
}

// ============================================
// GET CONVERSION PRICING
// ============================================

export function getConversionPricing() {
  return {
    free: {
      name: 'Frontend Only',
      price: 0,
      features: [
        'AI-generated React components',
        'Live WebContainer preview',
        'Code editing with Monaco',
        'Export as .zip',
        'Manual deployment',
      ],
      limitations: [
        'No backend generation',
        'No real POS data',
        'No one-click deploy',
        'No custom domain',
      ],
    },
    growth: {
      name: 'Full-Stack',
      price: 99,
      period: 'one-time',
      features: [
        'Everything in Free',
        'Backend generation (Firestore + API routes)',
        'Real POS product integration',
        'One-click Firebase deploy',
        'Custom subdomain (*.bakedbot.ai)',
        'Firebase security rules',
        'Environment setup',
        'Deployment instructions',
      ],
    },
    empire: {
      name: 'Enterprise',
      price: 'Custom',
      features: [
        'Everything in Full-Stack',
        'Custom domain support',
        'White-label deployment',
        'Priority support',
        'Advanced features (auth, payments)',
        'Unlimited deployments',
      ],
    },
  };
}
