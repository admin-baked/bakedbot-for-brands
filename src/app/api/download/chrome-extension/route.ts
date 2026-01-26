/**
 * Chrome Extension Download API Route
 *
 * GET /api/download/chrome-extension - Download the BakedBot AI Chrome Extension
 *
 * Returns the extension as a zip file for manual installation.
 */

import { NextResponse } from 'next/server';
import { requireSuperUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';
import * as fs from 'fs';
import * as path from 'path';
import archiver from 'archiver';

export async function GET() {
  try {
    // Require super user authentication
    await requireSuperUser();

    // Path to the chrome-extension dist folder
    const extensionPath = path.join(process.cwd(), 'chrome-extension', 'dist');

    // Check if dist folder exists
    if (!fs.existsSync(extensionPath)) {
      logger.error('Chrome extension dist folder not found', { path: extensionPath });
      return NextResponse.json(
        { error: 'Extension not built. Please run npm run build in chrome-extension folder.' },
        { status: 404 }
      );
    }

    // Create a zip archive in memory
    const archive = archiver('zip', { zlib: { level: 9 } });

    // Collect chunks
    const chunks: Buffer[] = [];

    // Create a promise to wait for the archive to complete
    const archivePromise = new Promise<Buffer>((resolve, reject) => {
      archive.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
      });

      archive.on('end', () => {
        resolve(Buffer.concat(chunks));
      });

      archive.on('error', (err: any) => {
        reject(err);
      });
    });

    // Add the dist folder contents
    archive.directory(extensionPath, false);

    // Finalize the archive
    archive.finalize();

    // Wait for completion
    const zipBuffer = await archivePromise;

    // Return the zip file (convert Buffer to Uint8Array for NextResponse)
    return new NextResponse(new Uint8Array(zipBuffer), {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': 'attachment; filename="bakedbot-chrome-extension.zip"',
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    logger.error('Failed to download Chrome extension', { error });

    if (error instanceof Error && error.message.includes('Super User')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(
      { error: 'Failed to generate extension download' },
      { status: 500 }
    );
  }
}
