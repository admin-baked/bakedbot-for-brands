
import { createServerClient } from '@/firebase/server-client';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import type { Brand } from '@/types/domain';
import SettingsTab from './components/settings-tab';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage() {
  const { auth, firestore } = await createServerClient();
  const sessionCookie = cookies().get('__session')?.value;
  
  if (!sessionCookie) {
    redirect('/brand-login');
  }

  let brandId: string | null = null;
  try {
    const decodedToken = await auth.verifySessionCookie(sessionCookie, true);
    brandId = decodedToken.brandId || null;
  } catch (error) {
    redirect('/brand-login');
  }

  if (!brandId) {
      redirect('/onboarding');
  }

  let brand: Brand;
  const brandRepo = makeBrandRepo(firestore);
  brand = await brandRepo.getById(brandId);
  
  return (
    <SettingsTab brand={brand} />
  );
}
