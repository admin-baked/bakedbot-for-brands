// src/app/api/cannmenus/brands/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // TODO: wire this to Firestore when ready.
  // For now, just return an empty list so the menu layout can build.
  return NextResponse.json({
    brands: [],
  });
}
