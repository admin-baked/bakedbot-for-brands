
import { NextResponse } from 'next/server';
import { fixEssexApothecary } from '@/server/actions/admin/fix-essex';

export async function GET() {
    try {
        const result = await fixEssexApothecary();
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
