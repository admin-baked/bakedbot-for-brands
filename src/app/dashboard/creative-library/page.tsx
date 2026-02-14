/**
 * Creative Asset Library Page
 *
 * Browse and generate AI creative assets for cannabis brands
 */

// EMERGENCY BUILD FIX: Force dynamic rendering to prevent OOM during build
// With 204 pages, pre-rendering all at once requires >64GB memory
// This line forces on-demand generation instead
export const dynamic = 'force-dynamic';
export const dynamicParams = true;
export const revalidate = 0;

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { CreativeLibraryClient } from './creative-library-client';

export const metadata = {
  title: 'Creative Library',
  description: 'AI-powered creative assets for cannabis marketing',
};

export default async function CreativeLibraryPage() {
  // Get user session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const session = await getCurrentUser(sessionCookie);

  if (!session) {
    redirect('/login');
  }

  // Check role - available to brand and dispensary users
  const allowedRoles = [
    'brand',
    'brand_admin',
    'brand_member',
    'dispensary',
    'dispensary_admin',
    'dispensary_staff',
    'super_user',
    'ceo',
  ];

  const userRole = session.role?.toLowerCase();

  if (!userRole || !allowedRoles.includes(userRole)) {
    redirect('/dashboard/inbox');
  }

  const brandId = session.orgId || session.uid;

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <CreativeLibraryClient brandId={brandId} userRole={userRole} />
    </div>
  );
}
