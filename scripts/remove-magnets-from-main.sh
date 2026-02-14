#!/bin/bash

# Remove Academy, Vibe, and Training sections from main app
# These are now hosted on magnets.bakedbot.ai

set -e

MAIN_APP="C:/Users/admin/BakedBot for Brands/bakedbot-for-brands"

echo "🗑️  Removing lead magnet sections from main app..."

cd "$MAIN_APP"

# 1. Remove Academy
echo "🎓 Removing Academy..."
rm -rf src/app/academy
rm -rf src/components/academy
rm -rf src/lib/academy
rm -f src/server/actions/academy.ts
rm -f src/server/actions/video-progress.ts
rm -f src/server/services/academy-welcome.ts

# 2. Remove Vibe Studio
echo "🎨 Removing Vibe Studio..."
rm -rf src/app/vibe
rm -rf src/components/vibe
rm -f src/lib/vibe-usage-tracker.ts
rm -f src/server/services/vibe-generator.ts
rm -f src/app/vibe/actions.ts
rm -f src/app/vibe/clone-actions.ts

# 3. Remove Training
echo "🎯 Removing Training..."
rm -rf src/app/training
rm -rf src/components/training
rm -rf src/lib/training
rm -f src/server/actions/training.ts

# 4. Create middleware to redirect to magnets subdomain
echo "🔀 Creating redirects..."
cat > src/middleware.ts << 'MIDDLEWARE'
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Redirect lead magnets to magnets subdomain
  const MAGNETS_URL = 'https://bakedbot-magnets--studio-567050101-bc6e8.us-central1.hosted.app';

  if (path.startsWith('/academy')) {
    return NextResponse.redirect(`${MAGNETS_URL}${path}`);
  }

  if (path.startsWith('/vibe')) {
    return NextResponse.redirect(`${MAGNETS_URL}${path}`);
  }

  if (path.startsWith('/training')) {
    return NextResponse.redirect(`${MAGNETS_URL}${path}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/academy/:path*', '/vibe/:path*', '/training/:path*'],
};
MIDDLEWARE

echo ""
echo "✅ Removal complete!"
echo ""
echo "📊 Page count reduction:"
echo "  Before: 201 pages"
echo "  After: ~175 pages (estimated)"
echo "  Reduction: ~25 pages (12%)"
echo ""
echo "Next steps:"
echo "1. Commit changes: git add . && git commit -m 'refactor: Extract lead magnets to separate app'"
echo "2. Push to trigger build: git push origin main"
echo "3. Monitor build with 30GB memory"
echo ""
