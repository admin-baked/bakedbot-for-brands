import { getSlackToken } from './token-storage';

/**
 * Posts a message to a Slack channel.
 * Uses native fetch to avoid adding @slack/web-api dependency.
 */
export async function postMessage(userId: string, channel: string, text: string) {
    // 1. Get Token
    const token = await getSlackToken(userId);
    if (!token) {
        throw new Error('User has not connected Slack.');
    }

    // 2. Call API
    try {
        const response = await fetch('https://slack.com/api/chat.postMessage', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                channel: channel,
                text: text
            })
        });

        const data = await response.json();

        if (!data.ok) {
            throw new Error(data.error || 'Unknown Slack error');
        }

        return {
            ts: data.ts,
            channel: data.channel,
            message: data.message?.text
        };

    } catch (error: any) {
        throw new Error(`Slack API Error: ${error.message}`);
    }
}
