
import { NextRequest, NextResponse } from 'next/server';

// Mark dynamic so Next doesn't try to pre-render anything weird here
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  let body: unknown = null;

  try {
    body = await req.json().catch(() => null);
  } catch {
    // ignore parse errors, we just want the route to be robust
  }

  return NextResponse.json(
    {
      ok: true,
      message: 'Agent dispatch stub is alive.',
      received: body,
    },
    { status: 200 },
  );
}
