#!/usr/bin/env node
/**
 * Shared utilities for BakedBot provisioning scripts.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

// ── CLI logging ───────────────────────────────────────────────────────────────
export function log(msg) { console.log(msg); }
export function step(msg) { console.log(`\n▶ ${msg}`); }
export function ok(msg) { console.log(`  ✅ ${msg}`); }
export function warn(msg) { console.log(`  ⚠️  ${msg}`); }
export function dry(msg) { console.log(`  [DRY-RUN] ${msg}`); }

// ── Cloudflare API ────────────────────────────────────────────────────────────
export async function cfFetch(apiPath, opts = {}) {
    const res = await fetch(`https://api.cloudflare.com/client/v4${apiPath}`, {
        ...opts,
        headers: {
            'Authorization': `Bearer ${process.env.CLOUDFLARE_API_TOKEN}`,
            'Content-Type': 'application/json',
            ...opts.headers,
        },
        body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    const json = await res.json();
    if (!json.success) throw new Error(json.errors?.map(e => e.message).join(', ') || 'Cloudflare API error');
    return json;
}

export async function ensureMxRecord(subdomain) {
    const zoneId = process.env.CLOUDFLARE_ZONE_ID;
    const MX_VALUE = 'inbound-smtp.us-east-1.amazonaws.com';
    const list = await cfFetch(`/zones/${zoneId}/dns_records?type=MX&name=${subdomain}`);
    if (list.result?.find(r => r.content === MX_VALUE)) {
        ok(`MX already exists: ${subdomain}`);
        return;
    }
    await cfFetch(`/zones/${zoneId}/dns_records`, {
        method: 'POST',
        body: { type: 'MX', name: subdomain, content: MX_VALUE, priority: 10, ttl: 1 },
    });
    ok(`MX created: ${subdomain} → ${MX_VALUE}`);
}

// ── AWS clients ───────────────────────────────────────────────────────────────
export function awsCredentials() {
    return {
        accessKeyId: process.env.AWS_SES_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SES_SECRET_ACCESS_KEY,
    };
}
