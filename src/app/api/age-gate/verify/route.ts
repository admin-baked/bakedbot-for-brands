/**
 * Age Gate Verification API Endpoint
 *
 * Public endpoint for the standalone age gate embed widget.
 * Handles age verification and optional email/phone capture.
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyAgeForGate, checkStateAllowed } from '@/server/actions/age-verification';
import { captureEmailLead } from '@/server/actions/email-capture';
import { logger } from '@/lib/logger';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// CORS headers for embed widget
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*', // Allow all origins for embed
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: CORS_HEADERS });
}

interface VerifyRequest {
    dateOfBirth: string; // ISO date string (YYYY-MM-DD)
    state?: string;
    email?: string;
    phone?: string;
    firstName?: string;
    emailConsent?: boolean;
    smsConsent?: boolean;
    brandId?: string;
    dispensaryId?: string;
    source: string;
}

export async function POST(request: NextRequest) {
    try {
        const body: VerifyRequest = await request.json();

        const {
            dateOfBirth,
            state = 'IL',
            email,
            phone,
            firstName,
            emailConsent = false,
            smsConsent = false,
            brandId,
            dispensaryId,
            source
        } = body;

        // Validate required fields
        if (!dateOfBirth) {
            return NextResponse.json(
                { success: false, error: 'Date of birth is required' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        if (!source) {
            return NextResponse.json(
                { success: false, error: 'Source is required' },
                { status: 400, headers: CORS_HEADERS }
            );
        }

        // Check if state allows cannabis sales and verify age
        const ageCheck = await verifyAgeForGate(dateOfBirth, state);

        if (!ageCheck.allowed) {
            return NextResponse.json(
                {
                    success: false,
                    error: ageCheck.reason || `You must be at least ${ageCheck.minAge} years old`,
                    ageVerified: false,
                    stateBlocked: ageCheck.stateBlocked
                },
                { status: 403, headers: CORS_HEADERS }
            );
        }

        // Capture email lead if provided (async, don't block verification)
        if (email || phone) {
            captureEmailLead({
                email,
                phone,
                firstName,
                emailConsent,
                smsConsent,
                brandId,
                dispensaryId,
                state,
                source,
                ageVerified: true,
                dateOfBirth,
            }).catch(err => {
                logger.error('[AgeGateAPI] Failed to capture lead', {
                    error: err.message,
                    email,
                    phone,
                });
            });
        }

        logger.info('[AgeGateAPI] Age verified successfully', {
            state,
            minAge: ageCheck.minAge,
            emailCaptured: !!email,
            phoneCaptured: !!phone,
            source,
        });

        return NextResponse.json(
            {
                success: true,
                ageVerified: true,
                minAge: ageCheck.minAge,
                message: 'Age verified successfully'
            },
            { headers: CORS_HEADERS }
        );
    } catch (error: unknown) {
        const err = error as Error;
        logger.error('[AgeGateAPI] Error verifying age', {
            error: err.message,
        });

        return NextResponse.json(
            { success: false, error: 'Failed to verify age. Please try again.' },
            { status: 500, headers: CORS_HEADERS }
        );
    }
}
