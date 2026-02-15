/**
 * Brand Guide Settings Page
 *
 * Comprehensive brand guide management interface for Brand and Dispensary roles.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentUser } from '@/lib/auth-helpers';
import { getBrandGuide } from '@/server/actions/brand-guide';
import { BrandGuideClient } from './brand-guide-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Brand Guide Settings',
  description: 'Manage your brand identity, voice, and messaging',
};

export default async function BrandGuideSettingsPage() {
  // Get user session
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const session = await getCurrentUser(sessionCookie);

  if (!session) {
    redirect('/login');
  }

  // Check role - support all brand and dispensary role variations
  const allowedRoles = [
    'brand',
    'brand_admin',
    'brand_member',
    'dispensary',
    'dispensary_admin',
    'dispensary_staff',
    'super_user',
    'ceo'
  ];

  const userRole = session.role?.toLowerCase();

  if (!userRole || !allowedRoles.includes(userRole)) {
    console.log('[Brand Guide] Access denied - Role:', userRole, 'Allowed:', allowedRoles);
    redirect('/dashboard/inbox');
  }

  console.log('[Brand Guide] Access granted - Role:', userRole, 'Session:', session);

  // Get orgId/brandId
  const brandId = session.orgId || session.uid;

  // Fetch brand guide
  const { brandGuide } = await getBrandGuide(brandId);

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Brand Guide</h1>
        <p className="text-muted-foreground mt-2">
          Manage your brand identity, voice, messaging, and assets
        </p>
      </div>

      <Suspense fallback={<BrandGuideLoadingSkeleton />}>
        <BrandGuideClient
          brandId={brandId}
          initialBrandGuide={brandGuide}
          userRole={session.role}
        />
      </Suspense>
    </div>
  );
}

function BrandGuideLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
    </div>
  );
}
