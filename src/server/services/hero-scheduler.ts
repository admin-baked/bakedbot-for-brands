/**
 * Hero Scheduler Service
 *
 * Handles scheduled activation and deactivation of hero banners.
 */

import { getAdminFirestore } from '@/firebase/admin';
import { Hero } from '@/types/heroes';

/**
 * Process scheduled heroes for all organizations
 * Should be called via cron job or Cloud Function
 */
export async function processScheduledHeroes(): Promise<{
  success: boolean;
  activated: number;
  deactivated: number;
  error?: string;
}> {
  try {
    const db = getAdminFirestore();
    const now = new Date();
    let activatedCount = 0;
    let deactivatedCount = 0;

    // Get all heroes with scheduled activation
    const scheduledHeroes = await db
      .collection('heroes')
      .where('scheduledActivation', '!=', null)
      .get();

    const batch = db.batch();

    for (const doc of scheduledHeroes.docs) {
      const hero = doc.data() as Hero;
      const schedule = hero.scheduledActivation;

      if (!schedule) continue;

      const startDate = new Date(schedule.startDate);
      const endDate = schedule.endDate ? new Date(schedule.endDate) : null;

      // Check if hero should be activated
      if (!hero.active && now >= startDate && (!endDate || now < endDate)) {
        // Deactivate other heroes for this org first
        const activeHeroes = await db
          .collection('heroes')
          .where('orgId', '==', hero.orgId)
          .where('active', '==', true)
          .get();

        for (const activeDoc of activeHeroes.docs) {
          batch.update(activeDoc.ref, {
            active: false,
            updatedAt: now,
          });
          deactivatedCount++;
        }

        // Activate this hero
        batch.update(doc.ref, {
          active: true,
          updatedAt: now,
        });
        activatedCount++;
      }

      // Check if hero should be deactivated
      if (
        hero.active &&
        endDate &&
        now >= endDate &&
        schedule.autoDeactivate
      ) {
        batch.update(doc.ref, {
          active: false,
          updatedAt: now,
        });
        deactivatedCount++;
      }
    }

    await batch.commit();

    return { success: true, activated: activatedCount, deactivated: deactivatedCount };
  } catch (error) {
    console.error('Error processing scheduled heroes:', error);
    return { success: false, activated: 0, deactivated: 0, error: 'Failed to process scheduled heroes' };
  }
}

/**
 * Schedule a hero for future activation
 */
export async function scheduleHeroActivation(
  heroId: string,
  startDate: Date,
  endDate?: Date,
  autoDeactivate = true
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    // Validate dates
    const now = new Date();
    if (startDate <= now) {
      return { success: false, error: 'Start date must be in the future' };
    }

    if (endDate && endDate <= startDate) {
      return { success: false, error: 'End date must be after start date' };
    }

    // Update hero with schedule
    await db.collection('heroes').doc(heroId).update({
      scheduledActivation: {
        startDate,
        endDate: endDate || null,
        autoDeactivate,
      },
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error scheduling hero activation:', error);
    return { success: false, error: 'Failed to schedule hero activation' };
  }
}

/**
 * Cancel scheduled activation for a hero
 */
export async function cancelScheduledActivation(
  heroId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const db = getAdminFirestore();

    await db.collection('heroes').doc(heroId).update({
      scheduledActivation: null,
      updatedAt: new Date(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error canceling scheduled activation:', error);
    return { success: false, error: 'Failed to cancel scheduled activation' };
  }
}
