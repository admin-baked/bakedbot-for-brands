'use server';

/**
 * Hero Analytics Server Actions
 *
 * Track views and CTA clicks for hero banners.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Track hero banner view
 */
export async function trackHeroView(heroId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!heroId) throw new Error('Hero ID is required');

    const db = getAdminFirestore();
    const heroRef = db.collection('heroes').doc(heroId);

    // Update analytics using FieldValue.increment
    await heroRef.update({
      'analytics.views': FieldValue.increment(1),
      'analytics.lastViewed': new Date(),
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error tracking hero view:', error);
    return { success: false, error: 'Failed to track view' };
  }
}

/**
 * Track CTA click
 */
export async function trackHeroCtaClick(
  heroId: string,
  ctaType: 'primary' | 'secondary'
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!heroId) throw new Error('Hero ID is required');

    const db = getAdminFirestore();
    const heroRef = db.collection('heroes').doc(heroId);

    // Update analytics
    await heroRef.update({
      [`analytics.ctaClicks.${ctaType}`]: FieldValue.increment(1),
      updatedAt: new Date(),
    });

    // Calculate conversion rate
    const hero = await heroRef.get();
    const data = hero.data();
    if (data?.analytics) {
      const views = data.analytics.views || 0;
      const primaryClicks = data.analytics.ctaClicks?.primary || 0;
      const secondaryClicks = data.analytics.ctaClicks?.secondary || 0;
      const totalClicks = primaryClicks + secondaryClicks;

      if (views > 0) {
        const conversionRate = totalClicks / views;
        await heroRef.update({
          'analytics.conversionRate': conversionRate,
        });
      }
    }

    return { success: true };
  } catch (error) {
    console.error('Error tracking CTA click:', error);
    return { success: false, error: 'Failed to track click' };
  }
}

/**
 * Get hero analytics
 */
export async function getHeroAnalytics(
  heroId: string
): Promise<{
  success: boolean;
  data?: {
    views: number;
    primaryClicks: number;
    secondaryClicks: number;
    conversionRate: number;
    lastViewed?: Date;
  };
  error?: string;
}> {
  try {
    if (!heroId) throw new Error('Hero ID is required');

    const db = getAdminFirestore();
    const doc = await db.collection('heroes').doc(heroId).get();

    if (!doc.exists) {
      return { success: false, error: 'Hero not found' };
    }

    const hero = doc.data();
    const analytics = hero?.analytics || {};

    return {
      success: true,
      data: {
        views: analytics.views || 0,
        primaryClicks: analytics.ctaClicks?.primary || 0,
        secondaryClicks: analytics.ctaClicks?.secondary || 0,
        conversionRate: analytics.conversionRate || 0,
        lastViewed: analytics.lastViewed ? analytics.lastViewed.toDate() : undefined,
      },
    };
  } catch (error) {
    console.error('Error getting hero analytics:', error);
    return { success: false, error: 'Failed to get analytics' };
  }
}

/**
 * Get analytics for all heroes in an organization
 */
export async function getOrgHeroAnalytics(
  orgId: string
): Promise<{
  success: boolean;
  data?: Array<{
    heroId: string;
    heroName: string;
    views: number;
    primaryClicks: number;
    secondaryClicks: number;
    conversionRate: number;
  }>;
  error?: string;
}> {
  try {
    if (!orgId) throw new Error('Organization ID is required');

    const db = getAdminFirestore();
    const snapshot = await db.collection('heroes')
      .where('orgId', '==', orgId)
      .get();

    const analyticsData = snapshot.docs.map(doc => {
      const hero = doc.data();
      const analytics = hero.analytics || {};

      return {
        heroId: doc.id,
        heroName: hero.brandName,
        views: analytics.views || 0,
        primaryClicks: analytics.ctaClicks?.primary || 0,
        secondaryClicks: analytics.ctaClicks?.secondary || 0,
        conversionRate: analytics.conversionRate || 0,
      };
    });

    return { success: true, data: analyticsData };
  } catch (error) {
    console.error('Error getting org hero analytics:', error);
    return { success: false, error: 'Failed to get org analytics' };
  }
}
