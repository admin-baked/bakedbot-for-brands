
// app/api/cannmenus/brands/route.ts
import { NextResponse } from 'next/server';

const CANNMENUS_API_BASE = process.env.CANNMENUS_API_BASE ?? '';
const CANNMENUS_API_KEY = process.env.CANNMENUS_API_KEY ?? '';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const q = searchParams.get('q') || '';

  if (!q) {
    return NextResponse.json({ brands: [] });
  }

  // If you don’t want to hit live CannMenus yet, you can short-circuit here with mock data.
  if (!CANNMENUS_API_BASE || !CANNMENUS_API_KEY) {
    return NextResponse.json({
      brands: [
        { id: 'demo-ultra', name: 'Ultra Cannabis', market: 'IL' },
        { id: 'demo-zaza', name: 'Zaza Lifts', market: 'MI' },
      ],
    });
  }

  try {
    const resp = await fetch(
      `${CANNMENUS_API_BASE}/brands?query=${encodeURIComponent(q)}`,
      {
        headers: {
          Authorization: `Bearer ${CANNMENUS_API_KEY}`,
        },
      },
    );

    if (!resp.ok) {
      console.error('CannMenus error', resp.status, await resp.text());
      return NextResponse.json({ brands: [] }, { status: 200 });
    }

    const data = await resp.json();

    // Normalize to a shape your UI expects
    const brands = data.brands?.map((b: any) => ({
      id: b.id,
      name: b.name,
      market: b.market ?? b.state ?? null,
    }));

    return NextResponse.json({ brands });
  } catch (err) {
    console.error('CannMenus fetch failed', err);
    return NextResponse.json({ brands: [] }, { status: 200 });
  }
}
