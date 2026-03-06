import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { path: string[] } }
) {
  const path = params.path.join('/') || '';

  // Get the WordPress URL from environment
  const andrewsWpUrl = process.env.ANDREWS_WP_URL || 'https://andrews-wp-lo74oftdza-uc.a.run.app';

  // Construct the WordPress URL
  const wpUrl = `${andrewsWpUrl}/${path}`;

  try {
    // Forward the request to WordPress
    const response = await fetch(wpUrl, {
      method: request.method,
      headers: {
        'Host': new URL(andrewsWpUrl).hostname,
        'User-Agent': request.headers.get('user-agent') || '',
        'Accept': '*/*',
      },
    });

    // Create a new response with WordPress content
    const headers = new Headers();
    for (const [key, value] of response.headers.entries()) {
      if (!key.toLowerCase().startsWith('x-nextjs-')) {
        headers.set(key, value);
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers,
    });
  } catch (error) {
    return NextResponse.json({
      error: 'Failed to fetch WordPress',
      debug: {
        path,
        wpUrl,
      }
    }, { status: 500 });
  }
}