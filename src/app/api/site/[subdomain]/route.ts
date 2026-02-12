/**
 * Vibe Published Site Viewer
 *
 * Serves published websites by subdomain
 */

import { NextRequest, NextResponse } from 'next/server';
import { getPublishedSite } from '@/server/actions/vibe-publish';

export async function GET(
  request: NextRequest,
  { params }: { params: { subdomain: string } }
) {
  try {
    const { subdomain } = params;

    // Get published site
    const siteData = await getPublishedSite(subdomain);

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
      The site <strong>${subdomain}.bakedbot.site</strong> does not exist.
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

    // Cast site data
    const site = siteData as Record<string, unknown>;

    // Build complete HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="description" content="${site.description as string || site.name as string}">
  <title>${site.name as string}</title>
  <link href="https://cdn.jsdelivr.net/npm/tailwindcss@3/dist/tailwind.min.css" rel="stylesheet">
  <style>
    ${site.css as string}
  </style>
</head>
<body>
  ${site.html as string}

  <script>
    // Age gate functionality
    document.addEventListener('DOMContentLoaded', function() {
      const ageGate = document.querySelector('[data-gjs-type="age-gate"]');

      if (ageGate) {
        const acceptButton = ageGate.querySelector('button:first-of-type');
        const exitButton = ageGate.querySelector('button:last-of-type');

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

        // Check if already verified
        if (localStorage.getItem('ageVerified') === 'true') {
          ageGate.style.display = 'none';
        }
      }

      // Form submission handling
      const forms = document.querySelectorAll('form');
      forms.forEach(form => {
        form.addEventListener('submit', function(e) {
          e.preventDefault();
          alert('Form submitted! This form is not yet connected to a backend.');
        });
      });

      // Add to cart buttons
      const addToCartButtons = document.querySelectorAll('button');
      addToCartButtons.forEach(button => {
        if (button.textContent.includes('Add to Cart')) {
          button.addEventListener('click', function() {
            alert('Product added! E-commerce integration coming soon.');
          });
        }
      });
    });
  </script>

  <!-- BakedBot Analytics -->
  <script>
    (function() {
      // Simple analytics beacon
      fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          site: '${subdomain}',
          page: window.location.pathname,
          referrer: document.referrer,
        })
      }).catch(() => {});
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
    console.error('[SITE-VIEWER] Error:', error);
    return NextResponse.json(
      { error: 'Failed to load site' },
      { status: 500 }
    );
  }
}
