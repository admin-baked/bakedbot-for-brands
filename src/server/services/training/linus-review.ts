/**
 * Linus Training Review Service
 *
 * Integrates Linus (AI CTO) to provide code review feedback for intern submissions.
 * Builds educational prompts and parses structured feedback.
 */

import { runAgentChat } from '@/app/dashboard/ceo/agents/actions';
import type { TrainingChallenge, TrainingSubmission, LinusFeedback } from '@/types/training';
import { logger } from '@/lib/logger';

/**
 * Build a comprehensive review prompt for Linus
 *
 * @param challenge - The challenge being reviewed
 * @param submission - The intern's code submission
 * @returns Formatted prompt string for Linus
 */
export function buildLinusReviewPrompt(
    challenge: TrainingChallenge,
    submission: TrainingSubmission
): string {
    return `
=== CODE REVIEW REQUEST ===
Type: TRAINING_CHALLENGE
Challenge: ${challenge.title}
Week: ${challenge.weekNumber}
Difficulty: ${challenge.difficulty}
Attempt: ${submission.attemptNumber}

## Challenge Description
${challenge.description}

${challenge.instructions}

## Review Criteria
${challenge.reviewCriteria
    .map((c) => `- **${c.category}** (weight: ${Math.round(c.weight * 100)}%): ${c.description}`)
    .join('\n')}

## Submitted Code
\`\`\`${submission.language}
${submission.code}
\`\`\`

${submission.description ? `## Student Notes\n${submission.description}\n` : ''}

---

## Instructions for Linus

You are reviewing code submitted by an intern in the BakedBot training program. This is a **learning environment** - your feedback should be constructive, educational, and encouraging.

### Your Task

1. **Evaluate** the code against each review criterion listed above
2. **Identify strengths** - what did they do well?
3. **Suggest improvements** - not just what's wrong, but **HOW to fix it** with examples
4. **Assign scores** for each category (0-100)
5. **Make decision**: APPROVE or NEEDS_REVISION

### Focus Areas

- **TypeScript**: Proper types, no \`any\`, correct return types
- **BakedBot Standards**: Follow patterns in CLAUDE.md (use server, error handling, logger)
- **Server Actions**: Correct directive usage, async patterns, proper structure
- **Authentication**: Proper use of \`requireUser()\`
- **Error Handling**: Try/catch blocks, meaningful error messages
- **Code Readability**: Clear variable names, proper formatting, comments where needed

### Approval Guidelines

**APPROVE if:**
- Meets all required criteria (60%+ on each category)
- No critical errors (security, crashes, major bugs)
- Follows BakedBot standards
- Code is functional and readable

**NEEDS_REVISION if:**
- Missing key requirements
- Critical errors or security issues
- Significant standard violations
- Below 60% on any required category

### Response Format

Return a JSON object with this **exact structure**:

\`\`\`json
{
    "overallScore": 85,
    "approved": true,
    "summary": "Great work! Your implementation follows most patterns correctly. I particularly liked your error handling approach. One area to improve is adding type definitions.",
    "strengths": [
        "Excellent error handling with try/catch",
        "Proper use of requireUser for auth",
        "Clean, readable code structure"
    ],
    "improvements": [
        "Add TypeScript return type: async function greetIntern(name: string): Promise<ActionResult<{ message: string }>>",
        "Consider using Zod schema validation for input",
        "Add JSDoc comment: /** Greets an intern by name */"
    ],
    "categoryScores": [
        {
            "category": "TypeScript",
            "score": 80,
            "feedback": "Good typing overall, but missing explicit return type. Add Promise<ActionResult<T>> to function signature."
        },
        {
            "category": "Server Actions",
            "score": 90,
            "feedback": "Correct use of 'use server' directive and async pattern. Well structured."
        },
        {
            "category": "Authentication",
            "score": 95,
            "feedback": "Perfect use of requireUser() at the start of the function."
        },
        {
            "category": "Code Quality",
            "score": 85,
            "feedback": "Clean and readable. Consider adding JSDoc comments for documentation."
        }
    ]
}
\`\`\`

### Important Notes

- **Be encouraging** - remember this is a learning environment
- **Be specific** - provide actionable feedback with examples
- **Be honest** - don't approve code that doesn't meet standards
- **Focus on teaching** - explain WHY something is wrong, not just WHAT
- **Balance** - highlight both strengths and improvements

If this is a resubmission (attempt ${submission.attemptNumber}), acknowledge their improvements from previous feedback.
`.trim();
}

/**
 * Parse Linus's response into structured feedback
 *
 * Handles different response formats (plain JSON, markdown code blocks, etc.)
 *
 * @param linusResponse - Raw response from Linus
 * @returns Structured LinusFeedback object
 */
export function parseLinusFeedback(linusResponse: string): LinusFeedback {
    try {
        // Extract JSON from response (may be wrapped in markdown code blocks)
        const jsonMatch =
            linusResponse.match(/```json\s*([\s\S]*?)\s*```/) || // Markdown JSON block
            linusResponse.match(/```\s*({[\s\S]*?})\s*```/) || // Generic code block with JSON
            linusResponse.match(/({[\s\S]*})/); // Plain JSON

        if (!jsonMatch) {
            logger.warn('[Linus Review] No JSON found in response', {
                responseLength: linusResponse.length,
                responseSample: linusResponse.substring(0, 200),
            });
            throw new Error('No JSON found in Linus response');
        }

        const parsed = JSON.parse(jsonMatch[1]);

        // Validate required fields
        if (
            typeof parsed.overallScore !== 'number' ||
            typeof parsed.approved !== 'boolean' ||
            !parsed.summary ||
            !Array.isArray(parsed.strengths) ||
            !Array.isArray(parsed.improvements) ||
            !Array.isArray(parsed.categoryScores)
        ) {
            logger.warn('[Linus Review] Invalid feedback structure', { parsed });
            throw new Error('Invalid feedback structure');
        }

        // Validate category scores
        for (const cat of parsed.categoryScores) {
            if (!cat.category || typeof cat.score !== 'number' || !cat.feedback) {
                throw new Error('Invalid category score structure');
            }
        }

        return parsed as LinusFeedback;
    } catch (error) {
        logger.error('[Linus Review] Failed to parse feedback', {
            error,
            linusResponse: linusResponse.substring(0, 500),
        });

        // Return default "needs manual review" feedback
        return {
            overallScore: 0,
            approved: false,
            summary:
                'Automated review failed. A human instructor will review your submission. Please contact your mentor on Slack.',
            strengths: [],
            improvements: ['Submission needs manual review due to parsing error'],
            categoryScores: [],
        };
    }
}

/**
 * Submit code to Linus for review
 *
 * This is the main entry point for getting AI feedback on intern submissions.
 *
 * @param challenge - The challenge being reviewed
 * @param submission - The intern's code submission
 * @returns Structured feedback from Linus
 */
export async function submitForReview(
    challenge: TrainingChallenge,
    submission: TrainingSubmission
): Promise<LinusFeedback> {
    const startTime = Date.now();

    logger.info('[Training] Submitting to Linus for review', {
        challengeId: challenge.id,
        submissionId: submission.id,
        userId: submission.userId,
        attemptNumber: submission.attemptNumber,
    });

    try {
        // Build review prompt
        const prompt = buildLinusReviewPrompt(challenge, submission);

        // Call Linus via agent chat system
        const result = await runAgentChat(prompt, 'linus', {
            source: 'training_review',
            modelLevel: 'standard', // Use standard model for cost efficiency
        });

        // Parse the response
        const feedback = parseLinusFeedback(result.content);

        const duration = Date.now() - startTime;

        logger.info('[Training] Linus review complete', {
            challengeId: challenge.id,
            submissionId: submission.id,
            approved: feedback.approved,
            score: feedback.overallScore,
            durationMs: duration,
        });

        return feedback;
    } catch (error) {
        const duration = Date.now() - startTime;

        logger.error('[Training] Linus review failed', {
            error,
            challengeId: challenge.id,
            submissionId: submission.id,
            durationMs: duration,
        });

        // Return fallback feedback on error
        return {
            overallScore: 0,
            approved: false,
            summary:
                'We encountered an error while reviewing your submission. Please try again, or contact your mentor on Slack if the issue persists.',
            strengths: [],
            improvements: ['Review system error - please resubmit'],
            categoryScores: [],
        };
    }
}

/**
 * Get review statistics for analytics
 *
 * @param challengeId - Challenge to analyze
 * @returns Stats about reviews for this challenge
 */
export async function getReviewStats(challengeId: string): Promise<{
    totalSubmissions: number;
    approved: number;
    needsRevision: number;
    averageScore: number;
    averageAttempts: number;
}> {
    // TODO: Implement when we have enough data
    // This would query Firestore for submission stats
    return {
        totalSubmissions: 0,
        approved: 0,
        needsRevision: 0,
        averageScore: 0,
        averageAttempts: 0,
    };
}
