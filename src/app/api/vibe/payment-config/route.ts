import { NextResponse } from 'next/server';
import { getPaymentConfig } from '@/app/vibe/beta/payment-actions';

export async function GET() {
  try {
    const config = await getPaymentConfig();
    return NextResponse.json(config);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to get payment configuration' },
      { status: 500 }
    );
  }
}
