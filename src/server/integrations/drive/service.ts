import { google } from 'googleapis';
import { createOAuth2Client } from '../google/client';
import { getDriveToken } from './token-storage';
import { Readable } from 'stream';

/**
 * Uploads a file to Google Drive.
 */
export async function uploadFile(userId: string, filename: string, content: string | Buffer, mimeType: string = 'text/plain') {
    // 1. Get Tokens
    const tokens = await getDriveToken(userId);
    if (!tokens) {
        throw new Error('User has not connected Google Drive.');
    }

    // 2. Create Client & Auth
    const auth = await createOAuth2Client();
    auth.setCredentials(tokens);

    // 3. Call API
    const drive = google.drive({ version: 'v3', auth: auth as any });

    try {
        const fileMetadata = {
            name: filename,
        };

        const media = {
            mimeType: mimeType,
            body: Readable.from(content),
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink',
        });

        return {
            fileId: response.data.id,
            url: response.data.webViewLink,
            name: response.data.name
        };
    } catch (error: any) {
        throw new Error(`Google Drive API Error: ${error.message}`);
    }
}
