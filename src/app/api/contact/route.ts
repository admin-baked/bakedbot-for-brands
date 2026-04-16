export const dynamic = 'force-dynamic';
/**
 * POST /api/contact
 *
 * Public inbound contact form — dispensary owners, brands, partners.
 * No auth required (public page).
 *
 * Actions:
 *   1. Validates + sanitizes input
 *   2. Writes to ny_dispensary_leads (or general_leads) for the outreach queue
 *   3. Notifies Marty via agent_tasks so Craig can draft a reply
 *   4. Rate-limits by email (1 submission per 24 hours)
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const RATE_LIMIT_MS = 24 * 60 * 60 * 1000; // 24 hours per email

const bodySchema = z.object({
    name: z.string().min(1).max(100).trim(),
    email: z.string().email().max(200).toLowerCase().trim(),
    dispensaryName: z.string().max(200).trim().optional(),
    state: z.string().max(50).trim().optional(),
    city: z.string().max(100).trim().optional(),
    message: z.string().max(2000).trim().optional(),
    inquiryType: z.enum(['dispensary', 'brand', 'partnership', 'other']).default('other'),
});

export async function POST(req: NextRequest) {
    try {
        const raw = await req.json().catch(() => null);
        if (!raw) {
            return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
        }

        const parsed = bodySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 422 });
        }

        const data = parsed.data;
        const db = getAdminFirestore();

        // ── Rate limit: 1 submission per email per 24h ─────────────────────
        const cutoff = new Date(Date.now() - RATE_LIMIT_MS);
        const dup = await db.collection('contact_submissions')
            .where('email', '==', data.email)
            .where('submittedAt', '>', cutoff)
            .limit(1)
            .get();

        if (!dup.empty) {
            return NextResponse.json({ success: true, message: 'Thank you — we have your request on file.' });
        }

        const now = new Date().toISOString();

        // ── Save contact submission ────────────────────────────────────────
        const submissionRef = await db.collection('contact_submissions').add({
            ...data,
            source: 'contact_page',
            submittedAt: cutoff,  // intentional — used for rate limit query
            createdAt: now,
            status: 'new',
        });

        // ── If NY dispensary → add to outreach lead queue ─────────────────
        if (data.inquiryType === 'dispensary' && data.state?.toUpperCase() === 'NY' && data.email) {
            const existingLead = await db.collection('ny_dispensary_leads')
                .where('email', '==', data.email)
                .limit(1)
                .get();

            if (existingLead.empty) {
                await db.collection('ny_dispensary_leads').add({
                    dispensaryName: data.dispensaryName || data.name,
                    contactName: data.name,
                    email: data.email,
                    city: data.city || '',
                    state: 'NY',
                    source: 'contact_form',
                    emailVerified: false,  // Apollo will verify on next enrichment run
                    status: 'pending',
                    priority: 'high',     // inbound = higher intent
                    notes: data.message || '',
                    submissionId: submissionRef.id,
                    createdAt: now,
                });
            }
        }

        // ── Notify Marty via agent_tasks so Craig can draft a response ─────
        const taskTitle = `Inbound contact: ${data.name} — ${data.dispensaryName || data.inquiryType}`;
        const existing = await db.collection('agent_tasks')
            .where('title', '==', taskTitle)
            .where('status', '==', 'open')
            .limit(1)
            .get();

        if (existing.empty) {
            await db.collection('agent_tasks').add({
                title: taskTitle,
                body: [
                    `**From:** ${data.name} <${data.email}>`,
                    data.dispensaryName ? `**Dispensary:** ${data.dispensaryName}` : '',
                    data.city || data.state ? `**Location:** ${[data.city, data.state].filter(Boolean).join(', ')}` : '',
                    data.message ? `**Message:** ${data.message}` : '',
                    `**Type:** ${data.inquiryType}`,
                    `**Submission ID:** ${submissionRef.id}`,
                ].filter(Boolean).join('\n'),
                priority: 'high',
                category: 'inbound_lead',
                status: 'open',
                assignedTo: 'craig',
                reportedBy: 'contact_form',
                createdAt: now,
                orgId: 'org_bakedbot_platform',
                tags: ['inbound', data.inquiryType, data.state || 'unknown'],
                action: 'craig_draft_response',
            });
        }

        await logger.info('[Contact] New inbound submission', {
            name: data.name,
            email: data.email,
            dispensary: data.dispensaryName,
            type: data.inquiryType,
            submissionId: submissionRef.id,
        });

        return NextResponse.json({ success: true, message: 'Got it — expect a reply within 24 hours.' });

    } catch (err) {
        await logger.error('[Contact] Submission failed', { error: String(err) });
        return NextResponse.json({ error: 'Something went wrong. Please email us directly at sales@bakedbot.ai' }, { status: 500 });
    }
}
