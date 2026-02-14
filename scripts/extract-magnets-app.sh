#!/bin/bash

# Extract Academy, Vibe, and Training to separate bakedbot-magnets app
# This reduces main app from 201 pages to ~175 pages (12% reduction)

set -e

MAIN_APP="C:/Users/admin/BakedBot for Brands/bakedbot-for-brands"
MAGNETS_APP="C:/Users/admin/BakedBot for Brands/bakedbot-magnets"

echo "🚀 Extracting lead magnets to separate app..."

cd "$MAGNETS_APP"

# 1. Initialize Next.js structure
echo "📦 Setting up Next.js structure..."
mkdir -p app/{academy,vibe,training}
mkdir -p components/ui
mkdir -p components/{academy,vibe,training}
mkdir -p lib
mkdir -p types
mkdir -p server/{actions,services}
mkdir -p firebase
mkdir -p public

# 2. Copy package.json with necessary dependencies
echo "📝 Creating package.json..."
cat > package.json << 'EOF'
{
  "name": "bakedbot-magnets",
  "version": "1.0.0",
  "description": "BakedBot Lead Magnets - Academy, Vibe Studio, Training",
  "private": true,
  "engines": {
    "node": ">=20.9.0"
  },
  "scripts": {
    "dev": "next dev --port 3001",
    "build": "next build",
    "start": "next start",
    "lint": "next lint"
  },
  "dependencies": {
    "next": "16.1.2",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "firebase": "12.6.0",
    "firebase-admin": "13.6.1",
    "@google-cloud/firestore": "7.11.6",
    "@radix-ui/react-accordion": "1.2.0",
    "@radix-ui/react-alert-dialog": "1.1.1",
    "@radix-ui/react-avatar": "1.1.0",
    "@radix-ui/react-checkbox": "1.1.1",
    "@radix-ui/react-dialog": "1.1.1",
    "@radix-ui/react-label": "2.1.0",
    "@radix-ui/react-progress": "1.1.0",
    "@radix-ui/react-select": "2.1.1",
    "@radix-ui/react-separator": "1.1.0",
    "@radix-ui/react-slider": "1.2.0",
    "@radix-ui/react-slot": "1.1.0",
    "@radix-ui/react-tabs": "1.1.0",
    "@radix-ui/react-toast": "1.2.1",
    "@monaco-editor/react": "4.7.0",
    "class-variance-authority": "0.7.1",
    "clsx": "2.1.1",
    "date-fns": "4.1.0",
    "framer-motion": "12.23.26",
    "lucide-react": "0.555.0",
    "monaco-editor": "0.52.2",
    "react-markdown": "10.1.0",
    "sonner": "2.0.7",
    "tailwind-merge": "2.4.0",
    "zod": "3.25.76",
    "zustand": "4.5.7"
  },
  "devDependencies": {
    "@tailwindcss/typography": "0.5.19",
    "@types/node": "20",
    "@types/react": "18",
    "@types/react-dom": "18",
    "autoprefixer": "10.4.24",
    "postcss": "8",
    "tailwindcss": "3.4.1",
    "tailwindcss-animate": "1.0.7",
    "typescript": "5.9.3"
  }
}
EOF

# 3. Copy TypeScript config
echo "📝 Creating tsconfig.json..."
cat > tsconfig.json << 'EOF'
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
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
EOF

# 4. Copy Next.js config
echo "📝 Creating next.config.js..."
cat > next.config.js << 'EOF'
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
};

module.exports = nextConfig;
EOF

# 5. Copy Tailwind config from main app
echo "📝 Copying Tailwind configuration..."
cp "$MAIN_APP/tailwind.config.ts" ./
cp "$MAIN_APP/postcss.config.mjs" ./

# 6. Copy .gitignore
echo "📝 Creating .gitignore..."
cp "$MAIN_APP/.gitignore" ./

# 7. Copy .npmrc for React 19 compatibility
echo "📝 Creating .npmrc..."
echo "legacy-peer-deps=true" > .npmrc

# 8. Copy shared utilities and components
echo "📦 Copying shared utilities..."
cp -r "$MAIN_APP/lib/"* lib/ 2>/dev/null || true
cp -r "$MAIN_APP/types/"* types/ 2>/dev/null || true
cp -r "$MAIN_APP/components/ui/"* components/ui/ 2>/dev/null || true
cp -r "$MAIN_APP/firebase/"* firebase/ 2>/dev/null || true

# 9. Copy Academy section
echo "🎓 Copying Academy..."
cp -r "$MAIN_APP/src/app/academy"/* app/academy/ 2>/dev/null || true
cp -r "$MAIN_APP/src/components/academy" components/ 2>/dev/null || true
cp -r "$MAIN_APP/src/lib/academy" lib/ 2>/dev/null || true
cp -r "$MAIN_APP/src/server/actions/academy.ts" server/actions/ 2>/dev/null || true
cp -r "$MAIN_APP/src/server/actions/video-progress.ts" server/actions/ 2>/dev/null || true
cp -r "$MAIN_APP/src/server/services/academy-welcome.ts" server/services/ 2>/dev/null || true

# 10. Copy Vibe Studio section
echo "🎨 Copying Vibe Studio..."
cp -r "$MAIN_APP/src/app/vibe"/* app/vibe/ 2>/dev/null || true
cp -r "$MAIN_APP/src/components/vibe" components/ 2>/dev/null || true
cp -r "$MAIN_APP/src/lib/vibe-usage-tracker.ts" lib/ 2>/dev/null || true
cp -r "$MAIN_APP/src/server/services/vibe-generator.ts" server/services/ 2>/dev/null || true
cp -r "$MAIN_APP/src/server/actions/leads.ts" server/actions/ 2>/dev/null || true

# 11. Copy Training section
echo "🎯 Copying Training..."
cp -r "$MAIN_APP/src/app/training"/* app/training/ 2>/dev/null || true
cp -r "$MAIN_APP/src/components/training" components/ 2>/dev/null || true
cp -r "$MAIN_APP/src/server/actions/training.ts" server/actions/ 2>/dev/null || true
cp -r "$MAIN_APP/src/lib/training" lib/ 2>/dev/null || true

# 12. Copy globals.css
echo "🎨 Copying styles..."
mkdir -p app
cp "$MAIN_APP/src/app/globals.css" app/

# 13. Create root layout
echo "📝 Creating root layout..."
cat > app/layout.tsx << 'EOF'
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BakedBot - Cannabis Marketing Tools",
  description: "AI-powered marketing tools for the cannabis industry",
};

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

# 14. Create root page that lists all magnets
echo "📝 Creating root page..."
cat > app/page.tsx << 'EOF'
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 p-8">
      <div className="mx-auto max-w-4xl">
        <h1 className="text-4xl font-bold text-green-900 mb-8">
          BakedBot Marketing Tools
        </h1>

        <div className="grid gap-6 md:grid-cols-3">
          <Link
            href="/academy"
            className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">🎓 Academy</h2>
            <p className="text-gray-600">
              Cannabis Marketing AI Academy - 12 episodes across 7 agent tracks
            </p>
          </Link>

          <Link
            href="/vibe"
            className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">🎨 Vibe Studio</h2>
            <p className="text-gray-600">
              AI-powered menu theme generator for dispensaries
            </p>
          </Link>

          <Link
            href="/training"
            className="block p-6 bg-white rounded-lg shadow-lg hover:shadow-xl transition-shadow"
          >
            <h2 className="text-2xl font-semibold mb-2">🎯 Training</h2>
            <p className="text-gray-600">
              BakedBot Builder Bootcamp - 8-week curriculum
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
EOF

# 15. Create Firebase App Hosting config
echo "📝 Creating apphosting.yaml..."
cat > apphosting.yaml << 'EOF'
runConfig:
  cpu: 1
  memoryMiB: 2048
  concurrency: 80
  maxInstances: 10
  minInstances: 0

env:
  # Build memory allocation - using 16GB for lead magnets app
  - variable: NODE_OPTIONS
    value: "--max-old-space-size=16384"
    availability: [ BUILD ]

  # Runtime memory allocation
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

# 16. Create README
echo "📝 Creating README..."
cat > README.md << 'EOF'
# BakedBot Lead Magnets

Standalone app for BakedBot's lead generation tools:

## Sections

- **Academy** (`/academy`) - Cannabis Marketing AI Academy
- **Vibe Studio** (`/vibe`) - AI menu theme generator
- **Training** (`/training`) - BakedBot Builder Bootcamp

## Deployment

This app is hosted on Firebase App Hosting at `magnets.bakedbot.ai`

Extracted from main app to reduce build memory requirements.
EOF

# 17. Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

echo ""
echo "✅ Lead magnets app created successfully!"
echo ""
echo "📁 Location: $MAGNETS_APP"
echo ""
echo "Next steps:"
echo "1. cd \"$MAGNETS_APP\""
echo "2. Create GitHub repo: gh repo create admin-baked/bakedbot-magnets --private --source=. --push"
echo "3. Connect to Firebase App Hosting"
echo "4. Test build locally: npm run build"
echo ""
