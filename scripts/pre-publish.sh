#!/bin/bash

echo "🔍 Running pre-publish checks..."
echo ""

echo "1️⃣ Checking TypeScript types..."
npm run type-check
if [ $? -ne 0 ]; then
    echo "❌ TypeScript errors found!"
    exit 1
fi
echo "✅ TypeScript OK"
echo ""

echo "2️⃣ Running linter..."
npm run lint
if [ $? -ne 0 ]; then
    echo "❌ Linting errors found!"
    exit 1
fi
echo "✅ Linting OK"
echo ""

echo "3️⃣ Attempting build..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed!"
    exit 1
fi
echo "✅ Build successful"
echo ""

echo "🎉 All checks passed! Safe to publish."
