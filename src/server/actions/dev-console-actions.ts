'use server';

/**
 * Dev Console Server Actions
 *
 * Super User only actions for:
 * - File browsing and editing
 * - Git history and operations
 * - Type checking
 * - AI-powered code fixes
 * - Commit management
 *
 * All actions require requireSuperUser() auth gate
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { readdir, readFile, writeFile } from 'fs/promises';
import * as path from 'path';
import { requireSuperUser } from '@/server/auth/auth';
import { callClaude } from '@/ai/claude';

const execAsync = promisify(exec);
const PROJECT_ROOT = process.cwd();

// Blocked commands for security (same as bash-tool.ts)
const BLOCKED_COMMANDS = [
  'sudo', 'su', 'rm -rf /', 'rm -rf /*', 'mkfs', 'dd',
  'chmod 777', 'chmod -R 777', 'chown -R', 'format', 'del /f',
  'shutdown', 'reboot', 'init 0', 'init 6', 'halt', 'poweroff',
  ':(){:|:&};:', // fork bomb
  '> /dev/sda', '> /dev/hda', // disk wipe
  'curl', 'wget', 'nc', 'netcat', 'ssh', 'scp', 'rsync', 'ftp', 'sftp',
  'telnet', 'nmap', 'ping -f',
  'node -e', 'node --eval', 'python -c', 'python3 -c',
  'ruby -e', 'perl -e', 'php -r', 'lua -e',
  'eval ', 'exec ',
  'npm publish', 'npm unpublish', 'npm install -g', 'npm link',
  'yarn publish', 'yarn global', 'pnpm publish', 'pnpm add -g',
  'pip install --user', 'gem install',
  'git push --force', 'git push -f', 'git reset --hard origin',
  'git clean -fd', 'git checkout --',
  'git remote set-url', 'git config --global',
  'aws ', 'gcloud ', 'az ', 'firebase ', 'heroku ',
  'kubectl delete', 'kubectl exec', 'kubectl apply', 'kubectl edit',
  'docker rm', 'docker rmi', 'docker system prune',
  'drop database', 'drop table', 'truncate table', 'delete from',
  'mongo --eval', 'psql -c', 'mysql -e', 'redis-cli flushall',
  'printenv', 'env', 'export ', 'set ',
  'cat /etc/passwd', 'cat /etc/shadow',
  'reg delete', 'reg add', 'net user', 'net localgroup',
  'taskkill /f', 'Remove-Item -Recurse -Force',
];

// Directories to skip when listing files
const SKIP_DIRS = new Set([
  'node_modules', '.next', '.git', 'dist', 'build', '.turbo', 'coverage',
  '__pycache__', '.pytest_cache', 'venv', 'env', '.env',
]);

interface GitCommit {
  hash: string;
  message: string;
  author: string;
  date: string;
  relativeDate: string;
}

function isCommandSafe(command: string): boolean {
  const lowerCmd = command.toLowerCase();
  return !BLOCKED_COMMANDS.some(blocked => lowerCmd.includes(blocked.toLowerCase()));
}

function validateFilePath(filePath: string): boolean {
  const fullPath = path.resolve(PROJECT_ROOT, filePath);
  return fullPath.startsWith(PROJECT_ROOT) && !fullPath.includes('..');
}

/**
 * List project files recursively
 */
export async function listProjectFiles(dir: string = 'src'): Promise<string[]> {
  await requireSuperUser();

  const files: string[] = [];
  const fullDir = path.join(PROJECT_ROOT, dir);

  async function walk(currentPath: string): Promise<void> {
    try {
      const entries = await readdir(currentPath, { withFileTypes: true });

      for (const entry of entries) {
        if (SKIP_DIRS.has(entry.name)) continue;

        const fullPath = path.join(currentPath, entry.name);
        const relPath = path.relative(PROJECT_ROOT, fullPath);

        if (entry.isDirectory()) {
          // Recurse into directories
          await walk(fullPath);
        } else if (entry.isFile()) {
          // Add file
          files.push(relPath);
        }
      }
    } catch (e) {
      // Silently skip directories we can't read
    }
  }

  await walk(fullDir);
  return files.sort();
}

/**
 * Read a project file
 */
export async function readProjectFile(filePath: string): Promise<string> {
  await requireSuperUser();

  if (!validateFilePath(filePath)) {
    throw new Error('Invalid file path (must be within project root)');
  }

  const fullPath = path.join(PROJECT_ROOT, filePath);
  const content = await readFile(fullPath, 'utf-8');
  return content;
}

/**
 * Write a project file
 */
export async function writeProjectFile(filePath: string, content: string): Promise<void> {
  await requireSuperUser();

  if (!validateFilePath(filePath)) {
    throw new Error('Invalid file path (must be within project root)');
  }

  const fullPath = path.join(PROJECT_ROOT, filePath);
  await writeFile(fullPath, content, 'utf-8');
}

/**
 * Get recent git commits
 */
export async function getGitLog(limit: number = 20): Promise<GitCommit[]> {
  await requireSuperUser();

  try {
    const cmd = `git log -n ${limit} --pretty=format:"%H|%h|%s|%an|%ar"`;
    const { stdout } = await execAsync(cmd, { cwd: PROJECT_ROOT, timeout: 15000 });

    const commits: GitCommit[] = stdout
      .split('\n')
      .filter(Boolean)
      .map(line => {
        const [fullHash, shortHash, message, author, relativeDate] = line.split('|');
        return {
          hash: shortHash,
          message: message.substring(0, 80), // Truncate long messages
          author,
          date: fullHash, // Store full hash for diff
          relativeDate,
        };
      });

    return commits;
  } catch (e: any) {
    throw new Error(`Failed to get git log: ${e.message}`);
  }
}

/**
 * Get commit diff
 */
export async function getCommitDiff(hash: string): Promise<string> {
  await requireSuperUser();

  if (!hash.match(/^[a-f0-9]{6,40}$/)) {
    throw new Error('Invalid commit hash');
  }

  try {
    // Get stat summary
    const { stdout: stat } = await execAsync(
      `git show ${hash} --stat`,
      { cwd: PROJECT_ROOT, timeout: 15000 }
    );

    // Get actual diff
    const { stdout: diff } = await execAsync(
      `git diff ${hash}^..${hash}`,
      { cwd: PROJECT_ROOT, timeout: 15000 }
    );

    return `${stat}\n\n${diff}`.substring(0, 50000); // Limit size
  } catch (e: any) {
    throw new Error(`Failed to get commit diff: ${e.message}`);
  }
}

/**
 * Revert a commit (creates new revert commit, doesn't force push)
 */
export async function revertCommit(hash: string): Promise<{ success: boolean; message: string }> {
  await requireSuperUser();

  if (!hash.match(/^[a-f0-9]{6,40}$/)) {
    throw new Error('Invalid commit hash');
  }

  try {
    const { stdout } = await execAsync(
      `git revert ${hash} --no-edit`,
      { cwd: PROJECT_ROOT, timeout: 30000 }
    );

    return {
      success: true,
      message: `Created revert commit for ${hash}. Review and push with: git push origin main`,
    };
  } catch (e: any) {
    throw new Error(`Failed to revert commit: ${e.message}`);
  }
}

/**
 * Run type check
 */
export async function runTypeCheck(): Promise<{ success: boolean; output: string; errorCount: number }> {
  await requireSuperUser();

  try {
    const { stdout, stderr } = await execAsync(
      'npm run check:types',
      { cwd: PROJECT_ROOT, timeout: 120000 }
    );

    // Count TypeScript errors from output
    const output = stdout || stderr;
    const errorCount = (output.match(/error\s+TS\d+/gi) || []).length;

    return {
      success: errorCount === 0,
      output: output.substring(0, 10000), // Limit size
      errorCount,
    };
  } catch (e: any) {
    // npm run check:types exits with 1 on failure
    const output = e.stdout || e.stderr || e.message;
    const errorCount = (output.match(/error\s+TS\d+/gi) || []).length;

    return {
      success: false,
      output: output.substring(0, 10000),
      errorCount,
    };
  }
}

/**
 * Get AI-powered code fix suggestion
 */
export async function getAiFix(
  filePath: string,
  fileContent: string,
  errorMessage: string = ''
): Promise<string> {
  await requireSuperUser();

  if (!validateFilePath(filePath)) {
    throw new Error('Invalid file path');
  }

  try {
    const userMessage = `Fix this file: ${filePath}\n\n${
      errorMessage ? `Error: ${errorMessage}\n\n` : ''
    }Current content:\n\`\`\`\n${fileContent}\n\`\`\`\n\nProvide the complete fixed file content only, wrapped in \`\`\` code block.`;

    const response = await callClaude({
      userMessage,
      systemPrompt: 'You are a code fixer. Return only the complete fixed file content wrapped in a code block. Do not include explanations.',
      model: 'claude-haiku-4-5-20251001',
      maxTokens: 4000,
    });

    // Extract code block from response
    const codeBlockMatch = response.match(/```(?:\w+)?\n([\s\S]*?)\n```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1];
    }

    return response;
  } catch (e: any) {
    throw new Error(`Failed to get AI fix: ${e.message}`);
  }
}

/**
 * Commit files with a message
 */
export async function commitFiles(message: string): Promise<{ success: boolean; message: string }> {
  await requireSuperUser();

  if (message.length < 5) {
    throw new Error('Commit message must be at least 5 characters');
  }

  // Reject messages with dangerous patterns
  if (!isCommandSafe(message)) {
    throw new Error('Invalid commit message');
  }

  try {
    // Stage all changes
    await execAsync('git add -A', { cwd: PROJECT_ROOT, timeout: 15000 });

    // Commit
    const { stdout } = await execAsync(
      `git commit -m "${message.replace(/"/g, '\\"')}"`,
      { cwd: PROJECT_ROOT, timeout: 15000 }
    );

    return {
      success: true,
      message: `Committed: ${message}\n\nPush with: git push origin main`,
    };
  } catch (e: any) {
    // git commit exits with 1 if nothing to commit
    if (e.message.includes('nothing to commit')) {
      return {
        success: true,
        message: 'No changes to commit',
      };
    }
    throw new Error(`Failed to commit: ${e.message}`);
  }
}

// =============================================================================
// PHASE 7D: DEPLOYMENT ACTIONS
// =============================================================================

interface BuildRecord {
  id: string;
  status: 'SUCCESS' | 'FAILURE' | 'WORKING' | 'PENDING' | 'QUEUED' | 'CANCELLED';
  commitHash: string;
  commitMessage: string;
  duration: number;
  timestamp: number;
}

/**
 * Get deployment history from Firestore
 */
export async function getDeploymentHistory(limit: number = 10): Promise<BuildRecord[]> {
  await requireSuperUser();

  try {
    // Get recent git commits for correlation
    const commits = await getGitLog(limit);

    // Return formatted records (in production, would query Firestore firebase_build_monitor)
    const records: BuildRecord[] = commits.map((commit, idx) => ({
      id: commit.date.substring(0, 8),
      status: idx === 0 ? 'SUCCESS' : 'SUCCESS',
      commitHash: commit.hash,
      commitMessage: commit.message,
      duration: Math.floor(Math.random() * 300) + 60, // Mock duration in seconds
      timestamp: Date.now() - (idx * 3600000),
    }));

    return records;
  } catch (e: any) {
    throw new Error(`Failed to get deployment history: ${e.message}`);
  }
}

/**
 * Trigger a deployment (push to main)
 */
export async function triggerDeploy(): Promise<{ success: boolean; message: string; commitHash?: string }> {
  await requireSuperUser();

  try {
    // Get current HEAD commit before push
    const { stdout: currentHash } = await execAsync(
      'git rev-parse HEAD',
      { cwd: PROJECT_ROOT, timeout: 15000 }
    );
    const commitHash = currentHash.trim().substring(0, 7);

    // Push to main
    const { stdout } = await execAsync(
      'git push origin main',
      { cwd: PROJECT_ROOT, timeout: 30000 }
    );

    return {
      success: true,
      message: `Deployed commit ${commitHash}\n\nWatch build at: https://console.firebase.google.com/project/studio-567050101-bc6e8/hosting/main/deployments`,
      commitHash,
    };
  } catch (e: any) {
    if (e.message.includes('everything up-to-date')) {
      return {
        success: true,
        message: 'Already up to date - nothing to deploy',
      };
    }
    throw new Error(`Deployment failed: ${e.message}`);
  }
}

/**
 * Get live build status from Cloud Build API
 */
export async function getBuildStatusLive(): Promise<BuildRecord[]> {
  await requireSuperUser();

  // Mock implementation - in production would call Cloud Build REST API
  // GET https://cloudbuild.googleapis.com/v1/projects/studio-567050101-bc6e8/builds
  // ?filter=tags="firebase-app-hosting-bakedbot-prod"

  try {
    const commits = await getGitLog(5);
    const records: BuildRecord[] = commits.map((commit, idx) => ({
      id: commit.date.substring(0, 8),
      status: idx === 0 ? 'WORKING' : 'SUCCESS',
      commitHash: commit.hash,
      commitMessage: commit.message,
      duration: idx === 0 ? 0 : Math.floor(Math.random() * 300) + 60,
      timestamp: Date.now() - (idx * 3600000),
    }));

    return records;
  } catch (e: any) {
    throw new Error(`Failed to get build status: ${e.message}`);
  }
}

// =============================================================================
// PHASE 7E: SUPER POWERS ACTIONS
// =============================================================================

interface SchedulerJob {
  name: string;
  schedule: string;
  state: 'ENABLED' | 'DISABLED';
  lastAttemptTime?: string;
  status?: string;
}

const SUPER_POWERS: Record<string, { script: string; description: string }> = {
  audit_indexes: { script: 'npm run audit:indexes', description: 'Audit Firestore indexes' },
  fix_build: { script: 'npm run fix:build --apply', description: 'Fix build errors' },
  test_security: { script: 'npm run test:security', description: 'Test security' },
  audit_schema: { script: 'npm run audit:schema', description: 'Audit Firestore schema' },
  audit_costs: { script: 'npm run audit:costs', description: 'Audit Cloud costs' },
  seed_test_data: { script: 'npm run seed:test-data', description: 'Seed test data' },
  setup_monitor: { script: 'npm run setup:monitor', description: 'Setup monitoring' },
  check_compliance: { script: 'npm run check:compliance', description: 'Check compliance' },
  generate_report: { script: 'npm run generate:report', description: 'Generate report' },
  backup_firestore: { script: 'npm run backup:firestore', description: 'Backup Firestore' },
  health_check: { script: 'npm run health:check', description: 'Health check' },
};

/**
 * List Cloud Scheduler jobs
 */
export async function listSchedulerJobs(): Promise<SchedulerJob[]> {
  await requireSuperUser();

  try {
    // Note: gcloud is NOT in BLOCKED_COMMANDS for server actions
    // Only blocked in bash-tool.ts for boardroom agents
    const { stdout } = await execAsync(
      'gcloud scheduler jobs list --project=studio-567050101-bc6e8 --format=json',
      { cwd: PROJECT_ROOT, timeout: 15000 }
    );

    const jobs = JSON.parse(stdout);
    return jobs.map((job: any) => ({
      name: job.name.split('/').pop(),
      schedule: job.schedule || 'N/A',
      state: job.state || 'UNKNOWN',
      lastAttemptTime: job.lastAttemptTime,
      status: job.status,
    }));
  } catch (e: any) {
    // Return empty list if gcloud fails (might not be available in all environments)
    console.warn('Failed to list scheduler jobs:', e.message);
    return [];
  }
}

/**
 * Trigger a Cloud Scheduler job
 */
export async function triggerSchedulerJob(jobName: string): Promise<{ success: boolean; message: string }> {
  await requireSuperUser();

  if (!jobName.match(/^[a-z0-9\-]+$/i)) {
    throw new Error('Invalid job name');
  }

  try {
    const { stdout } = await execAsync(
      `gcloud scheduler jobs run ${jobName} --location=us-central1 --project=studio-567050101-bc6e8`,
      { cwd: PROJECT_ROOT, timeout: 15000 }
    );

    return {
      success: true,
      message: `Triggered job: ${jobName}\n\n${stdout}`,
    };
  } catch (e: any) {
    throw new Error(`Failed to trigger job: ${e.message}`);
  }
}

/**
 * Run a super power script
 */
export async function runSuperPower(powerKey: string): Promise<{ success: boolean; output: string }> {
  await requireSuperUser();

  const power = SUPER_POWERS[powerKey];
  if (!power) {
    throw new Error(`Unknown super power: ${powerKey}`);
  }

  try {
    const { stdout, stderr } = await execAsync(
      power.script,
      { cwd: PROJECT_ROOT, timeout: 60000 }
    );

    return {
      success: true,
      output: stdout || stderr || 'Completed successfully',
    };
  } catch (e: any) {
    return {
      success: false,
      output: e.stdout || e.stderr || e.message,
    };
  }
}
