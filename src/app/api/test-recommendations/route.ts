

import { NextResponse } from 'next/server';
import { recommendProducts } from '@/ai/ai-powered-product-recommendations';

export async function GET() {
  try {
    const result = await recommendProducts({
      query: 'Recommend a strain for sleep',
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

