/**
 * Brand Guide Settings Page
 *
 * Comprehensive brand guide management interface for Brand and Dispensary roles.
 */

import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { requireUser } from '@/server/auth/auth';
import { getBrandGuide } from '@/server/actions/brand-guide';
import { BrandGuideClient } from './brand-guide-client';
import { Skeleton } from '@/components/ui/skeleton';

export const metadata = {
  title: 'Brand Guide Settings',
  description: 'Manage your brand identity, voice, and messaging',
};

export default async function BrandGuideSettingsPage() {
  let session;
  try {
    session = await requireUser([
      'brand',
      'brand_admin',
      'brand_member',
      'dispensary',
      'dispensary_admin',
      'dispensary_staff',
      'super_user',
    ]);
  } catch {
    redirect('/login');
  }

  // Resolve orgId — prefer currentOrgId (impersonation), then orgId, then brandId
  const brandId = session.currentOrgId || session.orgId || session.brandId;

  if (!brandId) {
    redirect('/dashboard/inbox');
  }

  // Fetch brand guide (returns undefined if none exists — shows onboarding)
  const { brandGuide } = await getBrandGuide(brandId);

  return (
    <Suspense fallback={<BrandGuideLoadingSkeleton />}>
      <BrandGuideClient
        brandId={brandId}
        initialBrandGuide={brandGuide}
        userRole={session.role as string}
      />
    </Suspense>
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
