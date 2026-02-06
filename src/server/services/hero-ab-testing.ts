/**
 * Hero A/B Testing Service
 *
 * Run A/B tests to compare hero banner performance.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Hero } from '@/types/heroes';
import { v4 as uuidv4 } from 'uuid';

export interface ABTest {
  id: string;
  orgId: string;
  name: string;
  heroAId: string;
  heroBId: string;
  startDate: Date;
  endDate?: Date;
  trafficSplit: number; // 0-1, percentage of traffic to variant B
  status: 'active' | 'completed' | 'paused';
  results?: {
    heroA: {
      views: number;
      primaryClicks: number;
      secondaryClicks: number;
      conversionRate: number;
    };
    heroB: {
      views: number;
      primaryClicks: number;
      secondaryClicks: number;
      conversionRate: number;
    };
    winner?: 'A' | 'B' | 'tie';
    confidenceLevel?: number; // 0-1
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Create new A/B test
 */
export async function createABTest(
  orgId: string,
  name: string,
  heroAId: string,
  heroBId: string,
  startDate: Date,
  endDate?: Date,
  trafficSplit = 0.5
): Promise<{ success: boolean; testId?: string; error?: string }> {
  try {
    const db = getAdminFirestore();
    const testId = uuidv4();

    // Validate heroes exist and belong to org
    const heroADoc = await db.collection('heroes').doc(heroAId).get();
    const heroBDoc = await db.collection('heroes').doc(heroBId).get();

    if (!heroADoc.exists || !heroBDoc.exists) {
      return { success: false, error: 'One or both heroes not found' };
    }

    const heroA = heroADoc.data() as Hero;
    const heroB = heroBDoc.data() as Hero;

    if (heroA.orgId !== orgId || heroB.orgId !== orgId) {
      return { success: false, error: 'Heroes must belong to the same organization' };
    }

    // Create test document
    const test: ABTest = {
      id: testId,
      orgId,
      name,
      heroAId,
      heroBId,
      startDate,
      endDate,
      trafficSplit,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('hero_ab_tests').doc(testId).set(test);

    // Update heroes with test info
    const now = new Date();
    await db.collection('heroes').doc(heroAId).update({
      'abTest': {
        testId,
        variant: 'A',
        startDate,
        endDate,
      },
      updatedAt: now,
    });

    await db.collection('heroes').doc(heroBId).update({
      'abTest': {
        testId,
        variant: 'B',
        startDate,
        endDate,
      },
      updatedAt: now,
    });

    return { success: true, testId };
  } catch (error) {
    console.error('Error creating A/B test:', error);
    return { success: false, error: 'Failed to create A/B test' };
  }
}

/**
 * Get active A/B test for organization
 */
export async function getActiveABTest(
  orgId: string
): Promise<{ success: boolean; test?: ABTest; error?: string }> {
  try {
    const db = getAdminFirestore();
    const snapshot = await db
      .collection('hero_ab_tests')
      .where('orgId', '==', orgId)
      .where('status', '==', 'active')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return { success: false, error: 'No active A/B test found' };
    }

    const test = snapshot.docs[0].data() as ABTest;
    return { success: true, test };
  } catch (error) {
    console.error('Error getting active A/B test:', error);
    return { success: false, error: 'Failed to get active test' };
  }
}

/**
 * Select hero variant for user based on A/B test
 * @returns Hero ID to show to user
 */
export async function selectHeroVariant(
  orgId: string,
  userHash: number // Hash of user ID or session ID
): Promise<{ success: boolean; heroId?: string; variant?: 'A' | 'B'; error?: string }> {
  try {
    const testResult = await getActiveABTest(orgId);
    if (!testResult.success || !testResult.test) {
      // No active test, return active hero
      const db = getAdminFirestore();
      const activeHero = await db
        .collection('heroes')
        .where('orgId', '==', orgId)
        .where('active', '==', true)
        .limit(1)
        .get();

      if (activeHero.empty) {
        return { success: false, error: 'No active hero found' };
      }

      return {
        success: true,
        heroId: activeHero.docs[0].id,
        variant: 'A',
      };
    }

    const test = testResult.test;

    // Use consistent hash to assign variant
    const variantThreshold = test.trafficSplit;
    const assignedVariant = (userHash % 100) / 100 < variantThreshold ? 'B' : 'A';

    const heroId = assignedVariant === 'A' ? test.heroAId : test.heroBId;

    return {
      success: true,
      heroId,
      variant: assignedVariant,
    };
  } catch (error) {
    console.error('Error selecting hero variant:', error);
    return { success: false, error: 'Failed to select variant' };
  }
}

/**
 * Complete A/B test and determine winner
 */
export async function completeABTest(
  testId: string
): Promise<{ success: boolean; winner?: 'A' | 'B' | 'tie'; error?: string }> {
  try {
    const db = getAdminFirestore();
    const testDoc = await db.collection('hero_ab_tests').doc(testId).get();

    if (!testDoc.exists) {
      return { success: false, error: 'Test not found' };
    }

    const test = testDoc.data() as ABTest;

    // Get analytics for both heroes
    const heroADoc = await db.collection('heroes').doc(test.heroAId).get();
    const heroBDoc = await db.collection('heroes').doc(test.heroBId).get();

    const heroA = heroADoc.data();
    const heroB = heroBDoc.data();

    const resultsA = {
      views: heroA?.analytics?.views || 0,
      primaryClicks: heroA?.analytics?.ctaClicks?.primary || 0,
      secondaryClicks: heroA?.analytics?.ctaClicks?.secondary || 0,
      conversionRate: heroA?.analytics?.conversionRate || 0,
    };

    const resultsB = {
      views: heroB?.analytics?.views || 0,
      primaryClicks: heroB?.analytics?.ctaClicks?.primary || 0,
      secondaryClicks: heroB?.analytics?.ctaClicks?.secondary || 0,
      conversionRate: heroB?.analytics?.conversionRate || 0,
    };

    // Determine winner based on conversion rate
    let winner: 'A' | 'B' | 'tie';
    const difference = Math.abs(resultsA.conversionRate - resultsB.conversionRate);
    const minSignificantDifference = 0.05; // 5% difference threshold

    if (difference < minSignificantDifference) {
      winner = 'tie';
    } else {
      winner = resultsA.conversionRate > resultsB.conversionRate ? 'A' : 'B';
    }

    // Calculate confidence level (simplified)
    const totalViews = resultsA.views + resultsB.views;
    const confidenceLevel = Math.min(totalViews / 1000, 0.95); // Max 95% confidence

    // Update test with results
    await db.collection('hero_ab_tests').doc(testId).update({
      status: 'completed',
      results: {
        heroA: resultsA,
        heroB: resultsB,
        winner,
        confidenceLevel,
      },
      updatedAt: new Date(),
    });

    // Remove abTest from heroes
    await db.collection('heroes').doc(test.heroAId).update({
      abTest: null,
      updatedAt: new Date(),
    });

    await db.collection('heroes').doc(test.heroBId).update({
      abTest: null,
      updatedAt: new Date(),
    });

    return { success: true, winner };
  } catch (error) {
    console.error('Error completing A/B test:', error);
    return { success: false, error: 'Failed to complete test' };
  }
}
