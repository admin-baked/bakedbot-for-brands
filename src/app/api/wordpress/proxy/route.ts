import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const path = searchParams.get('path') || '';

  // Debug logging
  console.log('WordPress Proxy - Request path:', path);
  console.log('WordPress Proxy - ANDREWS_WP_URL:', process.env.ANDREWS_WP_URL);

  // Get the WordPress URL from environment
  const andrewsWpUrl = process.env.ANDREWS_WP_URL;
  if (!andrewsWpUrl) {
    return NextResponse.json({
      error: 'WordPress URL not configured',
      debug: {
        path,
        env: {
          ANDREWS_WP_URL: process.env.ANDREWS_WP_URL,
        }
      }
    }, { status: 500 });
  }

  // Construct the WordPress URL
  const wpUrl = `${andrewsWpUrl}${path ? '/' + path : ''}`;
  console.log('WordPress Proxy - Target URL:', wpUrl);

  try {
    // Forward the request to WordPress
    const response = await fetch(wpUrl, {
      method: request.method,
      headers: {
        'Host': new URL(andrewsWpUrl).hostname,
        'User-Agent': request.headers.get('user-agent') || '',
      },
    });

    console.log('WordPress Proxy - Response status:', response.status);

    // Return the response from WordPress
    return new Response(response.body, {
      status: response.status,
      headers: {
        'Content-Type': response.headers.get('content-type') || 'text/html',
      },
    });
  } catch (error) {
    console.error('WordPress Proxy - Error:', error);
    return NextResponse.json({
      error: 'Failed to fetch WordPress',
      debug: {
        path,
        wpUrl,
        error: error instanceof Error ? error.message : String(error)
      }
    }, { status: 500 });
  }
}