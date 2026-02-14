#!/bin/bash

# Migrate BakedBot to monorepo with 3 Firebase apps
# - bakedbot-core: Main dashboards (Firebase App Hosting)
# - bakedbot-magnets: Lead gen tools (Firebase App Hosting)
# - bakedbot-marketing: Static site (Firebase Hosting)

set -e

REPO_ROOT="C:/Users/admin/BakedBot for Brands/bakedbot-for-brands"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

echo "🚀 Starting monorepo migration..."
echo "📁 Root: $REPO_ROOT"
echo ""

cd "$REPO_ROOT"

# SAFETY: Create backup branch
echo "🔒 Creating backup branch..."
git checkout -b backup-before-monorepo-$TIMESTAMP
git add .
git commit -m "backup: Before monorepo migration" || true
git checkout main

echo ""
echo "📦 Step 1: Create monorepo structure..."

# Create directory structure
mkdir -p apps/core
mkdir -p apps/magnets
mkdir -p apps/marketing
mkdir -p packages/shared-ui
mkdir -p packages/shared-types
mkdir -p packages/shared-lib
mkdir -p packages/firebase-config

echo ""
echo "📝 Step 2: Set up root package.json with workspaces..."

cat > package.json << 'EOF'
{
  "name": "bakedbot-monorepo",
  "version": "1.0.0",
  "private": true,
  "description": "BakedBot Agentic Commerce OS - Monorepo",
  "workspaces": [
    "apps/*",
    "packages/*"
  ],
  "scripts": {
    "dev:core": "npm run dev --workspace=apps/core",
    "dev:magnets": "npm run dev --workspace=apps/magnets",
    "dev:marketing": "npm run dev --workspace=apps/marketing",
    "build:core": "npm run build --workspace=apps/core",
    "build:magnets": "npm run build --workspace=apps/magnets",
    "build:marketing": "npm run build --workspace=apps/marketing",
    "build:all": "npm run build --workspaces",
    "test": "npm test --workspaces --if-present",
    "lint": "npm run lint --workspaces --if-present",
    "clean": "rm -rf apps/*/node_modules apps/*/.next packages/*/node_modules"
  },
  "engines": {
    "node": ">=20.9.0"
  }
}
EOF

echo ""
echo "📦 Step 3: Extract shared UI components..."

# Copy UI components to shared package
cp -r src/components/ui packages/shared-ui/components
cp -r src/components/common packages/shared-ui/components/ 2>/dev/null || true

cat > packages/shared-ui/package.json << 'EOF'
{
  "name": "@bakedbot/shared-ui",
  "version": "1.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./components/*": "./components/*"
  },
  "dependencies": {
    "@radix-ui/react-accordion": "^1.2.0",
    "@radix-ui/react-alert-dialog": "^1.1.1",
    "@radix-ui/react-avatar": "^1.1.0",
    "@radix-ui/react-checkbox": "^1.1.1",
    "@radix-ui/react-dialog": "^1.1.1",
    "@radix-ui/react-dropdown-menu": "^2.1.1",
    "@radix-ui/react-label": "^2.1.0",
    "@radix-ui/react-popover": "^1.1.1",
    "@radix-ui/react-progress": "^1.1.0",
    "@radix-ui/react-select": "^2.1.1",
    "@radix-ui/react-separator": "^1.1.0",
    "@radix-ui/react-slider": "^1.2.0",
    "@radix-ui/react-slot": "^1.1.0",
    "@radix-ui/react-switch": "^1.1.0",
    "@radix-ui/react-tabs": "^1.1.0",
    "@radix-ui/react-toast": "^1.2.1",
    "@radix-ui/react-tooltip": "^1.1.2",
    "class-variance-authority": "^0.7.1",
    "clsx": "^2.1.1",
    "lucide-react": "^0.555.0",
    "tailwind-merge": "^2.4.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
EOF

# Create index file for shared-ui
cat > packages/shared-ui/index.ts << 'EOF'
// Re-export all UI components
export * from './components/ui/button';
export * from './components/ui/card';
export * from './components/ui/input';
export * from './components/ui/label';
export * from './components/ui/select';
export * from './components/ui/dialog';
export * from './components/ui/tabs';
export * from './components/ui/toast';
// Add more exports as needed
EOF

echo ""
echo "📦 Step 4: Extract shared types..."

# Copy types to shared package
cp -r src/types packages/shared-types/

cat > packages/shared-types/package.json << 'EOF'
{
  "name": "@bakedbot/shared-types",
  "version": "1.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./*": "./*"
  }
}
EOF

cat > packages/shared-types/index.ts << 'EOF'
// Re-export all types
export * from './roles';
export * from './agents';
export * from './inbox';
export * from './vibe';
export * from './academy';
// Add more exports as needed
EOF

echo ""
echo "📦 Step 5: Extract shared lib..."

# Copy lib utilities to shared package
cp -r src/lib packages/shared-lib/

cat > packages/shared-lib/package.json << 'EOF'
{
  "name": "@bakedbot/shared-lib",
  "version": "1.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "exports": {
    ".": "./index.ts",
    "./*": "./*"
  },
  "dependencies": {
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.4.0",
    "date-fns": "^4.1.0",
    "zod": "^3.25.76"
  }
}
EOF

cat > packages/shared-lib/index.ts << 'EOF'
// Re-export common utilities
export * from './utils';
export * from './logger';
// Add more exports as needed
EOF

echo ""
echo "📦 Step 6: Extract Firebase config..."

mkdir -p packages/firebase-config
cp -r src/firebase packages/firebase-config/
cp -r src/ai packages/firebase-config/ 2>/dev/null || true

cat > packages/firebase-config/package.json << 'EOF'
{
  "name": "@bakedbot/firebase-config",
  "version": "1.0.0",
  "private": true,
  "main": "./index.ts",
  "types": "./index.ts",
  "dependencies": {
    "firebase": "^12.6.0",
    "firebase-admin": "^13.6.1",
    "@google-cloud/firestore": "^7.11.6",
    "@anthropic-ai/sdk": "^0.71.0"
  }
}
EOF

echo ""
echo "🎯 Step 7: Create CORE app (main dashboards)..."

# Copy core dashboard files to apps/core
rsync -av --exclude='node_modules' --exclude='.next' \
  --exclude='academy' --exclude='vibe' --exclude='training' \
  src/ apps/core/src/

# Copy root config files
cp next.config.js apps/core/
cp tsconfig.json apps/core/
cp tailwind.config.ts apps/core/
cp postcss.config.mjs apps/core/
cp .gitignore apps/core/

# Create core package.json (smaller subset of dependencies)
cat > apps/core/package.json << 'EOF'
{
  "name": "@bakedbot/core",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "check:types": "tsc --noEmit"
  },
  "dependencies": {
    "@bakedbot/shared-ui": "workspace:*",
    "@bakedbot/shared-types": "workspace:*",
    "@bakedbot/shared-lib": "workspace:*",
    "@bakedbot/firebase-config": "workspace:*",
    "next": "^16.0.7",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "firebase": "^12.6.0",
    "firebase-admin": "^13.6.1",
    "@google-cloud/firestore": "^7.11.6",
    "framer-motion": "^12.23.26",
    "zustand": "^4.5.7"
  },
  "devDependencies": {
    "@types/node": "^20",
    "@types/react": "^18",
    "@types/react-dom": "^18",
    "typescript": "^5.9.3",
    "tailwindcss": "^3.4.1",
    "postcss": "^8",
    "autoprefixer": "^10.4.24"
  }
}
EOF

# Create core apphosting.yaml
cat > apps/core/apphosting.yaml << 'EOF'
runConfig:
  cpu: 1
  memoryMiB: 2048
  concurrency: 80
  maxInstances: 10
  minInstances: 0

env:
  - variable: NODE_OPTIONS
    value: "--max-old-space-size=20480"
    availability: [ BUILD ]

  - variable: NODE_OPTIONS
    value: "--max-old-space-size=2048"
    availability: [ RUNTIME ]

  - variable: NEXT_TELEMETRY_DISABLED
    value: "1"
    availability: [ BUILD ]

  - variable: FIREBASE_SERVICE_ACCOUNT_KEY
    secret: projects/studio-567050101-bc6e8/secrets/FIREBASE_SERVICE_ACCOUNT_KEY/versions/latest
    availability: [ BUILD, RUNTIME ]

  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: projects/studio-567050101-bc6e8/secrets/NEXT_PUBLIC_FIREBASE_API_KEY/versions/latest
    availability: [ BUILD, RUNTIME ]

  - variable: CLAUDE_API_KEY
    secret: projects/studio-567050101-bc6e8/secrets/CLAUDE_API_KEY/versions/latest
    availability: [ RUNTIME ]

  - variable: GEMINI_API_KEY
    secret: projects/studio-567050101-bc6e8/secrets/GEMINI_API_KEY/versions/latest
    availability: [ RUNTIME ]
EOF

echo ""
echo "🎨 Step 8: Create MAGNETS app (Academy/Vibe/Training)..."

# Copy magnets files
rsync -av --exclude='node_modules' --exclude='.next' \
  "../bakedbot-magnets/" apps/magnets/

# Update magnets package.json to use workspace dependencies
cat > apps/magnets/package.json << 'EOF'
{
  "name": "@bakedbot/magnets",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "@bakedbot/shared-ui": "workspace:*",
    "@bakedbot/shared-types": "workspace:*",
    "@bakedbot/shared-lib": "workspace:*",
    "@bakedbot/firebase-config": "workspace:*",
    "next": "16.1.2",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "firebase": "12.6.0",
    "firebase-admin": "13.6.1",
    "@monaco-editor/react": "4.7.0",
    "monaco-editor": "0.52.2",
    "react-markdown": "10.1.0",
    "framer-motion": "12.23.26"
  },
  "devDependencies": {
    "@types/node": "20",
    "@types/react": "18",
    "@types/react-dom": "18",
    "typescript": "5.9.3",
    "tailwindcss": "3.4.1",
    "tailwindcss-animate": "1.0.7",
    "postcss": "8",
    "autoprefixer": "10.4.24"
  }
}
EOF

# Update magnets apphosting.yaml
cat > apps/magnets/apphosting.yaml << 'EOF'
runConfig:
  cpu: 1
  memoryMiB: 2048
  concurrency: 80
  maxInstances: 10
  minInstances: 0

env:
  - variable: NODE_OPTIONS
    value: "--max-old-space-size=12288"
    availability: [ BUILD ]

  - variable: NODE_OPTIONS
    value: "--max-old-space-size=2048"
    availability: [ RUNTIME ]

  - variable: NEXT_TELEMETRY_DISABLED
    value: "1"
    availability: [ BUILD ]

  - variable: FIREBASE_SERVICE_ACCOUNT_KEY
    secret: projects/studio-567050101-bc6e8/secrets/FIREBASE_SERVICE_ACCOUNT_KEY/versions/latest
    availability: [ BUILD, RUNTIME ]

  - variable: NEXT_PUBLIC_FIREBASE_API_KEY
    secret: projects/studio-567050101-bc6e8/secrets/NEXT_PUBLIC_FIREBASE_API_KEY/versions/latest
    availability: [ BUILD, RUNTIME ]

  - variable: CLAUDE_API_KEY
    secret: projects/studio-567050101-bc6e8/secrets/CLAUDE_API_KEY/versions/latest
    availability: [ RUNTIME ]
EOF

echo ""
echo "📄 Step 9: Create MARKETING app (static landing pages)..."

mkdir -p apps/marketing/public
mkdir -p apps/marketing/app

# Create simple Next.js marketing site
cat > apps/marketing/package.json << 'EOF'
{
  "name": "@bakedbot/marketing",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3002",
    "build": "next build",
    "export": "next build && next export",
    "start": "next start"
  },
  "dependencies": {
    "@bakedbot/shared-ui": "workspace:*",
    "next": "16.1.2",
    "react": "19.0.0",
    "react-dom": "19.0.0"
  },
  "devDependencies": {
    "@types/node": "20",
    "@types/react": "18",
    "@types/react-dom": "18",
    "typescript": "5.9.3",
    "tailwindcss": "3.4.1",
    "postcss": "8",
    "autoprefixer": "10.4.24"
  }
}
EOF

# Copy Next.js config for static export
cat > apps/marketing/next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
};

module.exports = nextConfig;
EOF

cat > apps/marketing/tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

cat > apps/marketing/app/page.tsx << 'EOF'
export default function MarketingHome() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white p-8">
      <div className="mx-auto max-w-6xl">
        <h1 className="text-5xl font-bold text-green-900 mb-4">
          BakedBot AI
        </h1>
        <p className="text-xl text-gray-600 mb-8">
          Agentic Commerce OS for the Cannabis Industry
        </p>
        <a
          href="https://bakedbot-core--studio-567050101-bc6e8.us-central1.hosted.app"
          className="inline-block px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          Get Started →
        </a>
      </div>
    </main>
  );
}
EOF

cat > apps/marketing/app/layout.tsx << 'EOF'
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
EOF

echo ""
echo "📝 Step 10: Create root .gitignore..."

cat > .gitignore << 'EOF'
# dependencies
node_modules/
apps/*/node_modules/
packages/*/node_modules/
.pnp
.pnp.js

# testing
coverage/

# next.js
.next/
apps/*/.next/
out/
build

# production
dist/

# misc
.DS_Store
*.pem
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# debug
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# local env files
.env*.local

# vercel
.vercel

# typescript
*.tsbuildinfo
next-env.d.ts

# firebase
.firebase/
firebase-debug.log
EOF

echo ""
echo "📝 Step 11: Create README..."

cat > README.md << 'EOF'
# BakedBot Monorepo

Agentic Commerce OS for the Cannabis Industry

## Structure

```
bakedbot/
├── apps/
│   ├── core/        # Main dashboards → Firebase App Hosting
│   ├── magnets/     # Lead gen tools → Firebase App Hosting
│   └── marketing/   # Static site → Firebase Hosting
├── packages/
│   ├── shared-ui/           # Shared UI components
│   ├── shared-types/        # TypeScript types
│   ├── shared-lib/          # Utilities
│   └── firebase-config/     # Firebase/AI config
```

## Development

```bash
# Install all dependencies
npm install

# Run apps
npm run dev:core       # http://localhost:3000
npm run dev:magnets    # http://localhost:3001
npm run dev:marketing  # http://localhost:3002

# Build apps
npm run build:core
npm run build:magnets
npm run build:marketing
npm run build:all      # Build all
```

## Deployment

Each app deploys independently to Firebase:

- **Core**: `firebase apphosting:backends:get bakedbot-core`
- **Magnets**: `firebase apphosting:backends:get bakedbot-magnets`
- **Marketing**: `firebase hosting:channel:deploy marketing`

## Memory Allocation

- Core: 20GB build memory (~120 pages)
- Magnets: 12GB build memory (~25 pages)
- Marketing: Static export (no memory limit)

**Total: 32GB** vs 30GB+ single app (which was failing)
EOF

echo ""
echo "✅ Monorepo structure created!"
echo ""
echo "Next steps:"
echo "1. Install dependencies: npm install"
echo "2. Test core app: cd apps/core && npm run dev"
echo "3. Test magnets app: cd apps/magnets && npm run dev"
echo "4. Commit changes: git add . && git commit -m 'refactor: Migrate to monorepo'"
echo ""
echo "Backup branch created: backup-before-monorepo-$TIMESTAMP"
echo ""
