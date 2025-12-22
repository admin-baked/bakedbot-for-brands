import { NextRequest, NextResponse } from 'next/server';
import { getAuthUrl } from '@/server/integrations/gmail/oauth';
import { getServerSessionUser } from '@/server/auth/auth'; // Hypothetical - check auth.ts

export async function GET(req: NextRequest) {
    // Optionally check if user is logged in
    // const user = await getServerSessionUser();
    // if (!user) return NextResponse.redirect(new URL('/login', req.url));

    // We can pass state (e.g., return URL or random token)
    // For now, let's keep it simple.
    const url = getAuthUrl();
    return NextResponse.redirect(url);
}
