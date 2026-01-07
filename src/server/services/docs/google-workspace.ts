
import { google } from 'googleapis';
import { logger } from '@/lib/logger';

export class GoogleWorkspaceService {
    private auth: any;

    constructor() {
        // Automatically uses GOOGLE_APPLICATION_CREDENTIALS
        this.auth = new google.auth.GoogleAuth({
            scopes: [
                'https://www.googleapis.com/auth/documents',
                'https://www.googleapis.com/auth/spreadsheets',
                'https://www.googleapis.com/auth/drive'
            ],
        });
    }

    /**
     * Create a new Google Doc
     */
    async createDoc(title: string, content: string): Promise<any> {
        try {
            const client = await this.auth.getClient();
            const docs = google.docs({ version: 'v1', auth: client });
            
            // 1. Create the blank doc
            const createRes = await docs.documents.create({
                requestBody: { title },
            });
            const documentId = createRes.data.documentId;

            if (!documentId) throw new Error('Failed to create document ID');

            // 2. Insert content
            await docs.documents.batchUpdate({
                documentId,
                requestBody: {
                    requests: [
                        {
                            insertText: {
                                text: content,
                                location: { index: 1 }, // Start of doc
                            },
                        },
                    ],
                },
            });

            return {
                id: documentId,
                title: createRes.data.title,
                url: `https://docs.google.com/document/d/${documentId}/edit`
            };

        } catch (e: any) {
            logger.error(`[GoogleDocs] Create failed: ${e.message}`);
            throw e;
        }
    }

    /**
     * Read from a Google Sheet
     */
    async readSheet(spreadsheetId: string, range: string): Promise<any> {
        try {
            const client = await this.auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: client });
            
            const res = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            return {
                values: res.data.values || []
            };
        } catch (e: any) {
             logger.error(`[GoogleSheets] Read failed: ${e.message}`);
             throw e;
        }
    }

    /**
     * Append to a Google Sheet
     */
    async appendToSheet(spreadsheetId: string, range: string, values: string[][]): Promise<any> {
        try {
            const client = await this.auth.getClient();
            const sheets = google.sheets({ version: 'v4', auth: client });
            
            const res = await sheets.spreadsheets.values.append({
                spreadsheetId,
                range,
                valueInputOption: 'USER_ENTERED',
                requestBody: {
                    values,
                },
            });

            return {
                updatedRange: res.data.updates?.updatedRange,
                updatedRows: res.data.updates?.updatedRows
            };
        } catch (e: any) {
             logger.error(`[GoogleSheets] Append failed: ${e.message}`);
             throw e;
        }
    }
}

export const googleWorkspaceService = new GoogleWorkspaceService();
