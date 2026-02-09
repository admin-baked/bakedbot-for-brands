import { NextRequest, NextResponse } from 'next/server';
import { getAdminFirestore } from '@/firebase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: { certificateId: string } }
) {
  try {
    const { certificateId } = params;

    const db = getAdminFirestore();
    const certDoc = await db.collection('academy_certificates').doc(certificateId).get();

    if (!certDoc.exists) {
      return new NextResponse('Certificate not found', { status: 404 });
    }

    const certData = certDoc.data();
    const certificateHtml = certData?.certificateHtml;

    if (!certificateHtml) {
      return new NextResponse('Certificate HTML not found', { status: 404 });
    }

    // Return HTML that can be printed to PDF
    return new NextResponse(certificateHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('Error fetching certificate:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
