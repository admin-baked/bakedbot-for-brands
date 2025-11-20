// src/app/api/brands/[brandId]/availability/route.ts
import { NextRequest, NextResponse } from "next/server";

interface AvailabilityParams {
  params: {
    brandId: string;
  };
}

// GET /api/brands/:brandId/availability
// Query params: lat, lng, radius_km, state, limit_per_sku
export async function GET(req: NextRequest, { params }: AvailabilityParams) {
  const { brandId } = params;
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const radius_km = searchParams.get('radius_km');
  const state = searchParams.get('state');
  const limit_per_sku = searchParams.get('limit_per_sku');

  // --- STUB IMPLEMENTATION ---
  // In a real implementation, this would query the `availability` and `dispensaries`
  // collections in Firestore, filter by geo/state, and group by SKU.
  // For now, we return a hard-coded example response.
  
  const stubResponse = {
    brand_id: brandId,
    skus: [
      {
        sku_id: "sku_40tons_gg4_3_5g",
        name: "Gorilla Glue #4 3.5g",
        category: "Flower",
        size: "3.5g",
        offers: [
          {
            dispensary_id: "disp_ultra_detroit",
            dispensary_name: "Ultra Cannabis Detroit",
            state: "MI",
            city: "Detroit",
            price: 45.0,
            sale_price: 40.0,
            distance_km: lat && lng ? 3.2 : null, // Example distance
          },
          {
            dispensary_id: "disp_another",
            dispensary_name: "Other Shop",
            state: "MI",
            city: "Detroit",
            price: 47.0,
            sale_price: null,
            distance_km: lat && lng ? 5.1 : null,
          }
        ].slice(0, Number(limit_per_sku) || 5)
      }
    ]
  };

  return NextResponse.json(stubResponse);
}
