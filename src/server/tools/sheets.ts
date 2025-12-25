'use server';

/**
 * Google Sheets Tool
 * 
 * Allows agents to read, append, and create spreadsheets.
 * Uses User-Scoped Authentication via `requireUser`.
 */

import { google } from 'googleapis';
import { requireUser } from '@/server/auth/auth';
import { getSheetsToken } from '@/server/integrations/sheets/token-storage';
import { getOAuth2ClientAsync } from '@/server/integrations/gmail/oauth';

export type SheetsAction = 'read' | 'append' | 'create';

export interface SheetsParams {
    action: SheetsAction;
    spreadsheetId?: string; // For 'read' and 'append'
    range?: string;         // For 'read' and 'append' (e.g. "Sheet1!A1:B2")
    values?: string[][];    // For 'append' (2D array of strings)
    title?: string;         // For 'create'
}

export interface SheetsResult {
    success: boolean;
    data?: any;
    error?: string;
}

import { DecodedIdToken } from 'firebase-admin/auth';

export async function sheetsAction(params: SheetsParams, injectedUser?: DecodedIdToken): Promise<SheetsResult> {
    try {
        // 1. Authenticate User
        const user = injectedUser || await requireUser();

        // 2. Get User-Specific Token
        const credentials = await getSheetsToken(user.uid);

        if (!credentials || (!credentials.access_token && !credentials.refresh_token)) {
            return {
                success: false,
                error: 'Sheets is not connected. Please connect your account in Settings > Integrations.'
            };
        }

        // 3. Initialize OAuth Client
        const authClient = await getOAuth2ClientAsync();
        authClient.setCredentials(credentials);

        // 4. Initialize Sheets API
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        switch (params.action) {
            case 'read':
                if (!params.spreadsheetId || !params.range) {
                    return { success: false, error: 'Missing spreadsheetId or range' };
                }
                
                const readRes = await sheets.spreadsheets.values.get({
                    spreadsheetId: params.spreadsheetId,
                    range: params.range
                });

                return {
                    success: true,
                    data: {
                        values: readRes.data.values || [],
                        range: readRes.data.range
                    }
                };

            case 'append':
                if (!params.spreadsheetId || !params.range || !params.values) {
                    return { success: false, error: 'Missing spreadsheetId, range, or values' };
                }

                const appendRes = await sheets.spreadsheets.values.append({
                    spreadsheetId: params.spreadsheetId,
                    range: params.range,
                    valueInputOption: 'USER_ENTERED',
                    requestBody: {
                        range: params.range,
                        majorDimension: 'ROWS',
                        values: params.values
                    }
                });

                return { success: true, data: appendRes.data };

            case 'create':
                const createRes = await sheets.spreadsheets.create({
                    requestBody: {
                        properties: {
                            title: params.title || 'Agent Spreadsheet'
                        }
                    }
                });

                return {
                    success: true,
                    data: {
                        spreadsheetId: createRes.data.spreadsheetId,
                        url: createRes.data.spreadsheetUrl,
                        title: createRes.data.properties?.title
                    }
                };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[sheetsAction] Error:', error);

        if (error.message.includes('invalid_grant') || error.code === 401) {
             return { success: false, error: 'Sheets session expired. Please reconnect in Settings.' };
        }

        return { success: false, error: error.message };
    }
}
