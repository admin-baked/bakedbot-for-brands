#!/bin/bash
# Extract Training Program to Separate Firebase App Hosting Backend
# This script creates a new Next.js app with all training-related code

set -e  # Exit on error

echo "========================================="
echo "BakedBot Training Program Extraction"
echo "========================================="
echo ""

# Configuration
MAIN_REPO=$(pwd)
TRAINING_REPO="../bakedbot-training"
GITHUB_ORG="admin-baked"

echo "📦 Step 1: Create new Next.js app..."
cd ..
npx create-next-app@latest bakedbot-training \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --use-npm

cd bakedbot-training
echo "✅ Next.js app created"
echo ""

echo "📋 Step 2: Copy training pages..."
# Create app directory structure
mkdir -p app/training/{admin,challenge,submissions,components}

# Copy training pages
cp -r "$MAIN_REPO/src/app/dashboard/training"/* app/training/
echo "✅ Training pages copied"
echo ""

echo "🎨 Step 3: Copy shared UI components..."
# Copy ShadCN UI components
mkdir -p components/ui
cp -r "$MAIN_REPO/src/components/ui"/* components/ui/

# Copy training-specific components
if [ -d "$MAIN_REPO/src/components/training" ]; then
  cp -r "$MAIN_REPO/src/components/training" components/
fi
echo "✅ UI components copied"
echo ""

echo "🔧 Step 4: Copy shared utilities..."
# Create lib directory
mkdir -p lib

# Copy essential utilities
cp "$MAIN_REPO/src/lib/utils.ts" lib/ 2>/dev/null || echo "Note: utils.ts not found, will create minimal version"
cp "$MAIN_REPO/src/lib/cn.ts" lib/ 2>/dev/null || true

# Create minimal utils if not exists
if [ ! -f lib/utils.ts ]; then
  cat > lib/utils.ts << 'EOF'
import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
EOF
fi
echo "✅ Utilities copied"
echo ""

echo "🔥 Step 5: Setup Firebase..."
# Copy Firebase configuration files
mkdir -p firebase
cp "$MAIN_REPO/src/firebase/admin.ts" firebase/ 2>/dev/null || true
cp "$MAIN_REPO/src/firebase/server-client.ts" firebase/ 2>/dev/null || true
cp "$MAIN_REPO/src/firebase/config.ts" firebase/ 2>/dev/null || true

# Copy .env.example
if [ -f "$MAIN_REPO/.env.example" ]; then
  cp "$MAIN_REPO/.env.example" .env.local
fi
echo "✅ Firebase files copied"
echo ""

echo "📝 Step 6: Copy TypeScript types..."
mkdir -p types
cp "$MAIN_REPO/src/types/training.ts" types/ 2>/dev/null || true
cp "$MAIN_REPO/src/types/user.ts" types/ 2>/dev/null || true
echo "✅ Types copied"
echo ""

echo "🔐 Step 7: Copy auth helpers..."
mkdir -p server/auth
cp "$MAIN_REPO/src/server/auth/auth.ts" server/auth/ 2>/dev/null || true
echo "✅ Auth helpers copied"
echo ""

echo "📦 Step 8: Install dependencies..."
npm install firebase firebase-admin @google-cloud/firestore
npm install clsx tailwind-merge class-variance-authority
npm install lucide-react @radix-ui/react-slot
npm install date-fns zod
npm install @monaco-editor/react monaco-editor
echo "✅ Dependencies installed"
echo ""

echo "⚙️  Step 9: Create Firebase configuration..."
cat > apphosting.yaml << 'EOF'
# Firebase App Hosting configuration for BakedBot Training
runConfig:
  cpu: 1
  memoryMiB: 2048
  concurrency: 80
  maxInstances: 10
  minInstances: 0

env:
  # Build-time memory allocation (training app is small, 8GB is plenty)
  - variable: NODE_OPTIONS
    value: --max-old-space-size=8192
    availability:
      - BUILD

  # Runtime memory
  - variable: NODE_OPTIONS
    value: --max-old-space-size=2048
    availability:
      - RUNTIME

  # Disable telemetry
  - variable: NEXT_TELEMETRY_DISABLED
    value: "1"
    availability:
      - BUILD

  # Firebase Service Account (shared with main app)
  - variable: FIREBASE_SERVICE_ACCOUNT_KEY
    secret: projects/studio-567050101-bc6e8/secrets/FIREBASE_SERVICE_ACCOUNT_KEY/versions/latest
    availability:
      - BUILD
      - RUNTIME

  # Firebase API Key (shared with main app)
  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: projects/studio-567050101-bc6e8/secrets/NEXT_PUBLIC_FIREBASE_API_KEY/versions/latest
    availability:
      - BUILD
      - RUNTIME

  # Firebase config
  - variable: FIREBASE_CONFIG
    availability:
      - BUILD
      - RUNTIME

  - variable: FIREBASE_WEBAPP_CONFIG
    availability:
      - BUILD
EOF
echo "✅ apphosting.yaml created"
echo ""

echo "📄 Step 10: Create README..."
cat > README.md << 'EOF'
# BakedBot Training Program

Standalone training platform for BakedBot Builder Bootcamp.

## Architecture

- **Main App**: https://bakedbot.ai (Firebase App Hosting)
- **Training App**: https://training.bakedbot.ai (This app - Firebase App Hosting)

## Shared Resources

Both apps use the same Firebase project:
- Project: `studio-567050101-bc6e8`
- Firestore: Shared database
- Auth: Shared authentication
- Storage: Shared file storage

## Development

```bash
npm install
npm run dev
```

Visit: http://localhost:3000/training

## Deployment

Deployed automatically via Firebase App Hosting when pushed to `main`:

```bash
git push origin main
```

## Custom Domain Setup

1. Firebase Console → App Hosting → Settings → Custom Domain
2. Add domain: `training.bakedbot.ai`
3. Update DNS:
   - Type: A
   - Name: training
   - Value: [Firebase IP]

## Authentication

Uses Firebase Auth from main project. Requires `intern` or `super_user` role.

Authorized domains (add in Firebase Console):
- training.bakedbot.ai
- localhost (for development)
EOF
echo "✅ README created"
echo ""

echo "🎯 Step 11: Update package.json..."
# Update package.json name
npm pkg set name="bakedbot-training"
npm pkg set description="BakedBot Builder Bootcamp - Training Platform"
echo "✅ package.json updated"
echo ""

echo "📝 Step 12: Create .gitignore..."
cat > .gitignore << 'EOF'
# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Next.js
.next/
out/
build/

# Production
dist/

# Environment
.env
.env.local
.env.*.local

# Debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Firebase
.firebase/
firebase-debug.log
EOF
echo "✅ .gitignore created"
echo ""

echo "🚀 Step 13: Initialize git repository..."
git init
git add .
git commit -m "Initial commit: BakedBot Training Program extraction

Extracted from main BakedBot repo to separate Firebase App Hosting backend.

Features:
- Training dashboard (6 pages)
- Challenge system with Monaco editor
- Code submission and review
- Admin dashboard
- Peer review system

Architecture:
- Separate Firebase backend (training.bakedbot.ai)
- Shared Firebase project (Firestore, Auth, Storage)
- Minimal dependencies for fast builds
- No OOM issues (6 pages vs 201 in main app)
"
echo "✅ Git repository initialized"
echo ""

echo "========================================="
echo "✅ Extraction Complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. Create GitHub repository:"
echo "   gh repo create $GITHUB_ORG/bakedbot-training --private --source=. --remote=origin"
echo ""
echo "2. Push to GitHub:"
echo "   git push -u origin main"
echo ""
echo "3. Connect to Firebase App Hosting:"
echo "   - Go to: https://console.firebase.google.com/project/studio-567050101-bc6e8/apphosting"
echo "   - Click 'Add backend'"
echo "   - Connect GitHub repo: $GITHUB_ORG/bakedbot-training"
echo "   - Branch: main"
echo "   - Deploy!"
echo ""
echo "4. Setup custom domain:"
echo "   - Firebase Console → App Hosting → Settings → Custom Domain"
echo "   - Add: training.bakedbot.ai"
echo ""
echo "Training app location: $TRAINING_REPO"
echo "========================================="
