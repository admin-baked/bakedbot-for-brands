#!/usr/bin/env node

/**
 * BakedBot AI Chrome Extension - Package Script
 *
 * Creates a .zip file for Chrome Web Store upload.
 */

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PACKAGE_DIR = path.join(ROOT, 'packages');

// Get version from manifest
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const version = manifest.version;

/**
 * Package the extension
 */
async function package() {
  console.log(`Packaging BakedBot AI Chrome Extension v${version}...`);

  // Check if dist exists
  if (!fs.existsSync(DIST)) {
    console.error('Error: dist directory not found. Run "npm run build" first.');
    process.exit(1);
  }

  // Create packages directory
  if (!fs.existsSync(PACKAGE_DIR)) {
    fs.mkdirSync(PACKAGE_DIR, { recursive: true });
  }

  // Create zip file
  const zipPath = path.join(PACKAGE_DIR, `bakedbot-ai-extension-v${version}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', { zlib: { level: 9 } });

  return new Promise((resolve, reject) => {
    output.on('close', () => {
      const sizeKB = (archive.pointer() / 1024).toFixed(2);
      console.log(`\nPackage created: ${zipPath}`);
      console.log(`Size: ${sizeKB} KB`);
      console.log('\nTo upload to Chrome Web Store:');
      console.log('  1. Go to https://chrome.google.com/webstore/devconsole');
      console.log('  2. Select your extension or create new');
      console.log('  3. Upload the .zip file');
      resolve();
    });

    archive.on('error', (err) => {
      reject(err);
    });

    archive.pipe(output);
    archive.directory(DIST, false);
    archive.finalize();
  });
}

package().catch((err) => {
  console.error('Packaging failed:', err);
  process.exit(1);
});
