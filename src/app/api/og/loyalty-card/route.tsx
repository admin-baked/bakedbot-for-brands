/**
 * GET /api/og/loyalty-card?name=&points=&tier=&brand=&color=&id=
 * Returns a branded loyalty card PNG for SMS/email delivery.
 * Uses next/og Edge runtime — no AI image restrictions.
 */
import { ImageResponse } from 'next/og';
import { NextRequest } from 'next/server';
import { LOYALTY_TIER_COLORS } from '@/lib/constants/loyalty';

export const runtime = 'edge';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const name = searchParams.get('name') || 'Member';
  const points = parseInt(searchParams.get('points') || '0', 10);
  const tier = searchParams.get('tier') || 'Silver';
  const brandName = searchParams.get('brand') || 'Rewards';
  const color = searchParams.get('color') || '#16a34a';
  const loyaltyId = searchParams.get('id') || '';

  const tierColor = LOYALTY_TIER_COLORS[tier] || color;

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          width: '600px',
          height: '340px',
          borderRadius: '20px',
          overflow: 'hidden',
          fontFamily: 'sans-serif',
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          color: '#fff',
          padding: '0',
        }}
      >
        {/* Header strip */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '24px 32px 16px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '22px', fontWeight: 700, letterSpacing: '-0.5px' }}>
              {brandName}
            </span>
            <span style={{ fontSize: '13px', opacity: 0.8, marginTop: '2px' }}>
              Loyalty Rewards
            </span>
          </div>
          {/* Tier badge */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'rgba(255,255,255,0.2)',
              borderRadius: '20px',
              padding: '6px 16px',
              border: `2px solid ${tierColor}`,
            }}
          >
            <span style={{ fontSize: '14px', fontWeight: 700, color: tierColor }}>
              {tier.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Points */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            flex: 1,
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '72px', fontWeight: 800, lineHeight: 1 }}>
            {points.toLocaleString()}
          </span>
          <span style={{ fontSize: '16px', opacity: 0.85, marginTop: '6px', letterSpacing: '2px' }}>
            POINTS
          </span>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            padding: '16px 32px 24px',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{ fontSize: '18px', fontWeight: 600 }}>{name}</span>
            {loyaltyId && (
              <span style={{ fontSize: '11px', opacity: 0.7, marginTop: '2px', letterSpacing: '1px' }}>
                ID: {loyaltyId}
              </span>
            )}
          </div>
          <span style={{ fontSize: '11px', opacity: 0.6 }}>Powered by BakedBot AI</span>
        </div>
      </div>
    ),
    {
      width: 600,
      height: 340,
    }
  );
}
