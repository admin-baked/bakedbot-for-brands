import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const DOC_ONLY_DIRECTORIES = ['memory/', 'dev/testing/', 'test-results/', '.claude/'];
const DOC_ONLY_EXTENSIONS = [
  '.diff',
  '.gif',
  '.ico',
  '.jpeg',
  '.jpg',
  '.md',
  '.mdx',
  '.pdf',
  '.png',
  '.rst',
  '.svg',
  '.txt',
  '.webp',
];

function runGit(repoRoot, args, { allowFailure = false } = {}) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      maxBuffer: 128 * 1024 * 1024, // 128MB — handles large bundled .cjs files
    }).trim();
  } catch (error) {
    if (allowFailure) {
      return null;
    }

    const message = error.stderr?.toString().trim() || error.message;
    throw new Error(message);
  }
}

function normalizePath(filePath) {
  return filePath.replace(/\\/g, '/').toLowerCase();
}

function isDocsOnlyPath(filePath) {
  const normalized = normalizePath(filePath);
  return (
    DOC_ONLY_DIRECTORIES.some((directory) => normalized.startsWith(directory)) ||
    DOC_ONLY_EXTENSIONS.some((extension) => normalized.endsWith(extension))
  );
}

function splitLines(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function resolveRepoRoot() {
  const cwd = process.cwd();
  const repoRoot = runGit(cwd, ['rev-parse', '--show-toplevel'], { allowFailure: true });

  if (!repoRoot) {
    throw new Error('simplify-guard must run inside a git repository.');
  }

  return repoRoot;
}

function resolveGitDir(repoRoot) {
  const gitDir = runGit(repoRoot, ['rev-parse', '--git-dir']);
  return path.resolve(repoRoot, gitDir);
}

function resolveBaseRef(repoRoot) {
  const upstream = runGit(
    repoRoot,
    ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}'],
    { allowFailure: true }
  );

  if (upstream) {
    return upstream;
  }

  for (const fallback of ['origin/main', 'origin/master']) {
    if (runGit(repoRoot, ['rev-parse', '--verify', fallback], { allowFailure: true })) {
      return fallback;
    }
  }

  return null;
}

function resolveMergeBase(repoRoot, baseRef) {
  if (baseRef) {
    return runGit(repoRoot, ['merge-base', 'HEAD', baseRef]);
  }

  const previousCommit = runGit(repoRoot, ['rev-parse', 'HEAD~1'], { allowFailure: true });
  if (previousCommit) {
    return previousCommit;
  }

  return runGit(repoRoot, ['rev-list', '--max-parents=0', 'HEAD']);
}

function getOutgoingFiles(repoRoot, mergeBase) {
  return splitLines(
    runGit(repoRoot, ['diff', '--name-only', '--diff-filter=ACMRD', `${mergeBase}...HEAD`])
  );
}

function getWorkingTreeFiles(repoRoot) {
  const trackedChanges = splitLines(
    runGit(repoRoot, ['diff', '--name-only', '--diff-filter=ACMRD', 'HEAD'])
  );
  const untrackedChanges = splitLines(
    runGit(repoRoot, ['ls-files', '--others', '--exclude-standard'])
  );

  return [...new Set([...trackedChanges, ...untrackedChanges])].sort();
}

function hashOutgoingDiff(repoRoot, mergeBase, codeFiles) {
  const sortedFiles = [...codeFiles].sort();
  const diff = runGit(repoRoot, [
    'diff',
    '--no-ext-diff',
    '--binary',
    `${mergeBase}...HEAD`,
    '--',
    ...sortedFiles,
  ]);

  return createHash('sha256')
    .update(sortedFiles.join('\n'))
    .update('\n')
    .update(diff)
    .digest('hex');
}

function readRecordedState(statusPath) {
  if (!existsSync(statusPath)) {
    return null;
  }

  return JSON.parse(readFileSync(statusPath, 'utf8'));
}

function writeRecordedState(statusPath, value) {
  mkdirSync(path.dirname(statusPath), { recursive: true });
  writeFileSync(statusPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function getState() {
  const repoRoot = resolveRepoRoot();
  const gitDir = resolveGitDir(repoRoot);
  const baseRef = resolveBaseRef(repoRoot);
  const mergeBase = resolveMergeBase(repoRoot, baseRef);
  const changedFiles = getOutgoingFiles(repoRoot, mergeBase);
  const workingTreeFiles = getWorkingTreeFiles(repoRoot);
  const codeFiles = changedFiles.filter((filePath) => !isDocsOnlyPath(filePath)).sort();
  const workingTreeCodeFiles = workingTreeFiles
    .filter((filePath) => !isDocsOnlyPath(filePath))
    .sort();

  return {
    repoRoot,
    gitDir,
    statusPath: path.join(gitDir, 'simplify-status.json'),
    branch: runGit(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']),
    baseRef,
    mergeBase,
    head: runGit(repoRoot, ['rev-parse', 'HEAD']),
    changedFiles,
    codeFiles,
    workingTreeFiles,
    workingTreeCodeFiles,
    diffHash: codeFiles.length > 0 ? hashOutgoingDiff(repoRoot, mergeBase, codeFiles) : null,
  };
}

function printStateSummary(state, recordedState) {
  console.log(`Branch: ${state.branch}`);
  console.log(`Base ref: ${state.baseRef ?? 'none'}`);
  console.log(`Outgoing files: ${state.changedFiles.length}`);
  console.log(`Outgoing code files: ${state.codeFiles.length}`);
  console.log(`Working tree files: ${state.workingTreeFiles.length}`);
  console.log(`Working tree code files: ${state.workingTreeCodeFiles.length}`);

  if (state.codeFiles.length > 0) {
    console.log(`Current diff hash: ${state.diffHash}`);
    console.log('Code files:');
    for (const filePath of state.codeFiles) {
      console.log(`- ${filePath}`);
    }
  } else {
    console.log('Outgoing diff is docs-only. No simplify record is required.');
  }

  if (state.workingTreeCodeFiles.length > 0) {
    console.log('Working tree code changes are local only until they are committed.');
  }

  if (!recordedState) {
    console.log('Recorded simplify review: none');
    return;
  }

  console.log(`Recorded simplify review: ${recordedState.recordedAt}`);
  console.log(`Recorded diff hash: ${recordedState.diffHash}`);
  console.log(`Recorded code files: ${recordedState.codeFiles?.length ?? 0}`);
  console.log(
    recordedState.diffHash === state.diffHash
      ? 'Recorded review matches the current outgoing code diff.'
      : 'Recorded review is stale for the current outgoing code diff.'
  );
}

function verify(state, recordedState) {
  if (state.codeFiles.length === 0) {
    console.log('No outgoing code changes detected. Simplify gate skipped.');
    return;
  }

  if (!recordedState) {
    console.error('Simplify review is required before push.');
    console.error('Run /simplify, then run: npm run simplify:record');
    process.exit(1);
  }

  if (recordedState.diffHash !== state.diffHash) {
    console.error('Simplify review is stale for the current outgoing code diff.');
    console.error('Re-run /simplify, then run: npm run simplify:record');
    process.exit(1);
  }

  console.log(`Simplify review recorded at ${recordedState.recordedAt} for the current outgoing code diff.`);
}

function record(state) {
  if (state.codeFiles.length === 0) {
    if (state.workingTreeCodeFiles.length > 0) {
      console.log('No outgoing code changes detected yet.');
      console.log('Commit the reviewed code first, then run: npm run simplify:record');
      return;
    }

    console.log('No outgoing code changes detected. Nothing to record.');
    return;
  }

  const recordedState = {
    version: 1,
    recordedAt: new Date().toISOString(),
    branch: state.branch,
    baseRef: state.baseRef,
    mergeBase: state.mergeBase,
    head: state.head,
    diffHash: state.diffHash,
    codeFiles: state.codeFiles,
  };

  writeRecordedState(state.statusPath, recordedState);
  console.log(`Recorded simplify review for ${state.codeFiles.length} code file(s).`);
  console.log('Pre-push verification will now allow this outgoing code diff.');
}

const command = process.argv[2] ?? 'status';
const state = getState();
const recordedState = readRecordedState(state.statusPath);

switch (command) {
  case 'record':
    record(state);
    break;
  case 'status':
    printStateSummary(state, recordedState);
    break;
  case 'verify':
    verify(state, recordedState);
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error('Usage: node scripts/simplify-guard.mjs [status|record|verify]');
    process.exit(1);
}
