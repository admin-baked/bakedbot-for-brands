import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';

  // Get the WordPress URL from environment
  const andrewsWpUrl = process.env.ANDREWS_WP_URL;
  if (!andrewsWpUrl) {
    return NextResponse.json({ error: 'WordPress URL not configured' }, { status: 500 });
  }

  // Construct the WordPress URL
  const wpUrl = `${andrewsWpUrl}${path ? '/' + path : ''}`;

  try {
    // Forward the request to WordPress
    const response = await fetch(wpUrl, {
      method: request.method,
      headers: {
        'Host': new URL(andrewsWpUrl).hostname,
        'User-Agent': request.headers.get('user-agent') || '',
      },
    });

    // Return the response from WordPress
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'text/html',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch WordPress' }, { status: 500 });
  }
}