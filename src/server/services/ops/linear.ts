
import { LinearClient } from '@linear/sdk';
import { logger } from '@/lib/logger';

export class LinearService {
    private client: LinearClient | null = null;

    constructor() {
        if (process.env.LINEAR_API_KEY) {
            this.client = new LinearClient({ apiKey: process.env.LINEAR_API_KEY });
        } else {
            logger.warn('[Linear] Missing LINEAR_API_KEY');
        }
    }

    async createIssue(title: string, description: string, priority: number = 0): Promise<any> {
        if (!this.client) throw new Error('Linear integration not configured');

        // Note: In a real app, we'd need to look up a Team ID first.
        // For MVP, we assume a default team ID is provided in ENV or look up the first one.
        let teamId = process.env.LINEAR_DEFAULT_TEAM_ID;
        
        if (!teamId) {
            const teams = await this.client.teams();
            if (teams.nodes.length > 0) {
                teamId = teams.nodes[0].id;
            } else {
                 throw new Error('No Linear teams found to assign issue to.');
            }
        }

        const issuePayload = await this.client.createIssue({
            teamId: teamId!,
            title,
            description,
            priority
        });

        const issue = await issuePayload.issue;
        return {
            id: issue?.id,
            identifier: issue?.identifier,
            url: issue?.url,
            title: issue?.title
        };
    }

    async getIssues(filter?: string): Promise<any[]> {
        if (!this.client) throw new Error('Linear integration not configured');
        
        // Basic filtering or just catch-all
        const issues = await this.client.issues({ first: 10, orderBy: LinearClient.convertorderBy.UpdatedAt });
        return issues.nodes.map(i => ({
            id: i.id,
            identifier: i.identifier,
            title: i.title,
            priority: i.priority,
            status: i.state.then(s => s?.name) // resolving promise for state name if needed, usually async
        }));
    }
}

export const linearService = new LinearService();
