

import { NextResponse } from 'next/server';
import { recommendProducts } from '@/ai/ai-powered-product-recommendations';
import { demoProducts } from '@/lib/data'; // Import demo data

export async function GET() {
  try {
    // This test route now passes the demo products directly into the action,
    // simulating how it would work in a multi-tenant environment where the
    // products would be fetched and scoped to a specific brand.
    const result = await recommendProducts({
      query: 'Recommend a strain for sleep',
      products: demoProducts, 
    });

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
