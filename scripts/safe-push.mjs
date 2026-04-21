import { execFileSync } from 'node:child_process';

function run(command, args, { allowFailure = false, capture = false } = {}) {
  try {
    const stdout = execFileSync(command, args, {
      cwd: process.cwd(),
      encoding: capture ? 'utf8' : undefined,
      stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit',
    });

    return capture ? stdout.trim() : '';
  } catch (error) {
    if (allowFailure) {
      return null;
    }

    throw error;
  }
}

function runNpm(args) {
  if (process.platform === 'win32') {
    const command = ['npm', ...args].join(' ');
    return run(process.env.ComSpec || 'cmd.exe', ['/d', '/s', '/c', command]);
  }

  return run('npm', args);
}

console.log('[safe-push] Fetching latest changes...');
run('git', ['fetch', 'origin', 'main']);

const local = run('git', ['rev-parse', 'HEAD'], { capture: true });
const remote = run('git', ['rev-parse', 'origin/main'], { capture: true });

let stashed = false;

if (local !== remote) {
  console.log('[safe-push] Remote has new commits. Pulling with rebase...');

  const hasTrackedChanges = run('git', ['diff-index', '--quiet', 'HEAD', '--'], {
    allowFailure: true,
  }) === null;

  if (hasTrackedChanges) {
    console.log('[safe-push] Stashing uncommitted changes...');
    run('git', ['stash', 'push', '-m', `Auto-stash before safe-push ${new Date().toISOString()}`]);
    stashed = true;
  }

  run('git', ['pull', '--rebase', 'origin', 'main']);

  if (stashed) {
    console.log('[safe-push] Restoring stashed changes...');

    if (run('git', ['stash', 'pop'], { allowFailure: true }) === null) {
      console.warn('[safe-push] Stash pop had conflicts. Resolve them manually.');
    }
  }
}

console.log('[safe-push] Scanning for hardcoded secrets...');
runNpm(['run', '-s', 'check:secrets']);

console.log('[safe-push] Checking simplify gate...');
runNpm(['run', '-s', 'simplify:verify']);

console.log('[safe-push] Pushing to origin/main...');
run('git', ['push', 'origin', 'main']);

console.log('[safe-push] Push successful.');
