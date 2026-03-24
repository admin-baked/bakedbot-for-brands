import { z } from 'zod';
import { Logging } from '@google-cloud/logging';
import { slackService } from '../services/communications/slack';

export const fetchProductionLogsToolDef = {
    name: 'fetch_production_logs',
    description: 'Fetch recent application or error logs directly from Google Cloud Logging for production troubleshooting.',
    schema: z.object({
        query: z.string().optional().describe('Optional GCP advanced logs query string. (e.g. "severity=ERROR")'),
        limit: z.number().optional().describe('Max number of logs to return. Default 20, Max 100.')
    }),
    async execute(inputs: any, context?: any) {
        try {
            const logging = new Logging();
            const limit = Math.min(inputs.limit || 20, 100);
            
            // Default to filtering out normal info, focusing on WARNING/ERROR/CRITICAL if no query provided
            const filter = inputs.query || 'severity>=WARNING';
            
            const [entries] = await logging.getEntries({
                filter,
                pageSize: limit,
                orderBy: 'timestamp desc'
            });
            
            return {
                success: true,
                count: entries.length,
                logs: entries.map(e => ({
                    timestamp: e.metadata.timestamp,
                    severity: e.metadata.severity,
                    message: typeof e.data === 'string' ? e.data : JSON.stringify(e.data),
                    labels: e.metadata.labels
                }))
            };
        } catch (error: any) {
            return { success: false, error: `Failed to fetch GCP logs: ${error.message}` };
        }
    }
};

export const createIncidentRoomToolDef = {
    name: 'create_incident_room',
    description: 'Create a dedicated Slack channel for a production incident, invite key personnel, and post an initial context brief.',
    schema: z.object({
        channelName: z.string().describe('Name of the incident channel (e.g., inc-auth-failure, must be lowercase, no spaces). Max 80 chars.'),
        topic: z.string().describe('Short topic description for the channel.'),
        initialBriefing: z.string().describe('The initial message to post in the room stating what is broken and the current status.')
    }),
    async execute(inputs: any, context?: any) {
        try {
            // Ensure valid Slack channel name
            const sanitizedName = inputs.channelName.toLowerCase().replace(/[^a-z0-9-_]/g, '-').substring(0, 80);
            
            // 1. Create Channel
            const channel = await slackService.createChannel(sanitizedName);
            if (!channel) {
                return { success: false, error: `Failed to create Slack channel. It may already exist or token lacks permissions.` };
            }
            
            // 2. Set Topic
            await slackService.setChannelTopic(channel.id, inputs.topic);
            
            // 3. Post Briefing
            const blocks = [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🚨 ACTIVE INCIDENT ROOM",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Topic:* ${inputs.topic}\n\n*Incident Brief:*\n${inputs.initialBriefing}`
                    }
                }
            ];
            
            await slackService.postMessage(channel.id, 'New Incident Created', blocks);
            
            return {
                success: true,
                channelId: channel.id,
                channelName: channel.name,
                message: `Incident room #${channel.name} created successfully.`
            };
        } catch (error: any) {
            return { success: false, error: `Failed to orchestrate incident room: ${error.message}` };
        }
    }
};
