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

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const params = enrollSchema.parse(body);

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
