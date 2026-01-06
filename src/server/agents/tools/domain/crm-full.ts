// This file is NOT a server action file - it exports tool definitions
// which are objects, not async functions


/**
 * CRM Full Tools
 * 
 * Agent tools for the Full CRM system.
 * Available to all Executive Boardroom agents: Leo, Jack, Pops, Craig, Mrs. Parker, Deebo, Ezal, Money Mike
 */

import { 
    getPlatformUsers, 
    getCRMUserStats, 
    updateUserLifecycle, 
    addCRMNote,
    getBrands,
    getDispensaries,
    getPlatformLeads,
    type CRMFilters
} from '@/server/services/crm-service';
import { type CRMLifecycleStage } from '@/server/services/crm-types';
import { defineTool } from '@genkit-ai/ai';
import { z } from 'zod';

// List all platform users
export const crmListUsersTool = defineTool(
    {
        name: 'crm.listUsers',
        description: 'List all platform users with lifecycle tracking. Returns user info including email, account type, lifecycle stage, plan, and MRR.',
        inputSchema: z.object({
            search: z.string().optional().describe('Search by email, name, or organization'),
            lifecycleStage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback']).optional().describe('Filter by lifecycle stage'),
            limit: z.number().optional().describe('Maximum results to return (default 50)')
        }),
        outputSchema: z.object({
            users: z.array(z.object({
                id: z.string(),
                email: z.string(),
                displayName: z.string(),
                accountType: z.string(),
                lifecycleStage: z.string(),
                plan: z.string(),
                mrr: z.number(),
                signupAt: z.string(),
                orgName: z.string().nullable()
            })),
            total: z.number()
        })
    },
    async (input) => {
        const filters: CRMFilters = {
            limit: input.limit || 50,
            search: input.search,
            lifecycleStage: input.lifecycleStage as CRMLifecycleStage | undefined
        };
        
        const users = await getPlatformUsers(filters);
        
        return {
            users: users.map(u => ({
                id: u.id,
                email: u.email,
                displayName: u.displayName,
                accountType: u.accountType,
                lifecycleStage: u.lifecycleStage,
                plan: u.plan,
                mrr: u.mrr,
                signupAt: u.signupAt.toISOString(),
                orgName: u.orgName || null
            })),
            total: users.length
        };
    }
);

// Get CRM dashboard stats
export const crmGetStatsTool = defineTool(
    {
        name: 'crm.getStats',
        description: 'Get CRM dashboard statistics including total users, active users, MRR breakdown, and lifecycle funnel data.',
        inputSchema: z.object({}),
        outputSchema: z.object({
            totalUsers: z.number(),
            activeUsers: z.number(),
            totalMRR: z.number(),
            byLifecycle: z.record(z.number())
        })
    },
    async () => {
        const stats = await getCRMUserStats();
        return {
            totalUsers: stats.totalUsers,
            activeUsers: stats.activeUsers,
            totalMRR: stats.totalMRR,
            byLifecycle: stats.byLifecycle as Record<string, number>
        };
    }
);

// Update user lifecycle stage
export const crmUpdateLifecycleTool = defineTool(
    {
        name: 'crm.updateLifecycle',
        description: 'Update a user\'s lifecycle stage in the CRM. Use this to move users through the sales funnel.',
        inputSchema: z.object({
            userId: z.string().describe('The user ID to update'),
            stage: z.enum(['prospect', 'contacted', 'demo_scheduled', 'trial', 'customer', 'vip', 'churned', 'winback']).describe('The new lifecycle stage'),
            note: z.string().optional().describe('Optional note about why the stage was changed')
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string()
        })
    },
    async (input) => {
        try {
            await updateUserLifecycle(input.userId, input.stage, input.note);
            return {
                success: true,
                message: `User lifecycle updated to ${input.stage}`
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Failed to update lifecycle'
            };
        }
    }
);

// Add CRM note
export const crmAddNoteTool = defineTool(
    {
        name: 'crm.addNote',
        description: 'Add a note to a user\'s CRM record. Use this to document interactions, observations, or follow-up tasks.',
        inputSchema: z.object({
            userId: z.string().describe('The user ID to add note to'),
            note: z.string().describe('The note content'),
            authorId: z.string().optional().describe('The author ID (defaults to system)')
        }),
        outputSchema: z.object({
            success: z.boolean(),
            message: z.string()
        })
    },
    async (input) => {
        try {
            await addCRMNote(input.userId, input.note, input.authorId || 'system');
            return {
                success: true,
                message: 'Note added successfully'
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Failed to add note'
            };
        }
    }
);

// Search CRM (unified search across users, brands, dispensaries, leads)
export const crmSearchTool = defineTool(
    {
        name: 'crm.search',
        description: 'Unified search across all CRM entities: users, brands, dispensaries, and leads. Returns matching results from each category.',
        inputSchema: z.object({
            query: z.string().describe('Search query'),
            limit: z.number().optional().describe('Max results per category (default 10)')
        }),
        outputSchema: z.object({
            users: z.array(z.object({
                id: z.string(),
                email: z.string(),
                displayName: z.string(),
                lifecycleStage: z.string()
            })),
            brands: z.array(z.object({
                id: z.string(),
                name: z.string(),
                claimStatus: z.string()
            })),
            dispensaries: z.array(z.object({
                id: z.string(),
                name: z.string(),
                state: z.string(),
                claimStatus: z.string()
            })),
            leads: z.array(z.object({
                id: z.string(),
                email: z.string(),
                company: z.string()
            }))
        })
    },
    async (input) => {
        const limit = input.limit || 10;
        const filters: CRMFilters = { search: input.query, limit };
        
        const [users, brands, dispensaries, leads] = await Promise.all([
            getPlatformUsers(filters),
            getBrands(filters),
            getDispensaries(filters),
            getPlatformLeads(filters)
        ]);
        
        return {
            users: users.slice(0, limit).map(u => ({
                id: u.id,
                email: u.email,
                displayName: u.displayName,
                lifecycleStage: u.lifecycleStage
            })),
            brands: brands.slice(0, limit).map(b => ({
                id: b.id,
                name: b.name,
                claimStatus: b.claimStatus
            })),
            dispensaries: dispensaries.slice(0, limit).map(d => ({
                id: d.id,
                name: d.name,
                state: d.state,
                claimStatus: d.claimStatus
            })),
            leads: leads.slice(0, limit).map(l => ({
                id: l.id,
                email: l.email,
                company: l.company
            }))
        };
    }
);

// Export all CRM tools
export const crmFullTools = [
    crmListUsersTool,
    crmGetStatsTool,
    crmUpdateLifecycleTool,
    crmAddNoteTool,
    crmSearchTool
];
