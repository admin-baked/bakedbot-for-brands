
import { logger } from '@/lib/logger';

export class CanvaService {
    private baseUrl = 'https://api.canva.com/rest/v1';
    private token: string | undefined;

    constructor() {
        this.token = process.env.CANVA_ACCESS_TOKEN;
        if (!this.token) {
            logger.warn('[Canva] Missing CANVA_ACCESS_TOKEN');
        }
    }

    private async fetch(endpoint: string, options: RequestInit = {}): Promise<any> {
        if (!this.token) throw new Error('Canva integration not configured');

        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        try {
            const res = await fetch(url, { ...options, headers });
            if (!res.ok) {
                const errorText = await res.text();
                throw new Error(`Canva API error (${res.status}): ${errorText}`);
            }
            return await res.json();
        } catch (e: any) {
             logger.error(`[Canva] Request failed: ${e.message}`);
             throw e;
        }
    }

    async listDesigns(sortBy: string = 'modified_desc'): Promise<any[]> {
        // GET /v1/designs
        // Note: Check actual Canva Connect API docs for precise query params
        try {
            const data = await this.fetch(`/designs?sort_by=${sortBy}`);
            return data.items || [];
        } catch (e) {
            // Fallback for demo/dev if API fails
            return []; 
        }
    }

    async createDesign(title: string, templateId?: string): Promise<any> {
        // POST /v1/designs
        const body: any = {
            title,
            design_type: 'presentation' // default
        };
        if (templateId) {
             // Logic to create from template
        }

        const data = await this.fetch('/designs', {
            method: 'POST',
            body: JSON.stringify(body)
        });
        
        return {
            id: data.id,
            url: data.url, // Edit URL
            thumbnail: data.thumbnail
        };
    }
}

export const canvaService = new CanvaService();
