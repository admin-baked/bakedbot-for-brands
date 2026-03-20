import { promises as fs } from 'node:fs';
import path from 'node:path';

const workspaceRoot = process.cwd();
const nodeModulesRoot = path.join(workspaceRoot, 'node_modules');

const tr46PackageName = 'tr46';
const tr46DeprecatedImport = 'require("punycode")';
const tr46PatchedImport = 'require("punycode/")';

const whatwgUrlPackageName = 'whatwg-url';
const whatwgUrlDeprecatedImport = 'require("punycode")';
const whatwgUrlPatchedImport = 'require("punycode/")';

const uriJsPackageName = 'uri-js';
const uriJsDeprecatedImport = 'from "punycode"';
const uriJsPatchedImport = 'from "punycode/"';

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function readJsonIfExists(filePath) {
  if (!(await pathExists(filePath))) {
    return null;
  }

  const source = await fs.readFile(filePath, 'utf8');
  return JSON.parse(source);
}

async function patchFile(filePath, matcher, replacement) {
  if (!(await pathExists(filePath))) {
    return false;
  }

  const source = await fs.readFile(filePath, 'utf8');
  if (!source.includes(matcher)) {
    return false;
  }

  await fs.writeFile(filePath, source.replaceAll(matcher, replacement), 'utf8');
  return true;
}

async function patchTr46Package(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = await readJsonIfExists(packageJsonPath);
  if (!packageJson || packageJson.name !== tr46PackageName || packageJson.version !== '0.0.3') {
    return 0;
  }

  const indexPath = path.join(packageDir, 'index.js');
  return (await patchFile(indexPath, tr46DeprecatedImport, tr46PatchedImport)) ? 1 : 0;
}

async function patchUriJsPackage(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = await readJsonIfExists(packageJsonPath);
  if (!packageJson || packageJson.name !== uriJsPackageName) {
    return 0;
  }

  const targets = [
    path.join(packageDir, 'dist', 'esnext', 'uri.js'),
    path.join(packageDir, 'dist', 'esnext', 'schemes', 'mailto.js'),
  ];

  let patchedCount = 0;
  for (const target of targets) {
    if (await patchFile(target, uriJsDeprecatedImport, uriJsPatchedImport)) {
      patchedCount += 1;
    }
  }

  return patchedCount;
}

async function patchWhatwgUrlPackage(packageDir) {
  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = await readJsonIfExists(packageJsonPath);
  if (!packageJson || packageJson.name !== whatwgUrlPackageName || packageJson.version !== '5.0.0') {
    return 0;
  }

  const urlStateMachinePath = path.join(packageDir, 'lib', 'url-state-machine.js');
  return (await patchFile(urlStateMachinePath, whatwgUrlDeprecatedImport, whatwgUrlPatchedImport))
    ? 1
    : 0;
}

async function visitPackageDir(packageDir) {
  let patchedCount = 0;
  patchedCount += await patchTr46Package(packageDir);
  patchedCount += await patchWhatwgUrlPackage(packageDir);
  patchedCount += await patchUriJsPackage(packageDir);

  const nestedNodeModules = path.join(packageDir, 'node_modules');
  if (await pathExists(nestedNodeModules)) {
    patchedCount += await patchNodeModulesTree(nestedNodeModules);
  }

  return patchedCount;
}

async function patchScopedPackages(scopeDir) {
  let patchedCount = 0;
  const entries = await fs.readdir(scopeDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    patchedCount += await visitPackageDir(path.join(scopeDir, entry.name));
  }

  return patchedCount;
}

async function patchNodeModulesTree(nodeModulesDir) {
  let patchedCount = 0;
  const entries = await fs.readdir(nodeModulesDir, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name === '.bin') {
      continue;
    }

    const entryPath = path.join(nodeModulesDir, entry.name);
    if (entry.name.startsWith('@')) {
      patchedCount += await patchScopedPackages(entryPath);
      continue;
    }

    patchedCount += await visitPackageDir(entryPath);
  }

  return patchedCount;
}

async function main() {
  if (!(await pathExists(nodeModulesRoot))) {
    console.log('[patch-punycode-deprecation] node_modules not found, skipping.');
    return;
  }

  const patchedCount = await patchNodeModulesTree(nodeModulesRoot);
  console.log(`[patch-punycode-deprecation] Patched ${patchedCount} file(s).`);
}

main().catch((error) => {
  console.error('[patch-punycode-deprecation] Failed:', error);
  process.exitCode = 1;
});
