import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, unlink } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

/**
 * POST /api/sidecar/notebooklm/import-cookies
 *
 * Imports cookies to the NotebookLM Chrome profile on the sidecar VM
 */
export async function POST(request: NextRequest) {
  try {
    const { cookies } = await request.json();

    if (!cookies || !Array.isArray(cookies)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid cookies format',
      }, { status: 400 });
    }

    // Validate we have Google cookies
    const hasGoogleCookies = cookies.some(c =>
      c.domain && (c.domain.includes('google.com') || c.domain.includes('notebooklm'))
    );

    if (!hasGoogleCookies) {
      return NextResponse.json({
        success: false,
        error: 'No Google cookies found. Please export cookies while logged into NotebookLM.',
      }, { status: 400 });
    }

    // Write cookies to temporary file
    const tempFile = join(tmpdir(), `notebooklm-cookies-${Date.now()}.json`);
    await writeFile(tempFile, JSON.stringify(cookies, null, 2));

    try {
      // Run the cookie import script
      const scriptPath = join(process.cwd(), 'python-sidecar', 'auth-via-cookies.ps1');
      const cookiesPath = join(process.cwd(), 'python-sidecar', 'cookies.json');

      // Copy temp file to expected location
      await writeFile(cookiesPath, JSON.stringify(cookies, null, 2));

      // Execute PowerShell script
      const { stdout, stderr } = await execAsync(
        `powershell.exe -ExecutionPolicy Bypass -File "${scriptPath}"`,
        {
          cwd: join(process.cwd(), 'python-sidecar'),
          timeout: 120000, // 2 minute timeout
        }
      );

      console.log('Cookie import output:', stdout);
      if (stderr) {
        console.error('Cookie import errors:', stderr);
      }

      // Check if import was successful
      const successMatch = stdout.match(/Successfully imported (\d+) Google cookies/);
      const cookieCount = successMatch ? parseInt(successMatch[1]) : cookies.length;

      return NextResponse.json({
        success: true,
        cookieCount,
        message: `Imported ${cookieCount} cookies. Service is restarting...`,
      });

    } finally {
      // Clean up temp file
      try {
        await unlink(tempFile);
      } catch (e) {
        // Ignore cleanup errors
      }
    }

  } catch (error) {
    console.error('Cookie import failed:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
