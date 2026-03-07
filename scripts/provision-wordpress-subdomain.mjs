/**
 * Provision an internal bakedbot.ai subdomain for a WordPress-backed site.
 *
 * Usage:
 *   node scripts/provision-wordpress-subdomain.mjs <tenantId> <domain> <upstreamUrl> [targetName]
 *
 * Example:
 *   node scripts/provision-wordpress-subdomain.mjs brand_XHmqB7RY andrewsdevelopments.bakedbot.ai https://andrews-wp-lo74oftdza-uc.a.run.app "Andrews Developments"
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function loadServiceAccount() {
  const candidates = [
    path.join(__dirname, '..', 'service-account.json'),
    path.join(__dirname, '..', 'firebase-service-account.json'),
  ];

  for (const filePath of candidates) {
    if (!fs.existsSync(filePath)) continue;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  }

  throw new Error(`No service account file found. Looked for: ${candidates.join(', ')}`);
}

function assertHttpsUrl(value) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`Invalid upstream URL: ${value}`);
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(`Upstream URL must use http or https: ${value}`);
  }

  return parsed.toString().replace(/\/+$/, '');
}

function normalizeDomain(value) {
  const domain = value.trim().toLowerCase();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(domain)) {
    throw new Error(`Invalid domain: ${value}`);
  }
  return domain;
}

function compact(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entryValue]) => entryValue !== undefined)
  );
}

async function lookupPrimaryEmail(db, tenantId) {
  const queryPaths = [
    ['currentOrgId', '==', tenantId],
    ['tenantId', '==', tenantId],
    ['brandId', '==', tenantId],
    ['organizationId', '==', tenantId],
    ['orgId', '==', tenantId],
  ];

  for (const [field, op, value] of queryPaths) {
    const snap = await db.collection('users').where(field, op, value).limit(1).get();
    if (!snap.empty) {
      const email = snap.docs[0].data().email;
      if (typeof email === 'string' && email.trim()) {
        return email.trim().toLowerCase();
      }
    }
  }

  return undefined;
}

async function ensureTenantDoc(db, tenantId, domain, fallbackName) {
  const tenantRef = db.collection('tenants').doc(tenantId);
  const [tenantSnap, orgSnap, brandSnap] = await Promise.all([
    tenantRef.get(),
    db.collection('organizations').doc(tenantId).get(),
    db.collection('brands').doc(tenantId).get(),
  ]);

  if (tenantSnap.exists) {
    return tenantSnap.data();
  }

  const org = orgSnap.exists ? orgSnap.data() : null;
  const brand = brandSnap.exists ? brandSnap.data() : null;
  const email = await lookupPrimaryEmail(db, tenantId);
  const now = admin.firestore.FieldValue.serverTimestamp();

  const tenantData = compact({
    id: tenantId,
    name: org?.name || brand?.name || fallbackName,
    type: org?.type || 'brand',
    email: email || undefined,
    website: `https://${domain}`,
    createdAt: org?.createdAt || now,
    updatedAt: now,
    settings: org?.settings || undefined,
    planId: org?.billing?.planId || undefined,
    subscriptionStatus: org?.billing?.subscriptionStatus || undefined,
  });

  await tenantRef.set(tenantData, { merge: true });
  return tenantData;
}

async function provisionWordPressSubdomain(tenantId, domain, upstreamUrl, targetName) {
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(loadServiceAccount()),
      projectId: 'studio-567050101-bc6e8',
    });
  }

  const db = admin.firestore();
  const normalizedDomain = normalizeDomain(domain);
  const normalizedUpstream = assertHttpsUrl(upstreamUrl);
  const displayName = targetName?.trim() || normalizedDomain.split('.')[0];
  const domainRef = db.collection('tenants').doc(tenantId).collection('domains').doc(normalizedDomain);
  const existingDomainSnap = await domainRef.get();
  const existingDomain = existingDomainSnap.exists ? existingDomainSnap.data() : null;

  console.log(`\nProvisioning WordPress subdomain`);
  console.log(`  tenantId: ${tenantId}`);
  console.log(`  domain: ${normalizedDomain}`);
  console.log(`  upstream: ${normalizedUpstream}`);

  const tenantData = await ensureTenantDoc(db, tenantId, normalizedDomain, displayName);
  const now = admin.firestore.FieldValue.serverTimestamp();
  const verificationToken = `managed_internal_${normalizedDomain.replace(/[^a-z0-9]/g, '_')}`;

  const domainDoc = compact({
    domain: normalizedDomain,
    connectionType: 'cname',
    targetType: 'wordpress_site',
    targetName: displayName,
    targetConfig: {
      upstreamUrl: normalizedUpstream,
    },
    verificationStatus: 'verified',
    verificationToken,
    verifiedAt: now,
    lastCheckAt: now,
    updatedAt: now,
    createdAt: existingDomain?.createdAt || now,
    sslStatus: 'pending',
  });

  const mappingDoc = {
    domain: normalizedDomain,
    tenantId,
    connectionType: 'cname',
    targetType: 'wordpress_site',
    targetName: displayName,
    targetConfig: {
      upstreamUrl: normalizedUpstream,
    },
    verifiedAt: now,
  };

  await domainRef.set(domainDoc, { merge: true });
  await db.collection('domain_mappings').doc(normalizedDomain).set(mappingDoc, { merge: true });

  console.log(`\nDone.`);
  console.log(`  tenant name: ${tenantData?.name || displayName}`);
  console.log(`  routing host: https://${normalizedDomain}`);
  console.log(`  DNS record: CNAME ${normalizedDomain.split('.')[0]} -> bakedbot.ai`);
  console.log(`  Notes: a wildcard '*.bakedbot.ai' -> bakedbot.ai is the scalable setup for future sites.`);
}

const tenantId = process.argv[2];
const domain = process.argv[3];
const upstreamUrl = process.argv[4];
const targetName = process.argv[5];

if (!tenantId || !domain || !upstreamUrl) {
  console.error('Usage: node scripts/provision-wordpress-subdomain.mjs <tenantId> <domain> <upstreamUrl> [targetName]');
  process.exit(1);
}

provisionWordPressSubdomain(tenantId, domain, upstreamUrl, targetName)
  .catch((error) => {
    console.error('\nFailed to provision WordPress subdomain.');
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
