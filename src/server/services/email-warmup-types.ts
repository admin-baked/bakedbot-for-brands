/**
 * Email Domain Warm-up Types
 */

export type WarmupScheduleType = 'conservative' | 'standard' | 'aggressive';

export interface WarmupStatus {
    active: boolean;
    startDate?: Date;
    scheduleType?: WarmupScheduleType;
    currentDay?: number;
    dailyLimit?: number;
    sentToday?: number;
    remainingToday?: number;
    percentComplete?: number;
    completesOn?: Date;
}

export interface WarmupLog {
    date: string; // YYYY-MM-DD
    sent: number;
    limit: number;
    orgId: string;
    updatedAt: Date;
}
