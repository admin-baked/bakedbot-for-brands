import { execFileSync } from 'node:child_process';
import { chmodSync, existsSync } from 'node:fs';
import path from 'node:path';

function runGit(args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return null;
    }

    const message = error.stderr?.toString().trim() || error.message;
    throw new Error(message);
  }
}

const repoRoot = runGit(['rev-parse', '--show-toplevel'], { allowFailure: true });

if (!repoRoot) {
  console.log('[git-hooks] Skipping hook install outside a git repository.');
  process.exit(0);
}

const trackedHooksPath = '.githooks';
const hookFile = path.join(repoRoot, trackedHooksPath, 'pre-push');

if (!existsSync(hookFile)) {
  console.log('[git-hooks] Skipping hook install because .githooks/pre-push is missing.');
  process.exit(0);
}

try {
  chmodSync(hookFile, 0o755);
} catch {
  console.log('[git-hooks] Could not update hook permissions. Continuing.');
}

const currentHooksPath = runGit(['config', '--local', '--get', 'core.hooksPath'], {
  allowFailure: true,
});

if (currentHooksPath === trackedHooksPath) {
  console.log('[git-hooks] core.hooksPath is already set to .githooks.');
  process.exit(0);
}

if (currentHooksPath && currentHooksPath !== trackedHooksPath) {
  console.log(
    `[git-hooks] Replacing existing core.hooksPath (${currentHooksPath}) with ${trackedHooksPath}.`
  );
}

runGit(['config', '--local', 'core.hooksPath', trackedHooksPath]);
console.log('[git-hooks] Configured core.hooksPath=.githooks');
