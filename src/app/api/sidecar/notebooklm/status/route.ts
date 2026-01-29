import { NextResponse } from 'next/server';

/**
 * GET /api/sidecar/notebooklm/status
 *
 * Checks the authentication status of NotebookLM integration
 */
export async function GET() {
  try {
    const sidecarUrl = process.env.PYTHON_SIDECAR_URL;

    if (!sidecarUrl) {
      return NextResponse.json({
        authenticated: false,
        error: 'Sidecar not configured',
      });
    }

    // Call the NotebookLM healthcheck tool
    const response = await fetch(`${sidecarUrl}/mcp/call`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool_name: 'healthcheck',
        arguments: {},
      }),
    });

    if (!response.ok) {
      return NextResponse.json({
        authenticated: false,
        error: 'Failed to connect to sidecar',
      });
    }

    const data = await response.json();

    // Parse the healthcheck result
    if (data.success && data.result && data.result.length > 0) {
      const healthResult = JSON.parse(data.result[0].text);

      return NextResponse.json({
        authenticated: healthResult.authenticated || false,
        session_id: healthResult.session_id,
        notebook_id: healthResult.notebook_id || '59f47d3e-9e5c-4adc-9254-bd78f076898c',
        status: healthResult.status,
      });
    }

    return NextResponse.json({
      authenticated: false,
      error: 'Invalid healthcheck response',
    });

  } catch (error) {
    console.error('NotebookLM status check failed:', error);
    return NextResponse.json({
      authenticated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
