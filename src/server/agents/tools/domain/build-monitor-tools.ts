/**
 * Linus (CTO) Agent Tools - Build Monitoring & Diagnosis
 * Tools for monitoring Firebase builds and diagnosing deployment failures
 */

import { tool } from 'genkit';
import { z } from 'zod';
import {
    getRecentBuildStatuses,
    getLastBuildStatus,
    recordBuildStatus,
    notifyBuildFailure
} from '@/server/services/firebase-build-monitor';

export const buildMonitorGetRecentTool = tool(
    {
        name: 'build_monitor_get_recent',
        description: 'Get recent build statuses and identify failures',
        inputSchema: z.object({
            limit: z.number().min(1).max(50).default(10).describe('Number of recent builds to check')
        }),
        outputSchema: z.object({
            builds: z.array(z.object({
                commitHash: z.string(),
                status: z.enum(['pending', 'building', 'success', 'failed']),
                timestamp: z.string(),
                duration: z.number().optional(),
                errorMessage: z.string().optional(),
                notificationsSent: z.object({
                    email: z.boolean(),
                    slack: z.boolean(),
                    agent: z.boolean()
                })
            })),
            failureCount: z.number()
        })
    },
    async (input: any) => {
        const builds = await getRecentBuildStatuses(input.limit);
        const failureCount = builds.filter(b => b.status === 'failed').length;

        return {
            builds: builds.map(b => ({
                commitHash: b.commitHash,
                status: b.status,
                timestamp: b.timestamp.toISOString(),
                duration: b.duration,
                errorMessage: b.errorMessage,
                notificationsSent: b.notificationsSent
            })),
            failureCount
        };
    }
);

export const buildMonitorGetLastStatusTool = tool(
    {
        name: 'build_monitor_get_last_status',
        description: 'Get the last build status',
        inputSchema: z.object({}),
        outputSchema: z.object({
            commitHash: z.string(),
            status: z.enum(['pending', 'building', 'success', 'failed']),
            timestamp: z.string(),
            duration: z.number().optional(),
            errorMessage: z.string().optional()
        }).nullable()
    },
    async () => {
        const build = await getLastBuildStatus();
        if (!build) {
            return null;
        }

        return {
            commitHash: build.commitHash,
            status: build.status,
            timestamp: build.timestamp.toISOString(),
            duration: build.duration,
            errorMessage: build.errorMessage
        };
    }
);

export const buildMonitorAnalyzeFailureTool = tool(
    {
        name: 'build_monitor_analyze_failure',
        description: 'Analyze a build failure and provide diagnosis',
        inputSchema: z.object({
            commitHash: z.string().describe('Git commit hash'),
            errorMessage: z.string().describe('Error message from build failure')
        }),
        outputSchema: z.object({
            diagnosis: z.string(),
            commonCauses: z.array(z.string()),
            suggestedActions: z.array(z.string()),
            severity: z.enum(['critical', 'high', 'medium', 'low'])
        })
    },
    async (input: any) => {
        const { commitHash, errorMessage } = input;
        const lowerError = errorMessage.toLowerCase();

        // Analyze common patterns
        let diagnosis = '';
        let severity: 'critical' | 'high' | 'medium' | 'low' = 'medium';
        const commonCauses: string[] = [];
        const suggestedActions: string[] = [];

        if (lowerError.includes('getfirestore') || lowerError.includes('firebase') || lowerError.includes('initialization')) {
            diagnosis = 'Firebase SDK initialization error - likely module-level Firestore call causing webpack build failure';
            severity = 'critical';
            commonCauses.push('Module-level getAdminFirestore() call (not lazy-initialized)');
            commonCauses.push('Firebase credentials unavailable during build time');
            commonCauses.push('Service files imported by client components');
            suggestedActions.push('Use lazy-initialization pattern: wrap getAdminFirestore() in getFirestore() function');
            suggestedActions.push('Only call getFirestore() at runtime, not module load');
            suggestedActions.push('Verify no client components import from src/server/services');
        } else if (lowerError.includes('typescript') || lowerError.includes('type')) {
            diagnosis = 'TypeScript compilation error - type mismatches or invalid imports';
            severity = 'high';
            commonCauses.push('Type errors in service files');
            commonCauses.push('Untyped error parameters in catch blocks');
            commonCauses.push('Missing or incorrect type definitions');
            suggestedActions.push('Run npm run check:types locally to identify errors');
            suggestedActions.push('Fix type errors: catch (error: any) with proper error handling');
            suggestedActions.push('Ensure all logger calls have properly typed data');
        } else if (lowerError.includes('recharts') || lowerError.includes('chart')) {
            diagnosis = 'Recharts import or component error - non-existent exports or component usage';
            severity = 'high';
            commonCauses.push('Importing non-existent recharts components');
            commonCauses.push('ChartContainer, ChartTooltip, ChartLegend don\'t exist in recharts');
            suggestedActions.push('Use standard recharts: Tooltip, Legend, ResponsiveContainer');
            suggestedActions.push('Replace custom chart wrapper with ResponsiveContainer from recharts');
        } else if (lowerError.includes('syntax') || lowerError.includes('parse')) {
            diagnosis = 'JavaScript/TypeScript syntax error - parsing failed during build';
            severity = 'critical';
            commonCauses.push('Syntax errors in TypeScript/JavaScript');
            commonCauses.push('Invalid JSX syntax');
            commonCauses.push('Unmatched braces or parentheses');
            suggestedActions.push('Check recent commits for syntax errors');
            suggestedActions.push('Run npm run check:types to find location of error');
            suggestedActions.push('Review diff of latest commits');
        } else {
            diagnosis = 'Unknown build failure - needs investigation';
            severity = 'medium';
            commonCauses.push('Unknown cause - detailed error analysis needed');
            suggestedActions.push('Check full Firebase build logs for detailed error');
            suggestedActions.push('Review recent commits for changes');
            suggestedActions.push('Run npm run check:types and npm test locally');
        }

        return {
            diagnosis,
            commonCauses,
            suggestedActions,
            severity
        };
    }
);

export const buildMonitorNotifyFailureTool = tool(
    {
        name: 'build_monitor_notify_failure',
        description: 'Send failure notifications to Super Users',
        inputSchema: z.object({
            commitHash: z.string(),
            errorMessage: z.string(),
            recipientEmail: z.string().email()
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string()
        })
    },
    async (input: any) => {
        try {
            await notifyBuildFailure(
                input.commitHash,
                input.errorMessage,
                input.recipientEmail
            );
            return {
                success: true,
                message: `Notifications sent for build failure ${input.commitHash.slice(0, 8)}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to send notifications: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
);

export const buildMonitorRecordStatusTool = tool(
    {
        name: 'build_monitor_record_status',
        description: 'Record a build status check',
        inputSchema: z.object({
            commitHash: z.string(),
            status: z.enum(['pending', 'building', 'success', 'failed']),
            duration: z.number(),
            errorMessage: z.string().optional()
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string()
        })
    },
    async (input: any) => {
        try {
            await recordBuildStatus({
                commitHash: input.commitHash,
                status: input.status,
                timestamp: new Date(),
                duration: input.duration,
                errorMessage: input.errorMessage,
                notificationsSent: {
                    email: false,
                    slack: false,
                    agent: false
                }
            });
            return {
                success: true,
                message: `Recorded build status for ${input.commitHash.slice(0, 8)}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: `Failed to record status: ${error instanceof Error ? error.message : String(error)}`
            };
        }
    }
);
