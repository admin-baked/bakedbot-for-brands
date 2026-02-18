'use server';

/**
 * Playbook A/B Testing
 *
 * Support template variants and compare their performance
 */

import { createServerClient } from '@/firebase/server-client';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface TemplateVariant {
  variantId: string;
  variantName: string;
  templateId: string;
  description: string;
  isControl: boolean;
  createdAt: string;
  config: any;
}

export interface VariantPerformance {
  variantId: string;
  variantName: string;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  assignedOrgs: number;
  conversionRate?: number;
  revenue?: number;
  winner?: boolean;
}

export interface ABTestResults {
  templateId: string;
  variants: VariantPerformance[];
  testStatus: 'running' | 'completed' | 'paused';
  startDate: string;
  endDate?: string;
  statisticalSignificance?: number;
  recommendation?: string;
  pValue?: number;
  confidenceLevel?: number;
}

/**
 * Chi-Square test for statistical significance
 * Returns p-value (lower = more significant)
 */
function calculateChiSquare(variant1: VariantPerformance, variant2: VariantPerformance): number {
  const obs1Success = variant1.successfulExecutions;
  const obs1Fail = variant1.failedExecutions;
  const obs2Success = variant2.successfulExecutions;
  const obs2Fail = variant2.failedExecutions;

  const total = obs1Success + obs1Fail + obs2Success + obs2Fail;
  const totalSuccess = obs1Success + obs2Success;
  const totalFail = obs1Fail + obs2Fail;

  // Expected frequencies
  const exp1Success = ((obs1Success + obs1Fail) * totalSuccess) / total;
  const exp1Fail = ((obs1Success + obs1Fail) * totalFail) / total;
  const exp2Success = ((obs2Success + obs2Fail) * totalSuccess) / total;
  const exp2Fail = ((obs2Success + obs2Fail) * totalFail) / total;

  // Chi-square calculation
  const chi2 =
    Math.pow(obs1Success - exp1Success, 2) / exp1Success +
    Math.pow(obs1Fail - exp1Fail, 2) / exp1Fail +
    Math.pow(obs2Success - exp2Success, 2) / exp2Success +
    Math.pow(obs2Fail - exp2Fail, 2) / exp2Fail;

  // Approximate p-value using chi-square distribution
  // With 1 df: critical value = 3.841 for p=0.05
  return chi2 > 3.841 ? 0.05 : 0.1;
}

/**
 * Get A/B test results for a template
 */
export async function getABTestResults(templateId: string): Promise<ABTestResults | { error: string }> {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { firestore } = await createServerClient();

    logger.info('[ABTesting] Fetching AB test results', { templateId });

    // Get active A/B test for this template
    const testSnap = await firestore
      .collection('playbook_ab_tests')
      .where('templateId', '==', templateId)
      .where('status', '!=', 'archived')
      .orderBy('status')
      .limit(1)
      .get();

    if (testSnap.size === 0) {
      return {
        templateId,
        variants: [],
        testStatus: 'completed',
        startDate: new Date().toISOString(),
      };
    }

    const testDoc = testSnap.docs[0];
    const test = testDoc.data();

    // Get variant performance
    const variantIds = test.variantIds || [];
    const variants: VariantPerformance[] = [];

    for (const variantId of variantIds) {
      // Get variant details
      const variantDoc = await firestore
        .collection('playbook_templates')
        .doc(variantId)
        .get();

      const variantData = variantDoc.data() || { name: variantId };

      // Get execution stats for this variant
      const execSnap = await firestore
        .collectionGroup('playbook_executions')
        .where('playbookTemplateId', '==', variantId)
        .where('startedAt', '>=', new Date(test.startDate))
        .limit(1000)
        .get();

      let successCount = 0;
      let totalDuration = 0;

      for (const doc of execSnap.docs) {
        const exec = doc.data();
        if (exec.status === 'completed' || exec.status === 'success') {
          successCount++;
        }
        if (exec.duration) {
          totalDuration += exec.duration;
        }
      }

      const successRate = execSnap.size > 0 ? (successCount / execSnap.size) * 100 : 0;
      const avgDuration = execSnap.size > 0 ? totalDuration / execSnap.size : 0;

      // Count assigned orgs
      const assignmentSnap = await firestore
        .collectionGroup('playbooks')
        .where('playbookId', '==', variantId)
        .get();

      variants.push({
        variantId,
        variantName: variantData.name || variantId,
        templateId,
        totalExecutions: execSnap.size,
        successfulExecutions: successCount,
        failedExecutions: execSnap.size - successCount,
        successRate,
        avgExecutionTime: avgDuration,
        assignedOrgs: assignmentSnap.size,
      });
    }

    // Determine winner if test is complete
    if (test.status === 'completed') {
      const sortedBySuccess = [...variants].sort((a, b) => b.successRate - a.successRate);
      if (sortedBySuccess.length > 0) {
        sortedBySuccess[0].winner = true;
      }
    }

    logger.info('[ABTesting] Results fetched', {
      templateId,
      variantCount: variants.length,
    });

    return {
      templateId,
      variants,
      testStatus: test.status as 'running' | 'completed' | 'paused',
      startDate: test.startDate,
      endDate: test.endDate,
      recommendation:
        test.status === 'completed'
          ? `Winner: ${variants.find((v) => v.winner)?.variantName || 'TBD'}`
          : 'Test in progress',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[ABTesting] Error fetching results', { templateId, error: errorMsg });
    return { error: errorMsg };
  }
}

/**
 * Create A/B test for a template
 */
export async function createABTest(
  templateId: string,
  variantIds: string[],
  testDurationDays: number = 7
) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const { firestore } = await createServerClient();

    const startDate = new Date().toISOString();
    const endDate = new Date(Date.now() + testDurationDays * 24 * 60 * 60 * 1000).toISOString();

    await firestore.collection('playbook_ab_tests').add({
      templateId,
      variantIds,
      status: 'running',
      startDate,
      endDate,
      createdBy: user.uid,
      createdAt: new Date().toISOString(),
    });

    logger.info('[ABTesting] A/B test created', {
      templateId,
      variantCount: variantIds.length,
      durationDays: testDurationDays,
    });

    return { success: true, message: 'A/B test started' };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[ABTesting] Error creating test', { templateId, error: errorMsg });
    return { error: errorMsg };
  }
}

/**
 * Complete A/B test and recommend winner
 */
export async function completeABTest(templateId: string) {
  try {
    const user = await requireUser();

    if (!user) {
      return { error: 'Not authenticated' };
    }

    const results = await getABTestResults(templateId);

    if ('error' in results) {
      return results;
    }

    const { variants } = results;

    if (variants.length === 0) {
      return { error: 'No variants found' };
    }

    // Find winner by success rate
    const winner = [...variants].sort((a, b) => b.successRate - a.successRate)[0];

    const { firestore } = await createServerClient();

    // Update test status
    const testSnap = await firestore
      .collection('playbook_ab_tests')
      .where('templateId', '==', templateId)
      .where('status', '==', 'running')
      .get();

    for (const doc of testSnap.docs) {
      await doc.ref.update({
        status: 'completed',
        endDate: new Date().toISOString(),
        winner: winner.variantId,
        completedBy: user.uid,
      });
    }

    logger.info('[ABTesting] Test completed', {
      templateId,
      winner: winner.variantId,
    });

    return {
      success: true,
      winner: winner.variantName,
      successRate: winner.successRate.toFixed(1),
      message: `Test completed. Winner: ${winner.variantName} (${winner.successRate.toFixed(1)}%)`,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    logger.error('[ABTesting] Error completing test', { templateId, error: errorMsg });
    return { error: errorMsg };
  }
}
