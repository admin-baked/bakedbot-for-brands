import { NextRequest, NextResponse } from 'next/server';
import { monitorInventoryAge } from '@/server/services/alleaves/inventory-intelligence';

/**
 * GET /api/inventory/intelligence
 *
 * Fetches inventory intelligence data from Alleaves including:
 * - Expiring inventory
 * - Slow-moving products
 * - Clearance recommendations
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orgId = searchParams.get('orgId');

    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      );
    }

    // Fetch inventory intelligence from Alleaves
    const result = await monitorInventoryAge(orgId);

    return NextResponse.json(result);
  } catch (error) {
    console.error('[API] Inventory intelligence error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory intelligence' },
      { status: 500 }
    );
  }
}
