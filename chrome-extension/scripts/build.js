#!/usr/bin/env node

/**
 * BakedBot AI Chrome Extension - Build Script
 *
 * Copies files to dist/ directory for Chrome loading.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const PROJECT_ROOT = path.join(ROOT, '..');
const DIST = path.join(ROOT, 'dist');

// Source icon from main project (Smokey the AI Budtender)
const SMOKEY_ICON = path.join(PROJECT_ROOT, 'public', 'assets', 'agents', 'smokey-main.png');

// Files and directories to copy
const FILES_TO_COPY = [
  'manifest.json',
  'src',
  'popup',
];

/**
 * Clean dist directory
 */
function clean() {
  if (fs.existsSync(DIST)) {
    fs.rmSync(DIST, { recursive: true });
  }
  fs.mkdirSync(DIST, { recursive: true });
}

/**
 * Copy file or directory
 */
function copy(src, dest) {
  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    const files = fs.readdirSync(src);
    for (const file of files) {
      copy(path.join(src, file), path.join(dest, file));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

/**
 * Copy icons from main project's Smokey icon
 */
function copyIcons() {
  const iconsDir = path.join(DIST, 'icons');
  fs.mkdirSync(iconsDir, { recursive: true });

  // Check if Smokey icon exists
  if (fs.existsSync(SMOKEY_ICON)) {
    // Copy the Smokey icon as all sizes
    // Note: For production, consider using sharp to properly resize
    // Chrome will scale the images, but they'll look better if properly resized
    const sizes = [16, 32, 48, 128];
    for (const size of sizes) {
      const destPath = path.join(iconsDir, `icon${size}.png`);
      fs.copyFileSync(SMOKEY_ICON, destPath);
      console.log(`  - Created icon${size}.png from Smokey icon`);
    }
  } else {
    console.warn('  - Warning: Smokey icon not found at', SMOKEY_ICON);
    console.warn('  - You will need to manually add icons to chrome-extension/dist/icons/');
    // Create the icons dir anyway
    fs.mkdirSync(iconsDir, { recursive: true });
  }
}

/**
 * Build the extension
 */
function build() {
  console.log('Building BakedBot AI Chrome Extension...');
  console.log(`  Project root: ${PROJECT_ROOT}`);

  // Clean
  clean();
  console.log('  - Cleaned dist directory');

  // Copy files
  for (const file of FILES_TO_COPY) {
    const src = path.join(ROOT, file);
    const dest = path.join(DIST, file);

    if (fs.existsSync(src)) {
      copy(src, dest);
      console.log(`  - Copied ${file}`);
    } else {
      console.warn(`  - Warning: ${file} not found, skipping`);
    }
  }

  // Copy icons from Smokey
  copyIcons();

  console.log('\nBuild complete! Load the extension from:');
  console.log(`  ${DIST}`);
  console.log('\nTo load in Chrome:');
  console.log('  1. Go to chrome://extensions');
  console.log('  2. Enable "Developer mode"');
  console.log('  3. Click "Load unpacked"');
  console.log('  4. Select the dist folder');
}

// Watch mode
if (process.argv.includes('--watch')) {
  build();

  const chokidar = require('chokidar');
  const watcher = chokidar.watch(
    FILES_TO_COPY.map((f) => path.join(ROOT, f)),
    { ignoreInitial: true }
  );

  console.log('\nWatching for changes...');

  watcher.on('all', (event, filepath) => {
    console.log(`\n[${event}] ${filepath}`);
    build();
  });
} else {
  build();
}
