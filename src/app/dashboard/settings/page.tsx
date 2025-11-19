
import { createServerClient } from '@/firebase/server-client';
import { redirect } from 'next/navigation';
import { makeBrandRepo } from '@/server/repos/brandRepo';
import type { Brand } from '@/types/domain';
import SettingsTab from './components/settings-tab';
import { requireUser } from '@/server/auth/auth';

export const dynamic = 'force-dynamic';

export default async function DashboardSettingsPage() {
  let user;
  try {
      user = await requireUser();
  } catch (error) {
      redirect('/brand-login');
  }

  const { brandId } = user;

  if (!brandId) {
      // If the user has no brandId, they need to complete onboarding.
      // This is a common scenario for new signups.
      redirect('/onboarding');
  }

  let brand: Brand;
  const { firestore } = await createServerClient();
  const brandRepo = makeBrandRepo(firestore);
  brand = await brandRepo.getById(brandId);
  
  return (
    <SettingsTab brand={brand} />
  );
}
