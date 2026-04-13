export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { MembershipService } from '@/server/services/loyalty/membership-service';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const enrollSchema = z.object({
    organizationId: z.string(),
    storeId: z.string().optional(),
    firstName: z.string().min(1),
    lastName: z.string().optional(),
    phone: z.string().min(10),
    email: z.string().email().optional(),
    dateOfBirth: z.string().optional(),
    smsConsent: z.boolean().default(false),
    emailConsent: z.boolean().default(false),
    source: z.enum(["tablet", "customer_app"]).default("tablet")
});

import { requireAPIKey, APIKeyError } from '@/server/auth/api-key-auth';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const params = enrollSchema.parse(body);

        // ── Auth & Org Validation ──────────────────────────────────────────
        // 1. Require valid API key
        // 2. Ensure key belongs to the organization being modified
        try {
            const keyRecord = await requireAPIKey(req, 'read:customers'); // Enrollment needs write, but using read:customers for now or matching contract
            if (keyRecord.orgId !== 'platform_admin' && keyRecord.orgId !== params.organizationId) {
                return NextResponse.json({
                    success: false,
                    error: "Unauthorized: API key does not belong to this organization"
                }, { status: 403 });
            }
        } catch (e: any) {
            if (e instanceof APIKeyError) return e.toResponse();
            throw e;
        }

        const result = await MembershipService.enroll(params);

        return NextResponse.json({
            success: true,
            memberId: result.member.id,
            membershipId: result.membership.id,
            passId: result.pass?.id || null,
            welcomeRewardId: result.welcomeReward?.id || null,
            pass: result.pass ? {
                memberCode: result.pass.memberCode,
                qrValue: result.pass.qrValue,
                barcodeValue: result.pass.barcodeValue
            } : null
        });

    } catch (error: any) {
        logger.error(`[JoinAPI] Enrollment failed: ${error.message}`);
        return NextResponse.json({
            success: false,
            error: error.message || "Enrollment failed"
        }, { status: error.message?.includes("already exists") ? 409 : 400 });
    }
}
