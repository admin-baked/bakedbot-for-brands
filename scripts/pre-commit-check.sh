#!/bin/bash
# Pre-commit check to prevent TypeScript errors from being committed
# This ensures deployment won't fail due to type errors

set -e

echo "🔍 Running pre-commit checks..."
echo ""

# 1. TypeScript type checking
echo "📝 Checking TypeScript..."
if ! npm run check:types; then
    echo ""
    echo "❌ TypeScript errors found!"
    echo "Please fix the errors above before committing."
    echo ""
    exit 1
fi

echo "✅ TypeScript checks passed"
echo ""

# 2. Linting
echo "🔧 Running linter..."
if ! npm run lint; then
    echo ""
    echo "⚠️  Linting issues found!"
    echo "Please fix linting errors or run 'npm run lint -- --fix'"
    echo ""
    exit 1
fi

echo "✅ Lint checks passed"
echo ""

# 3. Build test (optional - commented out as it's slow)
# echo "🏗️  Testing build..."
# if ! npm run build; then
#     echo ""
#     echo "❌ Build failed!"
#     echo "Please fix build errors before committing."
#     echo ""
#     exit 1
# fi
# echo "✅ Build test passed"
# echo ""

echo "✅ All pre-commit checks passed!"
echo "🚀 Safe to commit and deploy"
echo ""
