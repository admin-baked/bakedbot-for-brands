
import { Client } from '@notionhq/client';
import { logger } from '@/lib/logger';

export class NotionService {
    private client: Client | null = null;
    private databaseId: string | undefined;

    constructor() {
        if (process.env.NOTION_API_KEY) {
            this.client = new Client({ auth: process.env.NOTION_API_KEY });
            this.databaseId = process.env.NOTION_DATABASE_ID;
            
            if (!this.databaseId) {
                logger.warn('[Notion] Missing NOTION_DATABASE_ID (Default DB for new pages)');
            }
        } else {
            logger.warn('[Notion] Missing NOTION_API_KEY');
        }
    }

    async search(query: string): Promise<any[]> {
        if (!this.client) throw new Error('Notion integration not configured');

        try {
            const response = await this.client.search({
                query,
                sort: {
                    direction: 'descending',
                    timestamp: 'last_edited_time',
                },
                page_size: 10
            });

            return response.results.map((page: any) => ({
                id: page.id,
                url: page.url,
                title: page.properties?.Name?.title?.[0]?.plain_text || 
                       page.properties?.title?.title?.[0]?.plain_text || 
                       'Untitled',
                last_edited: page.last_edited_time
            }));
        } catch (e: any) {
             logger.error(`[Notion] Search failed: ${e.message}`);
             throw e;
        }
    }

    async createPage(title: string, content: string): Promise<any> {
        if (!this.client || !this.databaseId) throw new Error('Notion integration not fully configured (Key/DB ID missing)');

        try {
            const response = await this.client.pages.create({
                parent: { database_id: this.databaseId },
                properties: {
                    Name: {
                        title: [
                            {
                                text: {
                                    content: title,
                                },
                            },
                        ],
                    },
                },
                children: [
                    {
                        object: 'block',
                        type: 'paragraph',
                        paragraph: {
                            rich_text: [
                                {
                                    type: 'text',
                                    text: {
                                        content,
                                    },
                                },
                            ],
                        },
                    },
                ],
            });

            return {
                id: response.id,
                url: (response as any).url
            };
        } catch (e: any) {
            logger.error(`[Notion] Create Page failed: ${e.message}`);
            throw e;
        }
    }
}

export const notionService = new NotionService();
