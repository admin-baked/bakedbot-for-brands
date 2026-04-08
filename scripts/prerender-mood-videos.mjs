#!/usr/bin/env node

/**
 * Pre-render Remotion mood videos for an org.
 *
 * Generates 7 branded videos (one per mood) and caches them in Firestore.
 * The tablet flow then serves the cached URL instantly instead of rendering
 * on every mood tap.
 *
 * Usage:
 *   node scripts/prerender-mood-videos.mjs --orgId org_thrive_syracuse
 *   node scripts/prerender-mood-videos.mjs --orgId org_thrive_syracuse --force
 *
 * Options:
 *   --orgId   Required. Organization to pre-render for.
 *   --force   Re-render even if a cached version exists with matching brand hash.
 */

import { register } from 'tsx/esm/api';

const unregister = register();

const { prerenderAllMoodVideos } = await import(
    '../src/server/services/loyalty/mood-video-cache.ts'
);

const args = process.argv.slice(2);
const orgIdIdx = args.indexOf('--orgId');
const orgId = orgIdIdx >= 0 ? args[orgIdIdx + 1] : undefined;
const force = args.includes('--force');

if (!orgId) {
    console.error('Usage: node scripts/prerender-mood-videos.mjs --orgId <orgId> [--force]');
    process.exit(1);
}

console.log(`\nPre-rendering mood videos for ${orgId}${force ? ' (force)' : ''}...\n`);

try {
    const result = await prerenderAllMoodVideos(orgId, { force });
    console.log(`\nDone.`);
    console.log(`  Rendered: ${result.rendered}`);
    console.log(`  Skipped:  ${result.skipped}`);
    if (result.errors.length > 0) {
        console.log(`  Errors:   ${result.errors.length}`);
        for (const err of result.errors) {
            console.log(`    - ${err}`);
        }
    }
    process.exit(result.errors.length > 0 ? 1 : 0);
} catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
} finally {
    unregister();
}
