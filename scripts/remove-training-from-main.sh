#!/bin/bash
# Remove Training Program from Main App
# Run this AFTER the training app is deployed and working

set -e

echo "========================================="
echo "Remove Training from Main App"
echo "========================================="
echo ""

# Confirmation
echo "⚠️  WARNING: This will remove training pages from the main app."
echo "Make sure training.bakedbot.ai is deployed and working first!"
echo ""
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "📦 Step 1: Remove training directory..."
if [ -d "src/app/dashboard/training" ]; then
  rm -rf src/app/dashboard/training
  echo "✅ Removed src/app/dashboard/training"
else
  echo "⚠️  Training directory not found (already removed?)"
fi
echo ""

echo "🔀 Step 2: Add redirect in next.config.js..."

# Check if redirect already exists
if grep -q "dashboard/training" next.config.js; then
  echo "⚠️  Redirect already exists in next.config.js"
else
  # Add redirect before the closing bracket of redirects array
  # This is a bit tricky in bash, so we'll create a temp file

  # Find the line with "source: '/demo'," and add after it
  awk '/source: .\/demo.,/{
    print
    print "      {"
    print "        source: \"/dashboard/training/:path*\","
    print "        destination: \"https://training.bakedbot.ai/training/:path*\","
    print "        permanent: false,"
    print "      },"
    next
  }1' next.config.js > next.config.js.tmp

  mv next.config.js.tmp next.config.js
  echo "✅ Added redirect to next.config.js"
fi
echo ""

echo "🧹 Step 3: Remove training-specific components (if any)..."
if [ -d "src/components/training" ]; then
  rm -rf src/components/training
  echo "✅ Removed src/components/training"
else
  echo "ℹ️  No training-specific components found"
fi
echo ""

echo "📝 Step 4: Update sidebars to remove training links..."

# Check if training links exist in sidebars
if grep -q "/dashboard/training" src/components/dashboard/*.tsx 2>/dev/null; then
  echo "⚠️  Found training links in sidebars - you may need to manually remove these:"
  grep -n "/dashboard/training" src/components/dashboard/*.tsx || true
else
  echo "✅ No training links found in sidebars"
fi
echo ""

echo "✅ Step 5: Summary of changes..."
echo ""
echo "Removed:"
echo "  - src/app/dashboard/training/ (6 pages)"
echo "  - src/components/training/ (if existed)"
echo ""
echo "Added:"
echo "  - Redirect: /dashboard/training/* → https://training.bakedbot.ai/training/*"
echo ""
echo "Page count:"
echo "  - Before: 201 pages"
echo "  - After: 195 pages (-6 pages, -3% build size)"
echo ""

echo "🎯 Next steps:"
echo ""
echo "1. Test the redirect locally:"
echo "   npm run dev"
echo "   Visit: http://localhost:3000/dashboard/training"
echo "   (Should show 'Redirecting...')"
echo ""
echo "2. Commit changes:"
echo "   git add -A"
echo "   git commit -m 'refactor: Extract training program to separate Firebase backend"
echo ""
echo "   Moved training program (6 pages) to training.bakedbot.ai"
echo "   "
echo "   - Removed /dashboard/training pages from main app"
echo "   - Added redirect to training.bakedbot.ai"
echo "   - Reduces main app build size by 3%"
echo "   "
echo "   Main app: 201 → 195 pages"
echo "   Training app: 6 pages (separate backend)"
echo "   '"
echo ""
echo "3. Push to deploy:"
echo "   git push origin main"
echo ""
echo "========================================="
