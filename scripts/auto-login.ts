#!/usr/bin/env tsx
/**
 * Auto-Login Super User
 *
 * Automatically signs in the super user using the custom token.
 * Opens the browser with authenticated session.
 *
 * Usage:
 *   npx tsx scripts/auto-login.ts
 */

import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

async function autoLogin() {
  console.log('🔐 Auto-Login for Super User\n');

  // Check if token file exists
  const tokenFile = path.join(process.cwd(), '.super-user-token');

  if (!fs.existsSync(tokenFile)) {
    console.error('❌ Token file not found!');
    console.log('\nPlease run setup first:');
    console.log('  npx tsx scripts/setup-super-user.ts\n');
    process.exit(1);
  }

  const customToken = fs.readFileSync(tokenFile, 'utf-8').trim();
  console.log('✅ Token loaded');

  // Create the login URL with the token
  const loginUrl = `http://localhost:3000/auth/auto-login?token=${encodeURIComponent(customToken)}`;

  console.log('\n💡 Note: If you prefer manual login, go to:');
  console.log('   http://localhost:3000/admin-login');

  console.log('\n📝 Login URL created');
  console.log('\n🌐 Opening browser...');

  // Open browser (cross-platform)
  const openCommand = process.platform === 'win32' ? 'start' :
                      process.platform === 'darwin' ? 'open' : 'xdg-open';

  exec(`${openCommand} "${loginUrl}"`, (error) => {
    if (error) {
      console.error('❌ Failed to open browser:', error);
      console.log('\n📋 Copy this URL and open it manually:');
      console.log(loginUrl);
    } else {
      console.log('✅ Browser opened!');
      console.log('\n✨ You should be automatically logged in as Super User');
    }
  });

  console.log('\n💡 Tip: Bookmark this for quick access');
  console.log('\n⚠️  Security: This token grants full access. Keep it secure!\n');
}

autoLogin().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
