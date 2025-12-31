import { google } from 'googleapis';
import { createOAuth2Client } from '../google/client';
import { getSheetsToken } from './token-storage';

/**
 * Creates a new Google Sheet for the user.
 */
export async function createSpreadsheet(userId: string, title: string) {
    // 1. Get Tokens
    const tokens = await getSheetsToken(userId);
    if (!tokens) {
        throw new Error('User has not connected Google Sheets.');
    }

    // 2. Create Client & Auth
    const auth = await createOAuth2Client();
    auth.setCredentials(tokens);

    // 3. Call API
    const sheets = google.sheets({ version: 'v4', auth });
    
    try {
        const response = await sheets.spreadsheets.create({
            requestBody: {
                properties: {
                    title: title || 'New Spreadsheet'
                }
            }
        });

        return {
            spreadsheetId: response.data.spreadsheetId,
            url: response.data.spreadsheetUrl,
            title: response.data.properties?.title
        };
    } catch (error: any) {
        throw new Error(`Google Sheets API Error: ${error.message}`);
    }
}
