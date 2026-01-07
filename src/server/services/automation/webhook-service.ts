
import { logger } from '@/lib/logger';

export class WebhookService {
    
    /**
     * Triggers a Zapier Webhook.
     * @param hookId The specific hook ID (often part of the URL) or a full URL if provided.
     * @param payload Data to send.
     */
    async triggerZap(hookId: string, payload: any): Promise<any> {
        // Construct URL - usually hooks.zapier.com/hooks/catch/USER_ID/HOOK_ID/
        // For security, we might store the BASE_URL in env and just append ID.
        // Assuming hookId is the full webhook URL or constructing it from parts.
        
        let url = hookId;
        // Simple validation: if it doesn't look like a URL and we have a base, prepend.
        if (!url.startsWith('http') && process.env.ZAPIER_WEBHOOK_BASE) {
            url = `${process.env.ZAPIER_WEBHOOK_BASE}/${hookId}`;
        } else if (!url.startsWith('http')) {
             // Fallback if user passes just an ID but we have no base
             // This assumes the user passed a full URL if no base is set.
             // If not, we error.
             if (url.includes('/')) {
                 // Might be partial path
                 url = `https://hooks.zapier.com/hooks/catch/${url}`;
             } else {
                 throw new Error('Invalid Zapier Hook ID or URL');
             }
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`Zapier responded with ${response.status}`);
            }

            return await response.json();
        } catch (e: any) {
            logger.error(`[Zapier] Trigger failed: ${e.message}`);
            throw e;
        }
    }

    /**
     * Triggers an n8n Workflow Webhook.
     */
    async triggerN8N(webhookId: string, payload: any): Promise<any> {
        // Similar logic for n8n
        let url = webhookId;
        if (!url.startsWith('http') && process.env.N8N_WEBHOOK_BASE) {
            url = `${process.env.N8N_WEBHOOK_BASE}/${webhookId}`;
        }

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                throw new Error(`n8n responded with ${response.status}`);
            }

            // n8n webhooks might return text or JSON
            const text = await response.text();
            try { return JSON.parse(text); } catch { return { message: text }; }
            
        } catch (e: any) {
             logger.error(`[n8n] Trigger failed: ${e.message}`);
             throw e;
        }
    }
}

export const webhookService = new WebhookService();
