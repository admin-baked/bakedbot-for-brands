import fs from 'node:fs/promises';
import path from 'node:path';
import { bundle } from '@remotion/bundler';

const projectRoot = process.cwd();
const entryPoint = path.join(projectRoot, 'src', 'remotion', 'index.ts');
const outDir = path.join(projectRoot, '.remotion', 'bundle');
const publicDir = path.join(projectRoot, 'public');

let lastLoggedProgress = -1;

console.log('[Remotion] Bundling compositions...');

await fs.rm(outDir, { recursive: true, force: true });
await fs.mkdir(outDir, { recursive: true });

const serveUrl = await bundle({
  entryPoint,
  outDir,
  publicDir,
  rootDir: projectRoot,
  enableCaching: true,
  publicPath: null,
  keyboardShortcutsEnabled: false,
  askAIEnabled: false,
  rspack: false,
  onProgress: (progress) => {
    const rounded = Math.round(progress * 100);
    if (rounded !== lastLoggedProgress && rounded % 10 === 0) {
      lastLoggedProgress = rounded;
      console.log(`[Remotion] Bundle progress ${rounded}%`);
    }
  },
  onDirectoryCreated: (dir) => {
    console.log(`[Remotion] Output directory ready: ${dir}`);
  },
  onPublicDirCopyProgress: () => {},
  onSymlinkDetected: (symlinkPath) => {
    console.warn(`[Remotion] Symlink detected while bundling: ${symlinkPath}`);
  },
});

console.log(`[Remotion] Bundle ready: ${serveUrl}`);
