/**
 * GET /api/themes/css?themeId={themeId}&orgId={orgId}
 *
 * Extract and serve theme CSS from uploaded WordPress theme ZIP
 *
 * Returns:
 *   - 200: CSS text/css
 *   - 404: Theme not found
 *   - 400: Invalid request
 *   - 500: Extraction error
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '@/lib/logger';

/**
 * Extract CSS from theme ZIP file
 *
 * Looks for style.css in the theme root
 */
async function extractThemeCss(zipBuffer: Buffer): Promise<string | null> {
  try {
    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    await zip.loadAsync(zipBuffer);

    // Try to find style.css
    const styleCssFile = zip.file('style.css');
    if (!styleCssFile) {
      logger.warn('[CSS Extraction] style.css not found in theme');
      return null;
    }

    const css = await styleCssFile.async('text');
    return css;
  } catch (error) {
    logger.error('[CSS Extraction] Error extracting CSS', { error });
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const themeId = searchParams.get('themeId');
    const orgId = searchParams.get('orgId');

    if (!themeId || !orgId) {
      return NextResponse.json(
        { error: 'themeId and orgId required' },
        { status: 400 },
      );
    }

    // Validate theme exists and belongs to org
    // (In production, verify org membership)

    // Build storage path
    // Note: We don't know the version, so we search for any matching theme ZIP
    const bucket = getStorage().bucket();
    const [files] = await bucket.getFiles({
      prefix: `themes/${orgId}/${themeId}/`,
      delimiter: '/',
    });

    const themeZip = files.find(f => f.name.endsWith('.zip'));
    if (!themeZip) {
      logger.warn('[CSS Extraction] Theme ZIP not found', { orgId, themeId });
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 },
      );
    }

    // Download ZIP and extract CSS
    const [buffer] = await themeZip.download();
    const css = await extractThemeCss(buffer as Buffer);

    if (!css) {
      logger.warn('[CSS Extraction] No CSS found in theme', { orgId, themeId });
      return NextResponse.json(
        { error: 'No CSS found in theme' },
        { status: 404 },
      );
    }

    logger.info('[CSS Extraction] CSS extracted successfully', {
      orgId,
      themeId,
      cssSize: css.length,
    });

    // Return CSS with cache headers
    return new NextResponse(css, {
      status: 200,
      headers: {
        'Content-Type': 'text/css; charset=utf-8',
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    logger.error('[CSS Extraction] API error', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
