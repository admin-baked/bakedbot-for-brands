'use server';

/**
 * Usage Tracking Service
 * 
 * Tracks weekly usage of premium features for free tier users.
 * Features tracked:
 * - Playbook creations (1/week free)
 * - Deep Research tasks (1/week free)
 * - Image generations (5/week free)
 */

import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/firebase/admin';
import { FREE_TIER_LIMITS } from '@/ai/model-selector';

const COLLECTION = 'user_usage';
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface UsageRecord {
    userId: string;
    weekStart: Date;
    playbooks: number;
    research: number;
    images: number;
}

export interface UsageCheck {
    allowed: boolean;
    used: number;
    limit: number;
    resetsAt: Date;
}

/**
 * Get the start of the current week (Sunday midnight UTC)
 */
function getWeekStart(): Date {
    const now = new Date();
    const dayOfWeek = now.getUTCDay();
    const diff = now.getUTCDate() - dayOfWeek;
    const weekStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff, 0, 0, 0, 0));
    return weekStart;
}

/**
 * Get when the current week resets
 */
function getWeekEnd(): Date {
    const weekStart = getWeekStart();
    return new Date(weekStart.getTime() + WEEK_MS);
}

/**
 * Get or create the usage record for a user for the current week
 */
async function getOrCreateUsageRecord(userId: string): Promise<UsageRecord> {
    const db = getAdminFirestore();
    const weekStart = getWeekStart();
    const docId = `${userId}_${weekStart.toISOString().split('T')[0]}`;
    const docRef = db.collection(COLLECTION).doc(docId);
    
    const doc = await docRef.get();
    
    if (doc.exists) {
        const data = doc.data()!;
        return {
            userId,
            weekStart: (data.weekStart as Timestamp).toDate(),
            playbooks: data.playbooks || 0,
            research: data.research || 0,
            images: data.images || 0,
        };
    }
    
    // Create new record for this week
    const newRecord: Omit<UsageRecord, 'weekStart'> & { weekStart: Timestamp } = {
        userId,
        weekStart: Timestamp.fromDate(weekStart),
        playbooks: 0,
        research: 0,
        images: 0,
    };
    
    await docRef.set(newRecord);
    
    return {
        ...newRecord,
        weekStart,
    };
}

/**
 * Check if a user can use a feature (for free tier)
 */
export async function checkUsage(
    userId: string, 
    feature: 'playbooks' | 'research' | 'images',
    userTier: 'free' | 'paid' | 'super' = 'free'
): Promise<UsageCheck> {
    // Paid/super users have no limits
    if (userTier !== 'free') {
        return {
            allowed: true,
            used: 0,
            limit: Infinity,
            resetsAt: getWeekEnd(),
        };
    }
    
    const record = await getOrCreateUsageRecord(userId);
    const limits = {
        playbooks: FREE_TIER_LIMITS.playbooksPerWeek,
        research: FREE_TIER_LIMITS.deepResearchPerWeek,
        images: FREE_TIER_LIMITS.imagesPerWeek,
    };
    
    const used = record[feature];
    const limit = limits[feature];
    
    return {
        allowed: used < limit,
        used,
        limit,
        resetsAt: getWeekEnd(),
    };
}

/**
 * Increment usage for a feature (call after successful use)
 */
export async function incrementUsage(
    userId: string, 
    feature: 'playbooks' | 'research' | 'images'
): Promise<void> {
    const db = getAdminFirestore();
    const weekStart = getWeekStart();
    const docId = `${userId}_${weekStart.toISOString().split('T')[0]}`;
    const docRef = db.collection(COLLECTION).doc(docId);
    
    await docRef.set({
        userId,
        weekStart: Timestamp.fromDate(weekStart),
        [feature]: FieldValue.increment(1),
    }, { merge: true });
}

/**
 * Get remaining usage for display to user
 */
export async function getRemainingUsage(
    userId: string,
    userTier: 'free' | 'paid' | 'super' = 'free'
): Promise<{
    playbooks: UsageCheck;
    research: UsageCheck;
    images: UsageCheck;
}> {
    const [playbooks, research, images] = await Promise.all([
        checkUsage(userId, 'playbooks', userTier),
        checkUsage(userId, 'research', userTier),
        checkUsage(userId, 'images', userTier),
    ]);
    
    return { playbooks, research, images };
}
