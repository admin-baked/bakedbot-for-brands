'use server';

/**
 * Google Sheets Tool
 * 
 * Allows agents to read, append, and create spreadsheets.
 * Requires an access token stored in Firestore at `integrations/sheets`.
 */

import { getAdminFirestore } from '@/firebase/admin';

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

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

async function getAccessToken(): Promise<string | null> {
    try {
        const db = getAdminFirestore();
        const doc = await db.collection('integrations').doc('sheets').get();
        return doc.data()?.accessToken || null;
    } catch (e) {
        console.error('Failed to fetch Sheets token', e);
        return null;
    }
}

export async function sheetsAction(params: SheetsParams): Promise<SheetsResult> {
    const token = await getAccessToken();

    if (!token) {
        return {
            success: false,
            error: 'Authentication required. Please connect Sheets in Integrations.'
        };
    }

    const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    try {
        switch (params.action) {
            case 'read':
                if (!params.spreadsheetId || !params.range) {
                    return { success: false, error: 'Missing spreadsheetId or range' };
                }
                const readUrl = `${SHEETS_API_BASE}/${params.spreadsheetId}/values/${params.range}`;
                const readRes = await fetch(readUrl, { headers });

                if (!readRes.ok) throw new Error(`Sheets API error: ${readRes.statusText}`);
                const readData = await readRes.json();

                return {
                    success: true,
                    data: {
                        values: readData.values || [],
                        range: readData.range
                    }
                };

            case 'append':
                if (!params.spreadsheetId || !params.range || !params.values) {
                    return { success: false, error: 'Missing spreadsheetId, range, or values' };
                }

                const appendUrl = `${SHEETS_API_BASE}/${params.spreadsheetId}/values/${params.range}:append?valueInputOption=USER_ENTERED`;
                const appendRes = await fetch(appendUrl, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        range: params.range,
                        majorDimension: 'ROWS',
                        values: params.values
                    })
                });

                if (!appendRes.ok) throw new Error(`Sheets API error: ${appendRes.statusText}`);
                const appendData = await appendRes.json();

                return { success: true, data: appendData };

            case 'create':
                const createRes = await fetch(SHEETS_API_BASE, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        properties: {
                            title: params.title || 'Agent Spreadsheet'
                        }
                    })
                });

                if (!createRes.ok) throw new Error(`Sheets API error: ${createRes.statusText}`);
                const createData = await createRes.json();

                return {
                    success: true,
                    data: {
                        spreadsheetId: createData.spreadsheetId,
                        url: createData.spreadsheetUrl,
                        title: createData.properties.title
                    }
                };

            default:
                return { success: false, error: `Unknown action: ${params.action}` };
        }
    } catch (error: any) {
        console.error('[sheetsAction] Error:', error);
        return { success: false, error: error.message };
    }
}
