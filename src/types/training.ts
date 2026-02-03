/**
 * Training Platform Types
 *
 * Type definitions for the BakedBot Builder Bootcamp training platform.
 * Supports 8-week curriculum with AI-powered code review by Linus.
 */

import { Timestamp } from '@google-cloud/firestore';

/**
 * Training Program
 * Top-level program definition (e.g., "BakedBot Builder Bootcamp")
 */
export interface TrainingProgram {
    id: string;
    name: string;
    description: string;
    durationWeeks: number;
    status: 'draft' | 'active' | 'archived';
    curriculum: TrainingWeek[];
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Training Week
 * Week-level curriculum structure with objectives and challenges
 */
export interface TrainingWeek {
    weekNumber: number;
    title: string;
    description: string;
    objectives: string[];
    challengeIds: string[];
}

/**
 * Training Challenge
 * Individual coding challenge with instructions, hints, and review criteria
 */
export interface TrainingChallenge {
    id: string;
    programId: string;
    weekNumber: number;
    order: number; // Order within week
    title: string;
    description: string;
    instructions: string; // Markdown-formatted challenge brief
    difficulty: 'beginner' | 'intermediate' | 'advanced';

    // Optional starting point
    starterCode?: string;

    // Progressive hints for interns
    hints: string[];

    // Reference materials (links to .agent/refs/ or CLAUDE.md)
    referenceDocs: ReferenceDoc[];

    // Linus review criteria
    reviewCriteria: ReviewCriterion[];

    // Automated testing (Phase 2)
    testCode?: string; // Jest test code for automated validation
    runTests?: boolean; // Enable code execution feature

    // Metadata
    estimatedMinutes: number;
    tags: string[]; // e.g., ['firebase', 'server-actions', 'auth']
    isRequired: boolean;

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Reference Doc
 * Link to documentation or reference material
 */
export interface ReferenceDoc {
    title: string;
    url: string; // Relative or absolute URL
}

/**
 * Review Criterion
 * Single criterion for Linus code review (e.g., "TypeScript", "Code Quality")
 */
export interface ReviewCriterion {
    category: string;
    weight: number; // 0-1 (sum of all weights should equal 1)
    description: string;
}

/**
 * Training Submission
 * Intern's code submission for a challenge
 */
export interface TrainingSubmission {
    id: string;
    challengeId: string;
    userId: string;
    cohortId: string;

    // Submission content
    code: string;
    language: string; // 'typescript', 'tsx', 'javascript'
    description?: string; // Optional explanation from intern
    filesChanged?: string[]; // For multi-file submissions (Phase 2)

    // Review status
    status: 'pending' | 'reviewing' | 'approved' | 'needs_revision';
    attemptNumber: number; // Track resubmissions

    // Timestamps
    submittedAt: Timestamp;
    reviewedAt?: Timestamp;

    // Linus review
    linusFeedback?: LinusFeedback;

    // Peer reviews (Phase 2)
    peerReviewsAssigned: number; // How many peers assigned to review
    peerReviewsCompleted: number; // How many completed
    peerReviewIds: string[]; // Review document IDs
    peerReviewEnabled: boolean; // Enable for this submission
}

/**
 * Linus Feedback
 * AI-generated code review feedback from Linus
 */
export interface LinusFeedback {
    overallScore: number; // 0-100
    approved: boolean;
    summary: string; // 2-3 paragraph summary
    strengths: string[]; // What they did well
    improvements: string[]; // Specific suggestions
    categoryScores: CategoryScore[]; // Per-criterion scores
}

/**
 * Category Score
 * Score and feedback for a single review criterion
 */
export interface CategoryScore {
    category: string; // Matches ReviewCriterion.category
    score: number; // 0-100
    feedback: string;
}

/**
 * Peer Review (Phase 2)
 * Full peer review with rubric scoring and detailed feedback
 */
export interface PeerReview {
    id: string;
    submissionId: string; // Reference to TrainingSubmission
    reviewerId: string; // User ID of reviewer
    authorId: string; // User ID of code author
    challengeId: string;
    cohortId: string;

    // Review content
    rating: 1 | 2 | 3 | 4 | 5; // Overall rating
    strengths: string[]; // What was done well
    improvements: string[]; // What could be better
    questions: string[]; // Questions for author
    wouldApprove: boolean; // Would you approve this?

    // Rubric scores
    rubricScores: RubricScore[];

    // Metadata
    assignedAt: Timestamp;
    submittedAt?: Timestamp;
    status: 'pending' | 'completed' | 'skipped';
    timeSpent?: number; // Minutes spent reviewing

    // Quality control
    helpfulVotes: number; // How many found this helpful
    flagged: boolean; // Inappropriate content

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface RubricScore {
    category: string;
    score: 1 | 2 | 3 | 4 | 5;
    comment?: string;
}

/**
 * Training Cohort
 * Group of interns starting together (rolling enrollment)
 */
export interface TrainingCohort {
    id: string;
    programId: string;
    name: string; // e.g., "Cohort 1 - Feb 2026"
    startDate: Timestamp;
    endDate: Timestamp;
    status: 'enrolling' | 'active' | 'completed';

    // Enrollment
    participantIds: string[]; // User UIDs
    maxParticipants: number; // 50 for rolling, 5 for pilot

    // Settings
    enablePeerReview: boolean; // Phase 2
    minReviewsRequired: number; // Minimum reviews to earn certificate (default: 3)
    reviewersPerSubmission: number; // How many peers review each submission (default: 2)
    reviewDeadlineHours: number; // Hours to complete review (default: 48)
    slackChannelId?: string; // Phase 2
    weeklyMeetingLink?: string; // Google Meet link

    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * User Training Progress
 * Stored in users/{userId}/training/current
 */
export interface UserTrainingProgress {
    cohortId: string;
    programId: string;
    enrolledAt: Timestamp;

    // Progress tracking
    currentWeek: number;
    completedChallenges: string[]; // Array of challengeIds

    // Stats
    totalSubmissions: number;
    acceptedSubmissions: number;
    weeklyProgress: WeekProgress[];

    // Peer review stats (Phase 2)
    reviewsCompleted: number; // Reviews they've written
    reviewsAssigned: number; // Reviews assigned to them
    averageReviewRating: number; // How helpful are their reviews (1-5)
    reviewBadges: string[]; // 'helpful-reviewer', 'thorough', etc.

    // Certification
    certificateEarned: boolean;
    certificateIssuedAt?: Timestamp;
    certificateUrl?: string; // Firebase Storage URL

    // Metadata
    lastActivityAt: Timestamp;
    status: 'active' | 'paused' | 'completed' | 'dropped';
}

/**
 * Week Progress
 * Progress for a single week
 */
export interface WeekProgress {
    weekNumber: number;
    challengesCompleted: number;
    challengesTotal: number;
    lastActivityAt: Timestamp;
}

/**
 * Training Certificate
 * Generated certificate for completed interns (Phase 2)
 */
export interface TrainingCertificate {
    userId: string;
    programId: string;
    cohortId: string;
    issuedAt: Timestamp;
    pdfUrl: string; // Firebase Storage URL
    verificationCode: string; // Unique code for verification
    completionRate: number; // 0-100
    finalScore: number; // Average of all approved submissions
}
