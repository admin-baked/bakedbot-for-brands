export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { Firestore } from '@google-cloud/firestore';
import { Member, Membership, Pass, Reward } from '@/types/club';
import { logger } from '@/lib/logger';

import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const phone = searchParams.get('phone')?.replace(/\D/g, '');
        const memberId = searchParams.get('memberId');

        if (!phone && !memberId) {
            return NextResponse.json({ success: false, error: "Phone or Member ID required" }, { status: 400 });
        }

        // ── Auth Validation (Key only first) ────────────────────────────────
        let keyRecord;
        try {
            keyRecord = await requireAPIKey(req, 'read:customers');
        } catch (e: any) {
            if (e instanceof APIKeyError) return e.toResponse();
            throw e;
        }

        const db = new Firestore();
        let memberDoc;

        if (memberId) {
            memberDoc = await db.collection('members').doc(memberId).get();
        } else {
            const snap = await db.collection('members')
                .where('phone', '==', phone)
                .limit(1)
                .get();
            memberDoc = !snap.empty ? snap.docs[0] : null;
        }

        if (!memberDoc || !memberDoc.exists) {
            return NextResponse.json({ success: false, error: "Member not found" }, { status: 404 });
        }

        const member = memberDoc.data() as Member;
        const orgId = member.organizationId;

        // ── Org Validation ──────────────────────────────────────────────────
        if (keyRecord.orgId !== 'platform_admin' && keyRecord.orgId !== orgId) {
            return NextResponse.json({
                success: false,
                error: "Unauthorized: API key does not belong to this member's organization"
            }, { status: 403 });
        }

        // Fetch Membership, Pass, and Rewards
        const [mshipSnap, passSnap, rewardsSnap] = await Promise.all([
            db.collection('memberships').where('memberId', '==', member.id).where('organizationId', '==', orgId).limit(1).get(),
            db.collection('passes').where('memberId', '==', member.id).where('organizationId', '==', orgId).limit(1).get(),
            db.collection('rewards').where('memberId', '==', member.id).where('status', '==', 'available').get()
        ]);

        return NextResponse.json({
            success: true,
            member,
            membership: !mshipSnap.empty ? mshipSnap.docs[0].data() as Membership : null,
            pass: !passSnap.empty ? passSnap.docs[0].data() as Pass : null,
            rewards: rewardsSnap.docs.map(doc => doc.data() as Reward)
        });

    } catch (error: any) {
        logger.error(`[LoyaltyLookup] Failed to fetch member profile: ${error.message}`);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
