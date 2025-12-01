// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';

import { logger } from '@/lib/logger';
export async function POST(request: NextRequest) {
    try {
        const { idToken } = await request.json();

        if (!idToken) {
            return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
        }
        { error: 'Failed to create session' },
        { status: 401 }
        );
    }
}

export async function DELETE() {
    cookies().delete('__session');
    return NextResponse.json({ success: true });
}
