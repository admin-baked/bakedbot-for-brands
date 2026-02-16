/**
 * Delivery Fee Calculation API Route
 *
 * POST /api/delivery/calculate-fee
 * Calculates delivery fee based on address and validates against minimum order
 */

import { NextRequest, NextResponse } from 'next/server';
import { calculateDeliveryFee } from '@/server/actions/delivery';
import { logger } from '@/lib/logger';
import type { ShippingAddress } from '@/types/orders';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface CalculateFeeRequest {
    locationId: string;
    address: ShippingAddress;
    subtotal: number;
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as CalculateFeeRequest;

        // Validate input
        if (!body.locationId || !body.address || typeof body.subtotal !== 'number') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: locationId, address, subtotal',
                },
                { status: 400 }
            );
        }

        // Validate address fields
        if (!body.address.street || !body.address.city || !body.address.state || !body.address.zip) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Incomplete address: street, city, state, and zip are required',
                },
                { status: 400 }
            );
        }

        // Validate NY state (only NY deliveries allowed per NY OCM)
        if (body.address.state.toUpperCase() !== 'NY') {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Delivery is only available in New York State',
                },
                { status: 400 }
            );
        }

        // Calculate delivery fee
        const result = await calculateDeliveryFee(body.address, body.locationId, body.subtotal);

        if (!result.success) {
            logger.error('Fee calculation failed', { error: result.error, locationId: body.locationId });
            return NextResponse.json(
                {
                    success: false,
                    error: result.error || 'Failed to calculate delivery fee',
                },
                { status: 400 }
            );
        }

        const { calculation } = result;

        // Check if order meets minimum
        if (!calculation?.meetsMinimum) {
            return NextResponse.json({
                success: false,
                error: `Minimum order of $${calculation?.minimumOrder.toFixed(2)} required for delivery to this area`,
                calculation,
            });
        }

        logger.info('Delivery fee calculated', {
            locationId: body.locationId,
            zone: calculation.zone.name,
            fee: calculation.deliveryFee,
        });

        return NextResponse.json({
            success: true,
            calculation,
        });
    } catch (error) {
        logger.error('Delivery fee calculation error', { error });
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : 'Internal server error',
            },
            { status: 500 }
        );
    }
}
