/**
 * Slack Digest Service
 *
 * Buffers daily Slack sections into a Firestore document and flushes them
 * as a single Block Kit message at the org's configured digest time.
 *
 * Firestore collection: slack_digest_buffer
 * Document ID: {orgId}_{YYYY-MM-DD}
 *
 * Called by:
 *   - Cron handlers (via bufferDigestSection) when gate returns digestMode: true
 *   - /api/cron/playbooks/daily (via flushAllPendingDigests) to send merged messages
 */

import type { Firestore } from 'firebase-admin/firestore';
import { FieldValue } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';
import type { DigestBufferDoc, DigestSection } from '@/types/notification-preferences';
import { loadOrgSlackPrefs } from './slack-notification-gate';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayDateString(timezone: string): string {
    return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date());
}

function digestDocId(orgId: string, date: string): string {
    return `${orgId}_${date}`;
}

// ---------------------------------------------------------------------------
// Buffer a section into today's digest doc
// ---------------------------------------------------------------------------

/**
 * Append a section to the org's digest buffer for today.
 * Creates the buffer document if it doesn't exist yet.
 */
export async function bufferDigestSection(
    orgId: string,
    key: string,
    title: string,
    blocks: Record<string, unknown>[],
    channel: string,
    firestore: Firestore,
): Promise<void> {
    try {
        const prefs = await loadOrgSlackPrefs(orgId, firestore);
        const date = todayDateString(prefs.digestTimezone);
        const docId = digestDocId(orgId, date);
        const ref = firestore.collection('slack_digest_buffer').doc(docId);

        const section: DigestSection = {
            key,
            title,
            blocks,
            addedAt: new Date().toISOString(),
        };

        // Two-step write: ensure doc exists, then set section by key (idempotent on cron rerun)
        await ref.set(
            {
                orgId,
                date,
                channel,
                flushed: false,
                updatedAt: new Date().toISOString(),
                createdAt: FieldValue.serverTimestamp(),
            },
            { merge: true },
        );
        await ref.update({ [`sections.${key}`]: section });

        logger.info('[SlackDigest] Buffered section', { orgId, key, date });
    } catch (err) {
        logger.error('[SlackDigest] Failed to buffer section', { orgId, key, error: String(err) });
    }
}

// ---------------------------------------------------------------------------
// Flush a single org's digest
// ---------------------------------------------------------------------------

/**
 * Read the org's unflushed digest for today, post as a single Block Kit message,
 * and mark the document as flushed.
 */
export async function flushDigest(
    orgId: string,
    firestore: Firestore,
    slackSvc: { postMessage: (channel: string, text: string, blocks?: unknown[]) => Promise<{ sent: boolean; ts?: string; error?: string }> },
): Promise<void> {
    try {
        const prefs = await loadOrgSlackPrefs(orgId, firestore);
        const date = todayDateString(prefs.digestTimezone);
        const docId = digestDocId(orgId, date);
        const ref = firestore.collection('slack_digest_buffer').doc(docId);
        const snap = await ref.get();

        if (!snap.exists) {
            logger.info('[SlackDigest] No buffer for today', { orgId, date });
            return;
        }

        const doc = snap.data() as DigestBufferDoc;
        if (doc.flushed) {
            logger.info('[SlackDigest] Already flushed', { orgId, date });
            return;
        }

        const sectionValues = Object.values(doc.sections ?? {});
        if (!sectionValues.length) {
            logger.info('[SlackDigest] Empty digest buffer', { orgId, date });
            await ref.update({ flushed: true, flushedAt: new Date().toISOString() });
            return;
        }

        const channel = doc.channel ?? prefs.defaultChannel;
        const dateLabel = new Date().toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            timeZone: prefs.digestTimezone,
        });

        // Build merged Block Kit message
        const blocks: Record<string, unknown>[] = [
            {
                type: 'header',
                text: {
                    type: 'plain_text',
                    text: `🌿 Daily Digest — ${dateLabel}`,
                    emoji: true,
                },
            },
        ];

        // Sort sections by addedAt so briefing always appears before competitive intel
        const sorted = [...sectionValues].sort(
            (a, b) => new Date(a.addedAt).getTime() - new Date(b.addedAt).getTime(),
        );

        for (const section of sorted) {
            blocks.push({ type: 'divider' });
            blocks.push({
                type: 'section',
                text: { type: 'mrkdwn', text: `*${section.title}*` },
            });
            blocks.push(...section.blocks);
        }

        blocks.push({ type: 'divider' });
        blocks.push({
            type: 'context',
            elements: [
                {
                    type: 'mrkdwn',
                    text: `_BakedBot AI · Daily Digest · ${sorted.map(s => s.title).join(' · ')}_`,
                },
            ],
        });

        const fallbackText = `🌿 Daily Digest — ${dateLabel} (${sorted.length} updates)`;
        const result = await slackSvc.postMessage(channel, fallbackText, blocks);

        if (result.sent) {
            await ref.update({ flushed: true, flushedAt: new Date().toISOString() });
            logger.info('[SlackDigest] Flushed successfully', { orgId, date, ts: result.ts, sections: sorted.length });
        } else {
            logger.error('[SlackDigest] Slack post failed', { orgId, date, error: result.error });
        }
    } catch (err) {
        logger.error('[SlackDigest] Flush error', { orgId, error: String(err) });
    }
}

// ---------------------------------------------------------------------------
// Flush all pending digests (called by playbooks/daily cron)
// ---------------------------------------------------------------------------

/**
 * Find all unflushed digest buffers for today across all orgs and flush them.
 * Designed to run inside the existing daily playbook cron — no new Cloud Scheduler job.
 */
export async function flushAllPendingDigests(
    firestore: Firestore,
    slackSvc: { postMessage: (channel: string, text: string, blocks?: unknown[]) => Promise<{ sent: boolean; ts?: string; error?: string }> },
): Promise<{ flushed: number; errors: number }> {
    let flushed = 0;
    let errors = 0;

    try {
        // No date filter — org timezones mean UTC date may differ from the buffered date.
        // flushDigest handles per-org date resolution; here we just find anything not yet flushed.
        const snap = await firestore
            .collection('slack_digest_buffer')
            .where('flushed', '==', false)
            .get();

        if (snap.empty) {
            logger.info('[SlackDigest] No pending digests to flush');
            return { flushed: 0, errors: 0 };
        }

        const orgIds = [...new Set(snap.docs.map(d => (d.data() as DigestBufferDoc).orgId))];
        logger.info('[SlackDigest] Flushing pending digests', { count: orgIds.length });

        await Promise.allSettled(
            orgIds.map(async orgId => {
                try {
                    await flushDigest(orgId, firestore, slackSvc);
                    flushed++;
                } catch {
                    errors++;
                }
            }),
        );
    } catch (err) {
        logger.error('[SlackDigest] flushAllPendingDigests error', { error: String(err) });
        errors++;
    }

    return { flushed, errors };
}
