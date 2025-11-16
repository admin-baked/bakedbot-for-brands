

import { NextResponse } from 'next/server';
import { recommendProducts } from '@/ai/ai-powered-product-recommendations';

export async function GET() {
  try {
    // This test route now calls the action with a brandId, simulating a
    // multi-tenant request. The action itself handles fetching the products.
    const result = await recommendProducts({
      query: 'Recommend a strain for sleep',
      brandId: 'default', 
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
