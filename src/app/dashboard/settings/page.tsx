
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import SettingsPageClient from './settings-page-client';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const { auth, firestore } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  
  if (!sessionCookie) {
    redirect('/brand-login');
  }

  let brandId: string;
  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    brandId = decodedToken.brandId;
    if (!brandId) {
      // This could happen if a non-brand user (e.g., customer, dispensary) lands here.
      // We'll redirect them to their default dashboard.
      redirect('/dashboard');
    }
  } catch (error) {
    console.error('Auth error in Settings page:', error);
    redirect('/brand-login');
  }
  
  const brandRepo = makeBrandRepo(firestore);
  const brand = await brandRepo.getById(brandId);
  
  return <SettingsPageClient brand={brand} />;
}
