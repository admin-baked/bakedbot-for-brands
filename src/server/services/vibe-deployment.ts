/**
 * Vibe Deployment Service
 *
 * Handles one-click deployment to Firebase App Hosting.
 * Creates a new Firebase project, deploys code, and sets up subdomain.
 */

import { logger } from '@/lib/logger';
import type { VibeCodeProject } from '@/types/vibe-code';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

export interface DeploymentOptions {
  project: VibeCodeProject;
  userId: string;
  subdomain?: string; // e.g., "my-dispensary" → my-dispensary.bakedbot.ai
  customDomain?: string; // e.g., "dispensary.com"
}

export interface DeploymentResult {
  success: boolean;
  deploymentUrl?: string;
  firebaseProjectId?: string;
  error?: string;
  logs?: string[];
}

/**
 * Deploy Vibe project to Firebase App Hosting
 */
export async function deployToFirebase(
  options: DeploymentOptions
): Promise<DeploymentResult> {
  const logs: string[] = [];

  try {
    logger.info('[VIBE-DEPLOY] Starting deployment', {
      projectId: options.project.id,
      userId: options.userId,
      subdomain: options.subdomain,
    });

    // 1. Create temporary directory for deployment
    const tmpDir = join(tmpdir(), `vibe-deploy-${options.project.id}`);
    await mkdir(tmpDir, { recursive: true });
    logs.push(`Created temp directory: ${tmpDir}`);

    // 2. Write all project files
    for (const file of options.project.files) {
      const filePath = join(tmpDir, file.path);
      const dir = join(filePath, '..');
      await mkdir(dir, { recursive: true });
      await writeFile(filePath, file.content, 'utf-8');
    }
    logs.push(`Wrote ${options.project.files.length} files`);

    // 3. Generate Firebase config
    const firebaseConfig = generateFirebaseConfig(options);
    await writeFile(join(tmpDir, 'firebase.json'), JSON.stringify(firebaseConfig, null, 2));
    await writeFile(join(tmpDir, '.firebaserc'), JSON.stringify({
      projects: {
        default: options.subdomain || `vibe-${options.project.id}`,
      },
    }, null, 2));
    logs.push('Generated Firebase config');

    // 4. Generate apphosting.yaml for Next.js
    const apphostingYaml = `
runConfig:
  runtime: nodejs20

env:
  - variable: NODE_ENV
    value: production

secrets:
  - variable: FIREBASE_CONFIG
    secret: firebase-config
`;
    await writeFile(join(tmpDir, 'apphosting.yaml'), apphostingYaml);
    logs.push('Generated apphosting.yaml');

    // 5. Install dependencies
    logs.push('Installing dependencies...');
    const { stdout: installOut, stderr: installErr } = await execAsync('npm install', {
      cwd: tmpDir,
      timeout: 300000, // 5 minutes
    });
    if (installErr) logs.push(`Install warnings: ${installErr}`);
    logs.push('Dependencies installed');

    // 6. Build project
    logs.push('Building project...');
    const { stdout: buildOut, stderr: buildErr } = await execAsync('npm run build', {
      cwd: tmpDir,
      timeout: 300000,
    });
    if (buildErr) logs.push(`Build warnings: ${buildErr}`);
    logs.push('Build completed');

    // 7. Deploy to Firebase
    logs.push('Deploying to Firebase...');
    const firebaseToken = process.env.FIREBASE_DEPLOY_TOKEN;
    if (!firebaseToken) {
      throw new Error('FIREBASE_DEPLOY_TOKEN not set');
    }

    const deployCmd = `firebase deploy --only hosting --token ${firebaseToken}`;
    const { stdout: deployOut } = await execAsync(deployCmd, {
      cwd: tmpDir,
      timeout: 600000, // 10 minutes
    });
    logs.push('Deployment completed');

    // Extract deployment URL from output
    const urlMatch = deployOut.match(/Hosting URL: (https:\/\/[^\s]+)/);
    const deploymentUrl = urlMatch ? urlMatch[1] : `https://${options.subdomain}.bakedbot.ai`;

    logger.info('[VIBE-DEPLOY] Deployment successful', {
      projectId: options.project.id,
      url: deploymentUrl,
    });

    return {
      success: true,
      deploymentUrl,
      firebaseProjectId: options.subdomain || `vibe-${options.project.id}`,
      logs,
    };
  } catch (error) {
    logger.error('[VIBE-DEPLOY] Deployment failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Deployment failed',
      logs,
    };
  }
}

function generateFirebaseConfig(options: DeploymentOptions) {
  return {
    hosting: {
      public: '.next',
      ignore: ['firebase.json', '**/.*', '**/node_modules/**'],
      rewrites: [
        {
          source: '**',
          destination: '/index.html',
        },
      ],
      headers: [
        {
          source: '**/*.@(jpg|jpeg|gif|png|svg|webp)',
          headers: [
            {
              key: 'Cache-Control',
              value: 'public, max-age=31536000, immutable',
            },
          ],
        },
      ],
    },
  };
}

/**
 * Allocate a subdomain for the user
 */
export async function allocateSubdomain(
  userId: string,
  preferredName?: string
): Promise<{ success: boolean; subdomain?: string; error?: string }> {
  try {
    // Generate subdomain from preferred name or random
    let subdomain = preferredName
      ? preferredName.toLowerCase().replace(/[^a-z0-9-]/g, '-')
      : `dispensary-${userId.substring(0, 8)}`;

    // Check if subdomain is available
    const { getAdminFirestore } = await import('@/firebase/admin');
    const db = getAdminFirestore();

    const existing = await db
      .collection('vibe_deployments')
      .where('subdomain', '==', subdomain)
      .limit(1)
      .get();

    if (!existing.empty) {
      // Subdomain taken, add random suffix
      subdomain = `${subdomain}-${Math.random().toString(36).substring(2, 6)}`;
    }

    // Reserve subdomain
    await db.collection('vibe_deployments').add({
      subdomain,
      userId,
      status: 'allocated',
      createdAt: new Date().toISOString(),
    });

    return { success: true, subdomain };
  } catch (error) {
    logger.error('[VIBE-DEPLOY] Subdomain allocation failed', { error });
    return {
      success: false,
      error: 'Failed to allocate subdomain',
    };
  }
}

/**
 * Simpler alternative: Export as .zip with deployment instructions
 * (Fallback if automated deployment is too complex)
 */
export function generateDeploymentInstructions(projectName: string): string {
  return `# Deployment Instructions

## Deploy to Firebase (Recommended)

1. Install Firebase CLI:
   \`\`\`bash
   npm install -g firebase-tools
   \`\`\`

2. Login to Firebase:
   \`\`\`bash
   firebase login
   \`\`\`

3. Initialize Firebase project:
   \`\`\`bash
   firebase init hosting
   \`\`\`
   - Select "Create a new project" or use existing
   - Build directory: \`.next\`
   - Single-page app: Yes
   - Set up automatic builds with GitHub: Optional

4. Deploy:
   \`\`\`bash
   npm run build
   firebase deploy
   \`\`\`

Your site will be live at: https://your-project.web.app

## Deploy to Netlify (Alternative)

1. Push to GitHub
2. Connect repo to Netlify
3. Build command: \`npm run build\`
4. Publish directory: \`.next\`

## Deploy to Vercel (Alternative)

1. Push to GitHub
2. Import repo to Vercel
3. Framework preset: Next.js
4. Click Deploy

---

Need help? Visit: https://bakedbot.ai/help/deployment
`;
}
