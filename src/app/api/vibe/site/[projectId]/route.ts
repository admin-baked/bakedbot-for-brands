/**
 * Vibe Published Site Viewer (by Project ID)
 *
 * Serves published websites by project ID.
 * Used by the unified domain routing system when a custom domain
 * points to a Vibe Builder site (targetType: 'vibe_site').
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublishedSiteByProject } from '@/server/actions/vibe-publish';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    // Get published site by project ID
    const siteData = await getPublishedSiteByProject(projectId);

    if (!siteData) {
      return new NextResponse(
        `<!DOCTYPE html>
<html>
<head>
  <title>Site Not Found</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      margin: 0;
      background: #f3f4f6;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 {
      font-size: 4rem;
      margin: 0;
      color: #374151;
    }
    p {
      font-size: 1.25rem;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>404</h1>
    <p>Site Not Found</p>
    <p style="font-size: 1rem; margin-top: 1rem;">
      This site is not published or does not exist.
    </p>
  </div>
</body>
</html>`,
        {
          status: 404,
          headers: {
            'Content-Type': 'text/html',
          },
        }
      );
    }

    const site = siteData as Record<string, unknown>;
    const siteName = (site.name as string) || 'Untitled';
    const siteDescription = (site.description as string) || siteName;
    const siteCSS = (site.css as string) || '';
    const siteHTML = (site.html as string) || '';
    const subdomain = (site.subdomain as string) || projectId;

    // Build complete HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${siteDescription}">
  <title>${siteName}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
  <style>
    ${siteCSS}
  </style>
</head>
<body>
  ${siteHTML}

  <script>
    // Age gate functionality
    document.addEventListener('DOMContentLoaded', function() {
      var ageGate = document.querySelector('[data-gjs-type="age-gate"]');

      if (ageGate) {
        var acceptButton = ageGate.querySelector('button:first-of-type');
        var exitButton = ageGate.querySelector('button:last-of-type');

        if (acceptButton) {
          acceptButton.addEventListener('click', function() {
            ageGate.style.display = 'none';
            localStorage.setItem('ageVerified', 'true');
          });
        }

        if (exitButton) {
          exitButton.addEventListener('click', function() {
            window.location.href = 'https://www.samhsa.gov/marijuana';
          });
        }

        if (localStorage.getItem('ageVerified') === 'true') {
          ageGate.style.display = 'none';
        }
      }

      // Form submission handling
      var forms = document.querySelectorAll('form');
      forms.forEach(function(form) {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          alert('Form submitted! This form is not yet connected to a backend.');
        });
      });
    });
  </script>

  <!-- BakedBot Analytics -->
  <script>
    (function() {
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: '${subdomain}',
          projectId: '${projectId}',
          page: window.location.pathname,
          referrer: document.referrer,
        })
      }).catch(function() {});
    })();
  </script>
</body>
</html>`;

    return new NextResponse(html, {
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=300, s-maxage=600',
      },
    });
  } catch (error) {
    console.error('[VIBE-SITE-VIEWER] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load site' },
      { status: 500 }
    );
  }
}
