#!/usr/bin/env node
/**
 * SP5: Component/API Route Scaffolding
 *
 * Generates boilerplate files matching existing codebase patterns
 * Supports: component, action, route, cron scaffolding
 *
 * Usage:
 *   node scripts/generate.mjs component MyComponent
 *   node scripts/generate.mjs action myFeature
 *   node scripts/generate.mjs route myEndpoint
 *   node scripts/generate.mjs cron my-job
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// ============================================================================
// UTILITIES
// ============================================================================

function toPascalCase(str) {
  return str.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
}

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content);
  console.log(`✅ Created: ${filePath}`);
}

// ============================================================================
// TEMPLATES
// ============================================================================

function generateComponent(name) {
  const pascalName = toPascalCase(name);
  const kebabName = toKebabCase(name);

  // Component file
  const componentPath = path.join(ROOT, 'src/components/dashboard', `${kebabName}.tsx`);
  const componentContent = `'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';

export interface ${pascalName}Props {
  // Add props here
}

export function ${pascalName}({ }: ${pascalName}Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // TODO: Fetch data here
        setData(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4">
        <div className="flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-red-900">Error</h3>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">${pascalName}</h2>
      {/* TODO: Render component here */}
    </div>
  );
}
`;

  // Test file
  const testPath = path.join(ROOT, 'tests', `${kebabName}.test.tsx`);
  const testContent = `import { render, screen } from '@testing-library/react';
import { ${pascalName} } from '@/components/dashboard/${kebabName}';

describe('${pascalName}', () => {
  it('renders loading state', () => {
    render(<${pascalName} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders data when loaded', async () => {
    render(<${pascalName} />);
    // TODO: Add assertions
  });

  it('renders error state on failure', async () => {
    render(<${pascalName} />);
    // TODO: Add assertions
  });
});
`;

  writeFile(componentPath, componentContent);
  writeFile(testPath, testContent);
}

function generateAction(name) {
  const camelName = toCamelCase(name);
  const kebabName = toKebabCase(name);

  const actionPath = path.join(ROOT, 'src/server/actions', `${kebabName}.ts`);
  const actionContent = `'use server';

import { getAdminFirestore } from '@/firebase/admin';
import { requireUser } from '@/server/auth/auth';
import { logger } from '@/lib/logger';

export interface ${toCamelCase(name)}Request {
  // Add request fields here
}

export interface ${toCamelCase(name)}Response {
  success: boolean;
  data?: any;
  error?: string;
}

export async function ${camelName}(
  req: ${toCamelCase(name)}Request
): Promise<${toCamelCase(name)}Response> {
  try {
    const user = await requireUser();
    const db = getAdminFirestore();

    // TODO: Implement logic here

    logger.info('${camelName} completed', { userId: user.uid });

    return {
      success: true,
      data: null
    };
  } catch (error) {
    logger.error('${camelName} failed', { error });
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
`;

  writeFile(actionPath, actionContent);
}

function generateRoute(name) {
  const kebabName = toKebabCase(name);

  const routePath = path.join(ROOT, 'src/app/api', kebabName, 'route.ts');
  const routeContent = `import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // TODO: Validate request body

    // TODO: Implement business logic

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('${kebabName} POST failed', { error });

    if (error instanceof SyntaxError) {
      return NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // TODO: Implement GET logic

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('${kebabName} GET failed', { error });
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
`;

  writeFile(routePath, routeContent);
}

function generateCron(name) {
  const kebabName = toKebabCase(name);

  const cronPath = path.join(ROOT, 'src/app/api/cron', kebabName, 'route.ts');
  const cronContent = `import { NextRequest, NextResponse } from 'next/server';
import { requireCronSecret } from '@/server/cron';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 55;

export async function GET(request: NextRequest) {
  return POST(request);
}

export async function POST(request: NextRequest) {
  try {
    // Verify CRON_SECRET
    const authError = await requireCronSecret(request);
    if (authError) return authError;

    logger.info('${kebabName} cron started');

    // TODO: Implement cron job logic here

    logger.info('${kebabName} cron completed');

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    logger.error('${kebabName} cron failed', { error });
    return NextResponse.json(
      { error: 'Cron job failed' },
      { status: 500 }
    );
  }
}
`;

  writeFile(cronPath, cronContent);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const type = process.argv[2];
  const name = process.argv[3];

  if (!type || !name) {
    console.log(\`
🏗️  Component/API Route Scaffolding

Usage:
  node scripts/generate.mjs component <Name>    Create React component + test
  node scripts/generate.mjs action <name>       Create server action
  node scripts/generate.mjs route <endpoint>    Create API route
  node scripts/generate.mjs cron <job-name>     Create cron job

Examples:
  node scripts/generate.mjs component Dashboard
  node scripts/generate.mjs action getUserProfile
  node scripts/generate.mjs route healthcheck
  node scripts/generate.mjs cron cleanup-cache
\`);
    process.exit(1);
  }

  console.log(\`\n🏗️  Generating \${type}: \${name}\n\`);

  try {
    switch (type.toLowerCase()) {
      case 'component':
        generateComponent(name);
        break;
      case 'action':
        generateAction(name);
        break;
      case 'route':
        generateRoute(name);
        break;
      case 'cron':
        generateCron(name);
        break;
      default:
        console.error(\`❌ Unknown type: \${type}\`);
        process.exit(1);
    }

    console.log(\`\n✅ Scaffolding complete!\n\`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
`;

  writeFile(cronPath, cronContent);
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const type = process.argv[2];
  const name = process.argv[3];

  if (!type || !name) {
    console.log(`
🏗️  Component/API Route Scaffolding

Usage:
  node scripts/generate.mjs component <Name>    Create React component + test
  node scripts/generate.mjs action <name>       Create server action
  node scripts/generate.mjs route <endpoint>    Create API route
  node scripts/generate.mjs cron <job-name>     Create cron job

Examples:
  node scripts/generate.mjs component Dashboard
  node scripts/generate.mjs action getUserProfile
  node scripts/generate.mjs route healthcheck
  node scripts/generate.mjs cron cleanup-cache
`);
    process.exit(1);
  }

  console.log(`\n🏗️  Generating ${type}: ${name}\n`);

  try {
    switch (type.toLowerCase()) {
      case 'component':
        generateComponent(name);
        break;
      case 'action':
        generateAction(name);
        break;
      case 'route':
        generateRoute(name);
        break;
      case 'cron':
        generateCron(name);
        break;
      default:
        console.error(`❌ Unknown type: ${type}`);
        process.exit(1);
    }

    console.log(`\n✅ Scaffolding complete!\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
