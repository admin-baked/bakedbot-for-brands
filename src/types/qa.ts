/**
 * QA Engineering Types — Pinky Agent
 *
 * Type definitions for the BakedBot QA system:
 * - Bug tracker (qa_bugs Firestore collection)
 * - Test case registry (qa_test_cases Firestore collection)
 * - Smoke test results
 * - QA reporting
 */

import { Timestamp } from 'firebase-admin/firestore';

// ============================================================================
// ENUMS & UNIONS
// ============================================================================

export type QABugPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type QABugStatus =
    | 'open'
    | 'triaged'
    | 'assigned'
    | 'in_progress'
    | 'fixed'
    | 'verified'
    | 'closed'
    | 'wont_fix';

export type QATestStatus = 'untested' | 'passed' | 'failed' | 'partial';

export type QABugArea =
    | 'public_menu'
    | 'compliance'
    | 'auth'
    | 'brand_guide'
    | 'hero_carousel'
    | 'bundle_system'
    | 'revenue'
    | 'redis_cache'
    | 'competitive_intel'
    | 'inbox'
    | 'playbooks'
    | 'creative_studio'
    | 'drive'
    | 'campaigns'
    | 'pos_sync'
    | 'cron_jobs'
    | 'firebase_deploy'
    | 'super_powers'
    | 'goals'
    | 'customer_segments'
    | 'other';

// ============================================================================
// CORE BUG INTERFACE
// ============================================================================

export interface QABug {
    id: string;
    title: string;
    steps: string[];
    expected: string;
    actual: string;
    priority: QABugPriority;
    status: QABugStatus;
    area: QABugArea;

    // Linkages
    testCaseId?: string;      // Link to qa_test_cases entry (e.g., '1.1', '7.3')
    affectedOrgId?: string;   // Which org/customer is affected (for org-scoped visibility)

    // Origin
    environment: 'production' | 'staging' | 'local';
    reportedBy: string;       // 'pinky' | 'automated' | userId
    assignedTo?: string;      // 'linus' | 'deebo' | userId

    // Resolution tracking
    commitFound?: string;     // Which commit introduced the bug
    commitFixed?: string;     // Which commit fixed the bug
    screenshotUrl?: string;   // RTRVR visual evidence (Phase 2)

    // Regression tracking
    regressionOf?: string;    // bugId of a previously-fixed bug this is a recurrence of
    isRegression?: boolean;   // True if this bug was seen before and "fixed"

    // Verification
    verifiedAt?: Timestamp;
    verifiedBy?: string;
    notes?: string;

    // Timestamps
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

// ============================================================================
// TEST CASE REGISTRY
// Living version of dev/MASTER_MANUAL_TEST_PLAN.md
// ============================================================================

export interface QATestCase {
    id: string;               // e.g., '1.1', '7.3' (matches MASTER_MANUAL_TEST_PLAN numbering)
    area: string;             // e.g., 'Thrive Menu', 'Compliance & Security'
    title: string;
    steps: string;
    expected: string;
    priority: 'critical' | 'medium' | 'low';
    status: QATestStatus;
    linkedBugId?: string;
    lastTestedAt?: Timestamp;
    lastTestedBy?: string;    // 'pinky' | 'automated' | userId
}

// ============================================================================
// SMOKE TEST RESULTS
// ============================================================================

export interface QASmokeResult {
    testId: string;
    name: string;
    url: string;
    method: 'GET' | 'POST';
    passed: boolean;
    statusCode?: number;
    expectedStatus?: number;
    responseMs?: number;
    error?: string;
    details?: string;
}

export interface QASmokeRunSummary {
    runId: string;
    environment: 'production' | 'staging';
    timestamp: string;
    passed: number;
    failed: number;
    total: number;
    results: QASmokeResult[];
    bugsFiledIds?: string[];  // Bug IDs auto-created for failures
}

// ============================================================================
// REPORTING
// ============================================================================

export interface QAReport {
    total: number;
    open: number;
    byPriority: Record<QABugPriority, number>;
    byStatus: Record<QABugStatus, number>;
    byArea: Partial<Record<QABugArea, number>>;
    testCoverage: {
        total: number;
        passing: number;
        failing: number;
        untested: number;
        coveragePct: number;
    };
    generatedAt: Date;
}

// ============================================================================
// VALID STATUS TRANSITIONS
// Enforced in server actions to prevent invalid state jumps
// ============================================================================

export const QA_VALID_TRANSITIONS: Record<QABugStatus, QABugStatus[]> = {
    open: ['triaged', 'wont_fix'],
    triaged: ['assigned', 'open', 'wont_fix'],
    assigned: ['in_progress', 'triaged', 'wont_fix'],
    in_progress: ['fixed', 'assigned', 'wont_fix'],
    fixed: ['verified', 'in_progress'],
    verified: ['closed'],
    closed: [],
    wont_fix: [],
};

// ============================================================================
// UI DISPLAY HELPERS (used by qa-tab.tsx)
// ============================================================================

export const QA_PRIORITY_CONFIG: Record<QABugPriority, { label: string; emoji: string; color: string }> = {
    P0: { label: 'P0 Critical', emoji: '🔴', color: 'bg-red-100 text-red-800 border-red-200' },
    P1: { label: 'P1 High',     emoji: '🟠', color: 'bg-orange-100 text-orange-800 border-orange-200' },
    P2: { label: 'P2 Medium',   emoji: '🟡', color: 'bg-yellow-100 text-yellow-800 border-yellow-200' },
    P3: { label: 'P3 Low',      emoji: '🟢', color: 'bg-green-100 text-green-800 border-green-200' },
};

export const QA_AREA_CONFIG: Record<QABugArea, { label: string; emoji: string }> = {
    public_menu:       { label: 'Public Menu',        emoji: '🏪' },
    compliance:        { label: 'Compliance',          emoji: '⚖️' },
    auth:              { label: 'Auth',                emoji: '🔐' },
    brand_guide:       { label: 'Brand Guide',         emoji: '🎨' },
    hero_carousel:     { label: 'Hero Carousel',       emoji: '🖼️' },
    bundle_system:     { label: 'Bundle System',       emoji: '🎁' },
    revenue:           { label: 'Revenue / Sales',     emoji: '💰' },
    redis_cache:       { label: 'Redis Cache',         emoji: '⚡' },
    competitive_intel: { label: 'Competitive Intel',   emoji: '🔍' },
    inbox:             { label: 'Inbox',               emoji: '📥' },
    playbooks:         { label: 'Playbooks',           emoji: '📋' },
    creative_studio:   { label: 'Creative Studio',     emoji: '🎬' },
    drive:             { label: 'Drive',               emoji: '📁' },
    campaigns:         { label: 'Campaigns',           emoji: '📢' },
    pos_sync:          { label: 'POS Sync',            emoji: '🔄' },
    cron_jobs:         { label: 'Cron Jobs',           emoji: '⏱️' },
    firebase_deploy:   { label: 'Firebase Deploy',     emoji: '🚀' },
    super_powers:      { label: 'Super Powers',        emoji: '🦸' },
    goals:             { label: 'Goals',               emoji: '🎯' },
    customer_segments: { label: 'Customer Segments',   emoji: '👥' },
    other:             { label: 'Other',               emoji: '🐛' },
};

export const QA_STATUS_CONFIG: Record<QABugStatus, { label: string; color: string }> = {
    open:        { label: 'Open',        color: 'bg-red-50 text-red-700' },
    triaged:     { label: 'Triaged',     color: 'bg-orange-50 text-orange-700' },
    assigned:    { label: 'Assigned',    color: 'bg-yellow-50 text-yellow-700' },
    in_progress: { label: 'In Progress', color: 'bg-blue-50 text-blue-700' },
    fixed:       { label: 'Fixed',       color: 'bg-purple-50 text-purple-700' },
    verified:    { label: 'Verified',    color: 'bg-green-50 text-green-700' },
    closed:      { label: 'Closed',      color: 'bg-gray-50 text-gray-500' },
    wont_fix:    { label: "Won't Fix",   color: 'bg-gray-50 text-gray-400' },
};
