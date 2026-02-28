#!/usr/bin/env node
/**
 * SP2: Secrets Auto-Provisioning Script
 *
 * Reads .env.local and apphosting.yaml
 * Checks GCP Secret Manager for existence, versions, and IAM bindings
 * Reports status table
 * With --deploy: provisions missing secrets + grants Firebase access
 *
 * Usage:
 *   node scripts/setup-secrets.mjs              # Report only
 *   node scripts/setup-secrets.mjs --deploy    # Provision missing
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PROJECT_ID = 'studio-567050101-bc6e8';
const BACKEND = 'bakedbot-prod';

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Parse .env.local into key=value map
 */
function parseEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!fs.existsSync(envPath)) {
    throw new Error('.env.local not found');
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const env = {};

  content.split('\n').forEach(line => {
    line = line.trim();
    if (!line || line.startsWith('#')) return;

    const [key, ...valueParts] = line.split('=');
    if (key && valueParts.length > 0) {
      env[key] = valueParts.join('=');
    }
  });

  return env;
}

/**
 * Parse apphosting.yaml to extract secret references
 */
function parseHostingYaml() {
  const yamlPath = path.join(ROOT, 'apphosting.yaml');
  if (!fs.existsSync(yamlPath)) {
    throw new Error('apphosting.yaml not found');
  }

  const content = fs.readFileSync(yamlPath, 'utf-8');
  const secrets = [];

  // Extract 'secret:' lines
  const secretRegex = /^\s*secret:\s*([A-Z_][A-Z0-9_]*)/gm;
  let match;

  while ((match = secretRegex.exec(content)) !== null) {
    const secretName = match[1].split('@')[0]; // Remove version number if present
    if (!secrets.includes(secretName)) {
      secrets.push(secretName);
    }
  }

  return secrets;
}

/**
 * Check if secret exists in GCP Secret Manager
 */
function secretExists(secretName) {
  try {
    execSync(
      `gcloud secrets describe ${secretName} --project=${PROJECT_ID}`,
      { stdio: 'ignore' }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Get number of versions for a secret
 */
function getSecretVersionCount(secretName) {
  try {
    const output = execSync(
      `gcloud secrets versions list ${secretName} --project=${PROJECT_ID} --format=json`,
      { encoding: 'utf-8' }
    );
    const versions = JSON.parse(output);
    return versions.length;
  } catch {
    return 0;
  }
}

/**
 * Check if secret has Firebase IAM binding
 */
function hasIamBinding(secretName) {
  try {
    const output = execSync(
      `gcloud secrets get-iam-policy ${secretName} --project=${PROJECT_ID} --format=json`,
      { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const policy = JSON.parse(output);
    // Check if Firebase App Hosting service account has access
    return policy.bindings?.some(b =>
      b.members?.some(m => m.includes('firebase-app-hosting-compute') || m.includes('service'))
    ) || false;
  } catch {
    return false;
  }
}

/**
 * Create secret and add version
 */
function createSecret(secretName, value) {
  try {
    console.log(`  Creating secret ${secretName}...`);
    execSync(
      `echo -n "${value.replace(/"/g, '\\"')}" | gcloud secrets create ${secretName} --data-file=- --project=${PROJECT_ID}`,
      { stdio: 'inherit' }
    );
    console.log(`  ✅ Created ${secretName}`);
    return true;
  } catch (err) {
    // Secret might already exist with no versions
    console.log(`  ⚠️  Could not create ${secretName} (may already exist)`);
    return false;
  }
}

/**
 * Add version to existing secret
 */
function addSecretVersion(secretName, value) {
  try {
    console.log(`  Adding version to ${secretName}...`);
    execSync(
      `echo -n "${value.replace(/"/g, '\\"')}" | gcloud secrets versions add ${secretName} --data-file=- --project=${PROJECT_ID}`,
      { stdio: 'inherit' }
    );
    console.log(`  ✅ Added version to ${secretName}`);
    return true;
  } catch (err) {
    console.log(`  ❌ Failed to add version to ${secretName}`);
    return false;
  }
}

/**
 * Grant Firebase App Hosting access to secret
 */
function grantFirebaseAccess(secretName) {
  try {
    console.log(`  Granting Firebase access to ${secretName}...`);
    execSync(
      `firebase apphosting:secrets:grantaccess ${secretName} --backend=${BACKEND}`,
      { stdio: 'inherit' }
    );
    console.log(`  ✅ Granted Firebase access to ${secretName}`);
    return true;
  } catch (err) {
    console.log(`  ⚠️  Could not grant Firebase access (may require manual setup)`);
    return false;
  }
}

/**
 * Format table output
 */
function formatTable(headers, rows) {
  if (rows.length === 0) return 'No data';

  const colWidths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => String(r[i]).length))
  );

  const separator = '┌' + colWidths.map(w => '─'.repeat(w + 2)).join('┬') + '┐';
  const header = '│ ' + headers.map((h, i) => h.padEnd(colWidths[i])).join(' │ ') + ' │';
  const divider = '├' + colWidths.map(w => '─'.repeat(w + 2)).join('┼') + '┤';
  const bottom = '└' + colWidths.map(w => '─'.repeat(w + 2)).join('┴') + '┘';

  const formattedRows = rows.map(row =>
    '│ ' + row.map((r, i) => String(r).padEnd(colWidths[i])).join(' │ ') + ' │'
  );

  return [separator, header, divider, ...formattedRows, bottom].join('\n');
}

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const deploy = process.argv.includes('--deploy');

  console.log(`\n🔐 Secrets Audit — ${PROJECT_ID}\n`);

  try {
    const envLocal = parseEnvLocal();
    const requiredSecrets = parseHostingYaml();

    console.log(`📋 Found ${requiredSecrets.length} secrets in apphosting.yaml\n`);

    // Check each secret
    const rows = [];
    const needsProvisioning = [];

    for (const secret of requiredSecrets) {
      const exists = secretExists(secret);
      const versions = exists ? getSecretVersionCount(secret) : 0;
      const hasBinding = exists ? hasIamBinding(secret) : false;

      const statusIcon = exists ? (versions > 0 ? '✅' : '⚠️ ') : '❌';
      const versionStr = versions > 0 ? String(versions) : '—';
      const bindingIcon = hasBinding ? '✅' : (exists ? '⚠️ ' : '❌');

      rows.push([secret, statusIcon, versionStr, bindingIcon]);

      if (!exists || versions === 0 || !hasBinding) {
        needsProvisioning.push({ secret, exists, versions, hasBinding, value: envLocal[secret] });
      }
    }

    console.log(formatTable(['Secret', 'Exists', 'Versions', 'IAM Bound'], rows));
    console.log();

    // Check for vars in .env.local NOT in apphosting.yaml
    const missingFromYaml = Object.keys(envLocal).filter(
      k => !requiredSecrets.includes(k) && !k.startsWith('NEXT_PUBLIC_') && !k.startsWith('NODE_')
    );

    if (missingFromYaml.length > 0) {
      console.log(`⚠️  ${missingFromYaml.length} variables in .env.local not referenced in apphosting.yaml:`);
      missingFromYaml.forEach(k => console.log(`   ${k}`));
      console.log();
    }

    // Provision if --deploy
    if (deploy && needsProvisioning.length > 0) {
      console.log(`\n🔧 Provisioning ${needsProvisioning.length} missing/incomplete secrets...\n`);
      const provisioningFailures = [];

      for (const item of needsProvisioning) {
        if (!item.value) {
          console.log(`⚠️  Skipping ${item.secret} (no value in .env.local)`);
          provisioningFailures.push({
            secret: item.secret,
            reason: 'missing_env_value',
          });
          continue;
        }

        if (!item.exists) {
          const created = createSecret(item.secret, item.value);
          if (!created) {
            provisioningFailures.push({
              secret: item.secret,
              reason: 'create_failed',
            });
            continue;
          }
        } else if (item.versions === 0) {
          const versionAdded = addSecretVersion(item.secret, item.value);
          if (!versionAdded) {
            provisioningFailures.push({
              secret: item.secret,
              reason: 'add_version_failed',
            });
            continue;
          }
        }

        if (!item.hasBinding) {
          const granted = grantFirebaseAccess(item.secret);
          if (!granted) {
            provisioningFailures.push({
              secret: item.secret,
              reason: 'grant_access_failed',
            });
          }
        }
      }

      if (provisioningFailures.length > 0) {
        console.log('\n❌ Provisioning completed with failures:');
        provisioningFailures.forEach(item => {
          console.log(`   - ${item.secret}: ${item.reason}`);
        });
        console.log('\nRun the failing step(s), then re-run: npm run setup:secrets:deploy\n');
        process.exit(1);
      }

      console.log('\n✅ Provisioning complete!');
      console.log('   Secrets are now ready. Push to Firebase: git push origin main\n');
    } else if (needsProvisioning.length > 0) {
      console.log(`💡 Tip: Run with --deploy to provision ${needsProvisioning.length} missing secret(s)\n`);
    } else {
      console.log('✅ All secrets are configured and ready!\n');
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
